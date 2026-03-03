import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, DollarSign, TrendingUp, Clock, FileText,
  Plus, Pencil, Play, CheckCircle, AlertTriangle, Eye
} from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import InvoiceTemplate from "./InvoiceTemplate";

interface Contract {
  id: string;
  resident_id: string;
  resident_name: string;
  room: string;
  base_rent: number;
  current_care_surcharge: number;
  pending_care_surcharge: number;
  increase_effective_date: string | null;
  security_deposit: number;
  billing_day: number;
}

interface Invoice {
  id: string;
  resident_id: string;
  contract_id: string;
  resident_name: string;
  base_rent: number;
  care_surcharge: number;
  total_amount: number;
  billing_period: string;
  status: string;
  created_at: string;
}

const BillingDashboard = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBilling, setRunningBilling] = useState(false);

  // Contract edit state
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [formBaseRent, setFormBaseRent] = useState("");
  const [formCareSurcharge, setFormCareSurcharge] = useState("");
  const [formPendingSurcharge, setFormPendingSurcharge] = useState("");
  const [formEffectiveDate, setFormEffectiveDate] = useState("");
  const [formDeposit, setFormDeposit] = useState("");
  const [formBillingDay, setFormBillingDay] = useState("1");
  const [savingContract, setSavingContract] = useState(false);

  // Residents without contracts (for adding)
  const [residentsWithoutContract, setResidentsWithoutContract] = useState<{ id: string; name: string; room: string; care_level: string }[]>([]);
  const [selectedResidentId, setSelectedResidentId] = useState("");

  // Invoice view state
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  const fetchData = async () => {
    setLoading(true);

    const { data: contractRows } = await supabase
      .from("contracts")
      .select("*, residents(name, room)")
      .order("created_at");

    const mapped: Contract[] = (contractRows as any[] || []).map((c: any) => ({
      id: c.id,
      resident_id: c.resident_id,
      resident_name: c.residents?.name || "Unknown",
      room: c.residents?.room || "",
      base_rent: Number(c.base_rent),
      current_care_surcharge: Number(c.current_care_surcharge),
      pending_care_surcharge: Number(c.pending_care_surcharge),
      increase_effective_date: c.increase_effective_date,
      security_deposit: Number(c.security_deposit),
      billing_day: c.billing_day,
    }));
    setContracts(mapped);

    // Get invoices for current period
    const { data: invoiceRows } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    setInvoices((invoiceRows as any[] || []).map((i: any) => ({
      id: i.id,
      resident_id: i.resident_id,
      contract_id: i.contract_id,
      resident_name: i.resident_name,
      base_rent: Number(i.base_rent),
      care_surcharge: Number(i.care_surcharge),
      total_amount: Number(i.total_amount),
      billing_period: i.billing_period,
      status: i.status,
      created_at: i.created_at,
    })));

    // Fetch residents without contracts
    const { data: allResidents } = await supabase
      .from("residents")
      .select("id, name, room, care_level")
      .order("name");

    const contractedIds = new Set(mapped.map(c => c.resident_id));
    setResidentsWithoutContract(
      (allResidents || []).filter((r: any) => !contractedIds.has(r.id))
    );

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Summary calculations
  const totalMonthlyRevenue = useMemo(
    () => contracts.reduce((sum, c) => sum + c.base_rent + c.current_care_surcharge, 0),
    [contracts]
  );

  const totalPendingIncreases = useMemo(
    () => contracts.reduce((sum, c) => sum + c.pending_care_surcharge, 0),
    [contracts]
  );

  const upcomingChanges = useMemo(
    () => contracts
      .filter(c => c.increase_effective_date && c.pending_care_surcharge > 0)
      .map(c => ({
        ...c,
        daysLeft: differenceInDays(parseISO(c.increase_effective_date!), new Date()),
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft),
    [contracts]
  );

  // Contract CRUD
  const openNewContract = () => {
    setEditContract(null);
    setSelectedResidentId("");
    setFormBaseRent("");
    setFormCareSurcharge("0");
    setFormPendingSurcharge("0");
    setFormEffectiveDate("");
    setFormDeposit("0");
    setFormBillingDay("1");
    setShowContractDialog(true);
  };

  const openEditContract = (c: Contract) => {
    setEditContract(c);
    setSelectedResidentId(c.resident_id);
    setFormBaseRent(c.base_rent.toString());
    setFormCareSurcharge(c.current_care_surcharge.toString());
    setFormPendingSurcharge(c.pending_care_surcharge.toString());
    setFormEffectiveDate(c.increase_effective_date || "");
    setFormDeposit(c.security_deposit.toString());
    setFormBillingDay(c.billing_day.toString());
    setShowContractDialog(true);
  };

  const saveContract = async () => {
    setSavingContract(true);
    const payload = {
      base_rent: parseFloat(formBaseRent) || 0,
      current_care_surcharge: parseFloat(formCareSurcharge) || 0,
      pending_care_surcharge: parseFloat(formPendingSurcharge) || 0,
      increase_effective_date: formEffectiveDate || null,
      security_deposit: parseFloat(formDeposit) || 0,
      billing_day: parseInt(formBillingDay) || 1,
    };

    if (editContract) {
      const { error } = await supabase.from("contracts").update(payload).eq("id", editContract.id);
      if (error) { toast.error("Failed to update contract"); } else { toast.success("Contract updated"); }
    } else {
      if (!selectedResidentId) { toast.error("Select a resident"); setSavingContract(false); return; }
      const { error } = await supabase.from("contracts").insert({
        ...payload,
        resident_id: selectedResidentId,
      });
      if (error) { toast.error("Failed to create contract"); } else { toast.success("Contract created"); }
    }
    setSavingContract(false);
    setShowContractDialog(false);
    fetchData();
  };

  // Run billing
  const handleRunBilling = async () => {
    setRunningBilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-billing");
      if (error) throw error;
      toast.success(
        `Billing complete: ${data.invoices_generated} invoices generated, ${data.applied_increases} rate increases applied.`
      );
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Billing run failed");
    }
    setRunningBilling(false);
  };

  // Mark invoice paid
  const markPaid = async (id: string) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Failed to update");
    else { toast.success("Marked as paid"); fetchData(); }
  };

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Billing Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage contracts, invoices, and rate changes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openNewContract} className="gap-2">
            <Plus className="w-4 h-4" /> Add Contract
          </Button>
          <Button onClick={handleRunBilling} disabled={runningBilling} className="gap-2">
            {runningBilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Monthly Billing
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 border-2 border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Total Monthly Revenue</span>
          </div>
          <p className="text-2xl font-display font-bold text-primary">{fmt(totalMonthlyRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{contracts.length} active contracts</p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground font-medium">Pending Increases</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{fmt(totalPendingIncreases)}</p>
          <p className="text-xs text-muted-foreground mt-1">{upcomingChanges.length} pending rate changes</p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Invoices This Month</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">
            {invoices.filter(i => i.billing_period === new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })).length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {invoices.filter(i => i.status === "unpaid").length} unpaid
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main billing table — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contracts Table */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Resident Billing</h3>
            </div>
            {contracts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No contracts yet. Add a contract to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Resident</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Base Rent</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Care Fee</th>
                      <th className="text-right p-3 font-semibold text-foreground">Total Due</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map(c => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="p-3">
                          <p className="font-medium text-foreground">{c.resident_name}</p>
                          <p className="text-xs text-muted-foreground">{c.room}</p>
                        </td>
                        <td className="p-3 text-right text-foreground">{fmt(c.base_rent)}</td>
                        <td className="p-3 text-right text-foreground">{fmt(c.current_care_surcharge)}</td>
                        <td className="p-3 text-right font-bold text-foreground">
                          {fmt(c.base_rent + c.current_care_surcharge)}
                        </td>
                        <td className="p-3 text-right flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="View Invoice"
                            onClick={() => {
                              // Create an invoice-like object from the contract for preview
                              const now = new Date();
                              setViewingInvoice({
                                id: c.id,
                                resident_id: c.resident_id,
                                contract_id: c.id,
                                resident_name: c.resident_name,
                                base_rent: c.base_rent,
                                care_surcharge: c.current_care_surcharge,
                                total_amount: c.base_rent + c.current_care_surcharge,
                                billing_period: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
                                status: "preview",
                                created_at: now.toISOString(),
                              });
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditContract(c)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td className="p-3 font-semibold text-foreground">Total</td>
                      <td className="p-3 text-right font-semibold text-foreground">
                        {fmt(contracts.reduce((s, c) => s + c.base_rent, 0))}
                      </td>
                      <td className="p-3 text-right font-semibold text-foreground">
                        {fmt(contracts.reduce((s, c) => s + c.current_care_surcharge, 0))}
                      </td>
                      <td className="p-3 text-right font-bold text-foreground text-lg">
                        {fmt(totalMonthlyRevenue)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Recent Invoices */}
          {invoices.length > 0 && (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">Recent Invoices</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Resident</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Period</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0, 20).map(inv => (
                      <tr key={inv.id} className="border-t border-border">
                        <td className="p-3 font-medium text-foreground">{inv.resident_name}</td>
                        <td className="p-3 text-muted-foreground">{inv.billing_period}</td>
                        <td className="p-3 text-right font-semibold text-foreground">{fmt(inv.total_amount)}</td>
                        <td className="p-3 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            inv.status === "paid"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>
                            {inv.status === "paid" ? "Paid" : "Unpaid"}
                          </span>
                        </td>
                        <td className="p-3 text-right flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setViewingInvoice(inv)}>
                            <Eye className="w-3 h-3" /> View
                          </Button>
                          {inv.status !== "paid" && (
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => markPaid(inv.id)}>
                              <CheckCircle className="w-3 h-3" /> Mark Paid
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — 90-Day Clock */}
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Upcoming Rate Changes
            </h3>
            {upcomingChanges.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pending rate changes.</p>
            ) : (
              <div className="space-y-3">
                {upcomingChanges.map(c => (
                  <div key={c.id} className="rounded-lg border border-border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground text-sm">{c.resident_name}</p>
                      {c.daysLeft <= 0 ? (
                        <span className="text-xs font-bold text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Due now
                        </span>
                      ) : c.daysLeft <= 30 ? (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {c.daysLeft}d left
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{c.daysLeft}d left</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmt(c.current_care_surcharge)} → {fmt(c.pending_care_surcharge)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Effective: {c.increase_effective_date}
                    </p>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          c.daysLeft <= 0 ? "bg-destructive" : c.daysLeft <= 30 ? "bg-amber-500" : "bg-primary"
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, ((90 - c.daysLeft) / 90) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contract Dialog */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editContract ? `Edit Contract — ${editContract.resident_name}` : "New Contract"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {!editContract && (
              <div>
                <label className="text-sm font-medium text-foreground">Resident</label>
                <Select value={selectedResidentId} onValueChange={setSelectedResidentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resident…" />
                  </SelectTrigger>
                  <SelectContent>
                    {residentsWithoutContract.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name} — {r.room}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Base Rent ($)</label>
                <Input type="number" value={formBaseRent} onChange={e => setFormBaseRent(e.target.value)} placeholder="3500" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Care Surcharge ($)</label>
                <Input type="number" value={formCareSurcharge} onChange={e => setFormCareSurcharge(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Pending Surcharge ($)</label>
                <Input type="number" value={formPendingSurcharge} onChange={e => setFormPendingSurcharge(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Effective Date</label>
                <Input type="date" value={formEffectiveDate} onChange={e => setFormEffectiveDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Security Deposit ($)</label>
                <Input type="number" value={formDeposit} onChange={e => setFormDeposit(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Billing Day</label>
                <Input type="number" min="1" max="28" value={formBillingDay} onChange={e => setFormBillingDay(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractDialog(false)}>Cancel</Button>
            <Button onClick={saveContract} disabled={savingContract || (!editContract && !selectedResidentId)}>
              {savingContract ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editContract ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Template Modal */}
      <InvoiceTemplate
        open={!!viewingInvoice}
        onOpenChange={(open) => { if (!open) setViewingInvoice(null); }}
        data={viewingInvoice ? {
          invoiceId: viewingInvoice.id,
          invoiceDate: viewingInvoice.created_at,
          facilityName: "Your Facility Name",
          residentName: viewingInvoice.resident_name,
          room: contracts.find(c => c.resident_id === viewingInvoice.resident_id)?.room || "",
          baseRent: viewingInvoice.base_rent,
          careLevel: contracts.find(c => c.resident_id === viewingInvoice.resident_id) 
            ? `Level ${viewingInvoice.care_surcharge > 0 ? "of Care" : "Basic"}`
            : "Basic",
          careSurcharge: viewingInvoice.care_surcharge,
          billingPeriod: viewingInvoice.billing_period,
        } : null}
      />
    </div>
  );
};

export default BillingDashboard;
