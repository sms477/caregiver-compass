import { useApp } from "@/contexts/AppContext";
import { PayRun, PaymentBatch, PaymentItem, PaymentMethod } from "@/types";
import { formatCurrency } from "@/lib/payroll";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Download, CheckCircle2, Clock, AlertTriangle,
  Send, Loader2, ArrowLeft, XCircle, RefreshCw, FileCheck, Banknote
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

type BatchStatus = PaymentBatch["status"];

const STATUS_CONFIG: Record<BatchStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-warning bg-warning/10" },
  processing: { label: "Processing", icon: Loader2, color: "text-primary bg-primary/10" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-success bg-success/10" },
  failed: { label: "Failed", icon: XCircle, color: "text-destructive bg-destructive/10" },
};

const METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: React.ElementType; color: string }> = {
  direct_deposit: { label: "Direct Deposit", icon: Building2, color: "text-primary bg-primary/10" },
  manual_check: { label: "Manual Check", icon: FileCheck, color: "text-warning bg-warning/10" },
};

const PaymentsView = () => {
  const { payRuns, employees } = useApp();
  const { toast } = useToast();
  const [batches, setBatches] = useState<PaymentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<PaymentBatch | null>(null);
  const [checkNumbers, setCheckNumbers] = useState<Record<string, string>>({});

  const approvedRuns = payRuns.filter(r => r.status === "approved" || r.status === "paid");

  const refreshBatches = useCallback(async () => {
    const { data, error } = await supabase
      .from("payment_batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && !error) {
      const mapped: PaymentBatch[] = [];
      for (const b of data as any[]) {
        const { data: items } = await supabase
          .from("payment_items")
          .select("*")
          .eq("batch_id", b.id);

        mapped.push({
          id: b.id,
          payRunId: b.pay_run_id,
          status: b.status,
          totalAmount: Number(b.total_amount),
          paymentCount: b.payment_count,
          initiatedBy: b.initiated_by,
          initiatedAt: new Date(b.initiated_at),
          processedAt: b.processed_at ? new Date(b.processed_at) : null,
          notes: b.notes,
          items: (items || []).map((i: any) => ({
            id: i.id,
            batchId: i.batch_id,
            employeeId: i.employee_id,
            employeeName: i.employee_name,
            amount: Number(i.amount),
            paymentMethod: (i.payment_method as PaymentMethod) || "direct_deposit",
            bankName: i.bank_name,
            accountLastFour: i.account_last_four,
            checkNumber: i.check_number,
            status: i.status,
            failureReason: i.failure_reason,
          })),
        });
      }
      setBatches(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshBatches();
  }, [refreshBatches]);

  const createBatch = async (run: PayRun) => {
    setCreating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const totalAmount = run.totalNetPay;

      const { data: batch, error } = await supabase
        .from("payment_batches")
        .insert({
          pay_run_id: run.id,
          status: "pending",
          total_amount: totalAmount,
          payment_count: run.lineItems.length,
          initiated_by: userId,
        } as any)
        .select()
        .single();

      if (error || !batch) throw error || new Error("Failed to create batch");

      // All employees included — those with bank info get direct_deposit, others get manual_check
      const paymentItems = run.lineItems.map(li => {
        const emp = employees.find(e => e.id === li.employeeId);
        const hasBank = !!emp?.bankInfo?.bankName;
        return {
          batch_id: (batch as any).id,
          employee_id: li.employeeId,
          employee_name: li.employeeName,
          amount: li.netPay,
          payment_method: hasBank ? "direct_deposit" : "manual_check",
          bank_name: emp?.bankInfo?.bankName || null,
          account_last_four: emp?.bankInfo?.accountNumber?.slice(-4) || null,
          status: "pending",
        };
      });

      if (paymentItems.length > 0) {
        await supabase.from("payment_items").insert(paymentItems as any);
      }

      const manualCount = paymentItems.filter(p => p.payment_method === "manual_check").length;

      toast({
        title: "Payment batch created",
        description: `${paymentItems.length} payment(s) queued.${manualCount > 0 ? ` ${manualCount} require manual check(s).` : ""}`,
      });

      await refreshBatches();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const updateBatchStatus = async (batchId: string, status: BatchStatus) => {
    await supabase
      .from("payment_batches")
      .update({
        status,
        processed_at: status === "completed" ? new Date().toISOString() : null,
      } as any)
      .eq("id", batchId);

    await supabase
      .from("payment_items")
      .update({ status } as any)
      .eq("batch_id", batchId);

    toast({ title: `Batch marked as ${status}` });
    await refreshBatches();
    setSelectedBatch(null);
  };

  const saveCheckNumber = async (itemId: string, checkNum: string) => {
    await supabase
      .from("payment_items")
      .update({ check_number: checkNum } as any)
      .eq("id", itemId);

    toast({ title: "Check number saved" });
    await refreshBatches();
  };

  const markItemCompleted = async (itemId: string) => {
    await supabase
      .from("payment_items")
      .update({ status: "completed" } as any)
      .eq("id", itemId);

    toast({ title: "Payment marked completed" });
    await refreshBatches();
  };

  const exportBatchCSV = (batch: PaymentBatch) => {
    const header = "Employee,Amount,Method,Bank,Account (last 4),Check #,Status\n";
    const rows = batch.items.map(i =>
      `${i.employeeName},${i.amount.toFixed(2)},${i.paymentMethod === "manual_check" ? "Check" : "Direct Deposit"},${i.bankName || "N/A"},${i.accountLastFour || "N/A"},${i.checkNumber || ""},${i.status}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-batch-${batch.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Detail view
  if (selectedBatch) {
    const cfg = STATUS_CONFIG[selectedBatch.status];
    const StatusIcon = cfg.icon;
    const ddItems = selectedBatch.items.filter(i => i.paymentMethod === "direct_deposit");
    const checkItems = selectedBatch.items.filter(i => i.paymentMethod === "manual_check");

    return (
      <div className="space-y-4 animate-slide-up">
        <button onClick={() => setSelectedBatch(null)} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Payments
        </button>

        <div className="glass-card rounded-xl overflow-hidden">
          <div className="bg-primary/5 border-b border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Payment Batch</p>
                <h2 className="text-xl font-display font-bold text-foreground mt-1">
                  {formatCurrency(selectedBatch.totalAmount)}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${cfg.color}`}>
                    <StatusIcon className="w-3 h-3" /> {cfg.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedBatch.paymentCount} payment(s) · {selectedBatch.initiatedAt.toLocaleDateString()}
                  </span>
                  {checkItems.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 text-warning bg-warning/10">
                      <FileCheck className="w-3 h-3" /> {checkItems.length} manual check(s)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportBatchCSV(selectedBatch)}
                  className="flex items-center gap-2 rounded-lg border border-border text-foreground px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Download className="w-4 h-4" /> Export
                </button>
                {selectedBatch.status === "pending" && (
                  <button
                    onClick={() => updateBatchStatus(selectedBatch.id, "processing")}
                    className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold active:scale-[0.97] transition-transform"
                  >
                    <Send className="w-4 h-4" /> Mark Processing
                  </button>
                )}
                {selectedBatch.status === "processing" && (
                  <button
                    onClick={() => updateBatchStatus(selectedBatch.id, "completed")}
                    className="flex items-center gap-2 rounded-lg bg-success text-white px-4 py-2 text-sm font-semibold active:scale-[0.97] transition-transform"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark Completed
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Direct Deposit section */}
          {ddItems.length > 0 && (
            <div>
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Direct Deposits ({ddItems.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Bank</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Account</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ddItems.map(item => {
                      const itemCfg = STATUS_CONFIG[item.status];
                      const ItemIcon = itemCfg.icon;
                      return (
                        <tr key={item.id} className="border-t border-border">
                          <td className="p-3 font-medium text-foreground">{item.employeeName}</td>
                          <td className="p-3 text-foreground">{item.bankName || "—"}</td>
                          <td className="p-3 text-muted-foreground">****{item.accountLastFour || "—"}</td>
                          <td className="p-3 text-right font-semibold text-foreground">{formatCurrency(item.amount)}</td>
                          <td className="p-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${itemCfg.color}`}>
                              <ItemIcon className="w-3 h-3" /> {itemCfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Manual Check section */}
          {checkItems.length > 0 && (
            <div>
              <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-t border-border">
                <FileCheck className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-semibold text-foreground">Manual Checks ({checkItems.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-warning/5">
                      <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Check #</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkItems.map(item => {
                      const itemCfg = STATUS_CONFIG[item.status];
                      const ItemIcon = itemCfg.icon;
                      return (
                        <tr key={item.id} className="border-t border-border">
                          <td className="p-3 font-medium text-foreground">{item.employeeName}</td>
                          <td className="p-3 text-right font-semibold text-foreground">{formatCurrency(item.amount)}</td>
                          <td className="p-3">
                            {item.checkNumber ? (
                              <span className="text-foreground font-mono text-xs bg-muted px-2 py-1 rounded">#{item.checkNumber}</span>
                            ) : item.status !== "completed" ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="Check #"
                                  value={checkNumbers[item.id] || ""}
                                  onChange={e => setCheckNumbers(prev => ({ ...prev, [item.id]: e.target.value }))}
                                  className="w-24 h-7 text-xs px-2 rounded border border-input bg-background text-foreground"
                                />
                                {checkNumbers[item.id] && (
                                  <button
                                    onClick={() => saveCheckNumber(item.id, checkNumbers[item.id])}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    Save
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${itemCfg.color}`}>
                              <ItemIcon className="w-3 h-3" /> {itemCfg.label}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {item.status !== "completed" && (
                              <button
                                onClick={() => markItemCompleted(item.id)}
                                className="text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium hover:bg-success/20 transition-colors"
                              >
                                ✓ Handed
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Payments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create payment batches from approved pay runs. Employees without bank info will be assigned manual checks.
          </p>
        </div>
        <button
          onClick={refreshBatches}
          className="flex items-center gap-2 rounded-lg border border-border text-foreground px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Create from approved runs */}
      {approvedRuns.length > 0 && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-foreground text-sm">Approved Pay Runs</h3>
          <p className="text-xs text-muted-foreground">Create a payment batch to initiate direct deposits and manual checks.</p>
          {approvedRuns.map(run => {
            const hasBatch = batches.some(b => b.payRunId === run.id);
            const missingBank = run.lineItems.filter(li => {
              const emp = employees.find(e => e.id === li.employeeId);
              return !emp?.bankInfo?.bankName;
            }).length;

            return (
              <div key={run.id} className="flex items-center justify-between border-b border-border last:border-0 pb-3 last:pb-0">
                <div>
                  <p className="font-medium text-foreground text-sm">{run.payPeriod.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {run.lineItems.length} employees · {formatCurrency(run.totalNetPay)} net
                    {missingBank > 0 && (
                      <span className="text-warning ml-2">
                        <FileCheck className="w-3 h-3 inline mr-1" />
                        {missingBank} will get manual check(s)
                      </span>
                    )}
                  </p>
                </div>
                {hasBatch ? (
                  <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">Batch created</span>
                ) : (
                  <button
                    onClick={() => createBatch(run)}
                    disabled={creating}
                    className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold active:scale-[0.97] transition-transform disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Create Batch
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Existing batches */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading payment batches...
        </div>
      ) : batches.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">No payment batches yet</p>
          <p className="text-sm text-muted-foreground mt-1">Approve a pay run, then create a payment batch above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map(batch => {
            const cfg = STATUS_CONFIG[batch.status];
            const StatusIcon = cfg.icon;
            const manualCount = batch.items.filter(i => i.paymentMethod === "manual_check").length;
            return (
              <button
                key={batch.id}
                onClick={() => setSelectedBatch(batch)}
                className="w-full glass-card rounded-xl p-4 text-left transition-all hover:shadow-lg active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{batch.paymentCount} payment(s)</p>
                      <p className="text-xs text-muted-foreground">
                        {batch.initiatedAt.toLocaleDateString()}
                        {manualCount > 0 && <span className="text-warning ml-2">· {manualCount} check(s)</span>}
                        {batch.processedAt && ` · Processed ${batch.processedAt.toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="font-display font-bold text-foreground">{formatCurrency(batch.totalAmount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PaymentsView;
