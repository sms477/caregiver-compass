import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, Clock, AlertTriangle, FileText, Loader2, ChevronRight, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays, parseISO, format } from "date-fns";
import InvoiceTemplate from "./InvoiceTemplate";

interface InvoiceData {
  invoiceId: string;
  invoiceDate: string;
  facilityName: string;
  residentName: string;
  room: string;
  baseRent: number;
  careLevel: string;
  careSurcharge: number;
  billingPeriod: string;
}

interface Notice {
  id: string;
  resident_name: string;
  sent_date: string;
  effective_date: string;
  old_care_surcharge: number;
  new_care_surcharge: number;
  daysElapsed: number;
  daysTotal: number;
  daysLeft: number;
  pctComplete: number;
}


interface ResidentRow {
  id: string;
  name: string;
  room: string;
  care_level: string;
  base_rent: number;
  current_care_surcharge: number;
  contract_id: string | null;
}

const BusinessIntelligence = ({ onNavigate, onQuickExpense }: { onNavigate: (tab: string) => void; onQuickExpense?: () => void }) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [residentRows, setResidentRows] = useState<ResidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceResident, setInvoiceResident] = useState<ResidentRow | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const today = new Date();

      const [
        { data: noticesData },
        { data: residentsData },
        { data: contractsData },
      ] = await Promise.all([
        supabase
          .from("notices_sent")
          .select("id, resident_id, sent_date, effective_date, old_care_surcharge, new_care_surcharge, status, residents(name)")
          .eq("status", "active")
          .order("effective_date"),
        supabase
          .from("residents")
          .select("id, name, room, care_level, lic602a_expiry")
          .order("name"),
        supabase
          .from("contracts")
          .select("id, resident_id, base_rent, current_care_surcharge")
          .order("created_at"),
      ]);

      // 90-day notice progress
      const mappedNotices: Notice[] = ((noticesData as any[]) || []).map((n: any) => {
        const sent = parseISO(n.sent_date);
        const eff = parseISO(n.effective_date);
        const totalDays = differenceInDays(eff, sent);
        const daysElapsed = differenceInDays(today, sent);
        const daysLeft = differenceInDays(eff, today);
        return {
          id: n.id,
          resident_name: n.residents?.name || "Unknown",
          sent_date: n.sent_date,
          effective_date: n.effective_date,
          old_care_surcharge: Number(n.old_care_surcharge),
          new_care_surcharge: Number(n.new_care_surcharge),
          daysElapsed: Math.max(0, daysElapsed),
          daysTotal: Math.max(1, totalDays),
          daysLeft: Math.max(0, daysLeft),
          pctComplete: Math.min(100, Math.max(0, (daysElapsed / Math.max(1, totalDays)) * 100)),
        };
      });


      // Resident list with contract info for Generate Invoice
      const contractMap = new Map<string, any>();
      ((contractsData as any[]) || []).forEach((c: any) => contractMap.set(c.resident_id, c));

      const rows: ResidentRow[] = ((residentsData as any[]) || []).map((r: any) => {
        const contract = contractMap.get(r.id);
        return {
          id: r.id,
          name: r.name,
          room: r.room,
          care_level: r.care_level || "Basic",
          base_rent: contract ? Number(contract.base_rent) : 0,
          current_care_surcharge: contract ? Number(contract.current_care_surcharge) : 0,
          contract_id: contract?.id || null,
        };
      });

      setNotices(mappedNotices);
      setResidentRows(rows);
      setLoading(false);
    };
    load();
  }, []);

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display font-bold text-foreground">Business Intelligence</h2>
        </div>
        {onQuickExpense && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onQuickExpense}>
            <Plus className="w-3 h-3" /> Log Expense
          </Button>
        )}
      </div>


      {/* 90-Day Notice Countdown */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Active 90-Day Notices
          </h3>
          <button
            onClick={() => onNavigate("billing")}
            className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
          >
            Billing <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {notices.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            No active 90-day notices.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notices.map(n => (
              <div key={n.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">{n.resident_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(n.old_care_surcharge)} → {fmt(n.new_care_surcharge)}
                    </p>
                  </div>
                  <div className="text-right">
                    {n.daysLeft <= 0 ? (
                      <span className="text-xs font-bold text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Effective now
                      </span>
                    ) : n.daysLeft <= 14 ? (
                      <span className="text-xs font-bold text-accent">{n.daysLeft}d remaining</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{n.daysLeft}d remaining</span>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Sent {n.sent_date} · Effective {n.effective_date}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        n.pctComplete >= 90 ? "bg-destructive" : n.pctComplete >= 70 ? "bg-accent" : "bg-primary"
                      }`}
                      style={{ width: `${n.pctComplete}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">
                    Day {n.daysElapsed} of {n.daysTotal}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resident List with Generate Invoice */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" /> Resident Quick Invoicing
          </h3>
        </div>
        {residentRows.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No residents found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Resident</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Care Level</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Total Due</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {residentRows.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3">
                      <p className="font-medium text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground">Room {r.room}</p>
                    </td>
                    <td className="p-3 text-muted-foreground">{r.care_level}</td>
                    <td className="p-3 text-right font-semibold text-foreground">
                      {r.contract_id ? fmt(r.base_rent + r.current_care_surcharge) : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {r.contract_id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => { setInvoiceResident(r); setShowInvoice(true); }}
                        >
                          <FileText className="w-3 h-3" /> Invoice
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No contract</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      <InvoiceTemplate
        open={showInvoice && !!invoiceResident}
        onOpenChange={(open) => { setShowInvoice(open); if (!open) setInvoiceResident(null); }}
        data={invoiceResident ? {
          invoiceId: `INV-${invoiceResident.id.slice(0, 8).toUpperCase()}`,
          invoiceDate: format(new Date(), "yyyy-MM-dd"),
          facilityName: "EasyRCFE",
          residentName: invoiceResident.name,
          room: invoiceResident.room,
          baseRent: invoiceResident.base_rent,
          careLevel: invoiceResident.care_level,
          careSurcharge: invoiceResident.current_care_surcharge,
          billingPeriod: format(new Date(), "MMMM yyyy"),
        } : null}
      />
    </div>
  );
};

export default BusinessIntelligence;
