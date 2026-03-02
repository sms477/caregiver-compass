import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { useResidents } from "@/hooks/useResidents";
import { useIncidents } from "@/hooks/useIncidents";
import { formatCurrency } from "@/lib/payroll";
import { Shift } from "@/types";
import {
  Download, FileText, Clock, Pill, ClipboardList, AlertTriangle,
  ShieldCheck, BarChart3, Users, CalendarDays
} from "lucide-react";

type ReportTab = "schedule" | "payroll" | "medications" | "adl" | "incidents" | "compliance";

const TABS: { key: ReportTab; label: string; icon: React.ElementType }[] = [
  { key: "schedule", label: "Staff Schedule", icon: CalendarDays },
  { key: "payroll", label: "Payroll Summary", icon: BarChart3 },
  { key: "medications", label: "Medication Logs", icon: Pill },
  { key: "adl", label: "ADL Documentation", icon: ClipboardList },
  { key: "incidents", label: "Incidents", icon: AlertTriangle },
  { key: "compliance", label: "Compliance", icon: ShieldCheck },
];

const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtTime = (d: Date | string) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const diffHours = (a: Date | string, b: Date | string) => ((new Date(b).getTime() - new Date(a).getTime()) / 3600000).toFixed(1);

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const ReportsCenter = () => {
  const [tab, setTab] = useState<ReportTab>("schedule");

  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">Reports Center</h2>
        <p className="text-sm text-muted-foreground mt-1">Generate and export facility reports.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "schedule" && <ScheduleReport />}
      {tab === "payroll" && <PayrollSummaryReport />}
      {tab === "medications" && <MedicationReport />}
      {tab === "adl" && <ADLReport />}
      {tab === "incidents" && <IncidentReport />}
      {tab === "compliance" && <ComplianceReport />}
    </div>
  );
};

/* =========================================================
   1. Staff Schedule History
   ========================================================= */
function ScheduleReport() {
  const { shifts } = useApp();
  const sorted = useMemo(() => [...shifts].sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()), [shifts]);

  const exportCSV = () => {
    const rows = [
      "Date,Employee,Clock In,Clock Out,Hours,Type,Meal Break,Location",
      ...sorted.map(s => {
        const hrs = s.clockOut ? diffHours(s.clockIn, s.clockOut) : "";
        const loc = s.clockInLocation ? `${s.clockInLocation.latitude.toFixed(4)},${s.clockInLocation.longitude.toFixed(4)}` : "";
        return `${fmtDate(s.clockIn)},${s.caregiverName},${fmtTime(s.clockIn)},${s.clockOut ? fmtTime(s.clockOut) : ""},${hrs},${s.is24Hour ? "24hr" : "Standard"},${s.mealBreakTaken === true ? "Yes" : s.mealBreakTaken === false ? "No" : "N/A"},${loc}`;
      }),
    ].join("\n");
    downloadCSV("staff-schedule", rows);
  };

  return (
    <ReportShell title="Staff Schedule History" count={sorted.length} onExport={exportCSV} icon={CalendarDays}>
      {sorted.length === 0 ? <EmptyState /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
              <th className="text-left p-3 font-medium text-muted-foreground">In</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Out</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Hours</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
            </tr></thead>
            <tbody>
              {sorted.map(s => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3 text-foreground">{fmtDate(s.clockIn)}</td>
                  <td className="p-3 font-medium text-foreground">{s.caregiverName}</td>
                  <td className="p-3 text-foreground">{fmtTime(s.clockIn)}</td>
                  <td className="p-3 text-foreground">{s.clockOut ? fmtTime(s.clockOut) : "—"}</td>
                  <td className="p-3 text-right text-foreground">{s.clockOut ? diffHours(s.clockIn, s.clockOut) : "—"}</td>
                  <td className="p-3">
                    {s.is24Hour && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">24hr</span>}
                    {!s.is24Hour && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Std</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

/* =========================================================
   2. Payroll Summary
   ========================================================= */
function PayrollSummaryReport() {
  const { payRuns } = useApp();

  const allLineItems = useMemo(() => payRuns.flatMap(r => r.lineItems), [payRuns]);
  const byEmployee = useMemo(() => {
    const map = new Map<string, { name: string; gross: number; taxes: number; net: number; hours: number; otHours: number; periods: number }>();
    for (const li of allLineItems) {
      const e = map.get(li.employeeId) || { name: li.employeeName, gross: 0, taxes: 0, net: 0, hours: 0, otHours: 0, periods: 0 };
      e.gross += li.grossPay; e.taxes += li.taxes.totalEmployeeTaxes; e.net += li.netPay;
      e.hours += li.regularHours; e.otHours += li.overtimeHours; e.periods++;
      map.set(li.employeeId, e);
    }
    return Array.from(map.entries());
  }, [allLineItems]);

  const totals = useMemo(() => ({
    gross: allLineItems.reduce((s, li) => s + li.grossPay, 0),
    taxes: allLineItems.reduce((s, li) => s + li.taxes.totalEmployeeTaxes, 0),
    net: allLineItems.reduce((s, li) => s + li.netPay, 0),
  }), [allLineItems]);

  const exportCSV = () => {
    const rows = [
      "Employee,Pay Periods,Regular Hrs,OT Hrs,Gross Pay,Taxes,Net Pay",
      ...byEmployee.map(([, e]) =>
        `${e.name},${e.periods},${e.hours.toFixed(1)},${e.otHours.toFixed(1)},${e.gross.toFixed(2)},${e.taxes.toFixed(2)},${e.net.toFixed(2)}`
      ),
      `TOTAL,,,,${totals.gross.toFixed(2)},${totals.taxes.toFixed(2)},${totals.net.toFixed(2)}`,
    ].join("\n");
    downloadCSV("payroll-summary", rows);
  };

  return (
    <ReportShell title="Payroll Summary" count={payRuns.length} subtitle="pay runs" onExport={exportCSV} icon={BarChart3}>
      {byEmployee.length === 0 ? <EmptyState /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Periods</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Reg Hrs</th>
              <th className="text-right p-3 font-medium text-muted-foreground">OT Hrs</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Gross</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Taxes</th>
              <th className="text-right p-3 font-semibold text-foreground">Net Pay</th>
            </tr></thead>
            <tbody>
              {byEmployee.map(([id, e]) => (
                <tr key={id} className="border-t border-border">
                  <td className="p-3 font-medium text-foreground">{e.name}</td>
                  <td className="p-3 text-right text-muted-foreground">{e.periods}</td>
                  <td className="p-3 text-right text-foreground">{e.hours.toFixed(1)}</td>
                  <td className="p-3 text-right text-foreground">{e.otHours.toFixed(1)}</td>
                  <td className="p-3 text-right text-foreground">{formatCurrency(e.gross)}</td>
                  <td className="p-3 text-right text-destructive">-{formatCurrency(e.taxes)}</td>
                  <td className="p-3 text-right font-bold text-foreground">{formatCurrency(e.net)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30">
                <td colSpan={4} className="p-3 font-semibold text-foreground">Total</td>
                <td className="p-3 text-right font-semibold text-foreground">{formatCurrency(totals.gross)}</td>
                <td className="p-3 text-right font-semibold text-destructive">-{formatCurrency(totals.taxes)}</td>
                <td className="p-3 text-right font-bold text-foreground text-lg">{formatCurrency(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

/* =========================================================
   3. Medication Administration Logs
   ========================================================= */
function MedicationReport() {
  const { shifts } = useApp();
  const { residents } = useResidents();

  const records = useMemo(() => {
    return shifts.flatMap(s =>
      s.emarRecords.map(r => ({
        ...r,
        caregiverName: s.caregiverName,
        shiftDate: s.clockIn,
        residentName: residents.find(res => res.id === r.residentId)?.name || r.residentId,
        medName: residents.flatMap(res => res.medications).find(m => m.id === r.medicationId)?.name || r.medicationId,
      }))
    ).sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime());
  }, [shifts, residents]);

  const exportCSV = () => {
    const rows = [
      "Date,Time,Resident,Medication,Administered By",
      ...records.map(r =>
        `${fmtDate(r.administeredAt)},${fmtTime(r.administeredAt)},${r.residentName},${r.medName},${r.caregiverName}`
      ),
    ].join("\n");
    downloadCSV("medication-logs", rows);
  };

  return (
    <ReportShell title="Medication Administration Logs" count={records.length} subtitle="records" onExport={exportCSV} icon={Pill}>
      {records.length === 0 ? <EmptyState /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Date/Time</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Resident</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Medication</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Administered By</th>
            </tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 text-foreground">{fmtDate(r.administeredAt)} {fmtTime(r.administeredAt)}</td>
                  <td className="p-3 font-medium text-foreground">{r.residentName}</td>
                  <td className="p-3 text-foreground">{r.medName}</td>
                  <td className="p-3 text-muted-foreground">{r.caregiverName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

/* =========================================================
   4. ADL Documentation
   ========================================================= */
function ADLReport() {
  const { shifts } = useApp();
  const { residents } = useResidents();

  const records = useMemo(() => {
    return shifts.flatMap(s =>
      s.adlReports.map(r => ({
        ...r,
        caregiverName: s.caregiverName,
        shiftDate: s.clockIn,
        residentName: residents.find(res => res.id === r.residentId)?.name || r.residentId,
      }))
    ).sort((a, b) => new Date(b.shiftDate).getTime() - new Date(a.shiftDate).getTime());
  }, [shifts, residents]);

  const exportCSV = () => {
    const rows = [
      "Date,Resident,Caregiver,Bathing,Dressing,Eating,Mobility,Toileting,Notes",
      ...records.map(r =>
        `${fmtDate(r.shiftDate)},${r.residentName},${r.caregiverName},${r.bathing ? "Y" : "N"},${r.dressing ? "Y" : "N"},${r.eating ? "Y" : "N"},${r.mobility ? "Y" : "N"},${r.toileting ? "Y" : "N"},"${(r.notes || "").replace(/"/g, '""')}"`
      ),
    ].join("\n");
    downloadCSV("adl-documentation", rows);
  };

  const adlLabels = ["Bathing", "Dressing", "Eating", "Mobility", "Toileting"] as const;
  const adlKeys = ["bathing", "dressing", "eating", "mobility", "toileting"] as const;

  return (
    <ReportShell title="ADL Documentation" count={records.length} subtitle="reports" onExport={exportCSV} icon={ClipboardList}>
      {records.length === 0 ? <EmptyState /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Resident</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Caregiver</th>
              {adlLabels.map(l => <th key={l} className="text-center p-3 font-medium text-muted-foreground">{l}</th>)}
              <th className="text-left p-3 font-medium text-muted-foreground">Notes</th>
            </tr></thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3 text-foreground">{fmtDate(r.shiftDate)}</td>
                  <td className="p-3 font-medium text-foreground">{r.residentName}</td>
                  <td className="p-3 text-muted-foreground">{r.caregiverName}</td>
                  {adlKeys.map(k => (
                    <td key={k} className="p-3 text-center">
                      {r[k] ? <span className="text-success font-bold">✓</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                  <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate">{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

/* =========================================================
   5. Incident Reports
   ========================================================= */
function IncidentReport() {
  const { incidents, loading } = useIncidents();

  const exportCSV = () => {
    const rows = [
      "Date,Type,Resident,Staff,Description,Immediate Action,Follow-Up Required,Status",
      ...incidents.map(i =>
        `${fmtDate(i.occurred_at)},${i.incident_type},${i.resident_name},${i.staff_name},"${i.description.replace(/"/g, '""')}","${i.immediate_action.replace(/"/g, '""')}",${i.follow_up_required ? "Yes" : "No"},${i.status}`
      ),
    ].join("\n");
    downloadCSV("incident-reports", rows);
  };

  return (
    <ReportShell title="Incident Reports" count={incidents.length} onExport={exportCSV} icon={AlertTriangle}>
      {loading ? <p className="text-center text-muted-foreground py-8">Loading…</p> :
       incidents.length === 0 ? <EmptyState /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Resident</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Staff</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Follow-Up</th>
            </tr></thead>
            <tbody>
              {incidents.map(i => (
                <tr key={i.id} className="border-t border-border">
                  <td className="p-3 text-foreground">{fmtDate(i.occurred_at)}</td>
                  <td className="p-3 font-medium text-foreground capitalize">{i.incident_type}</td>
                  <td className="p-3 text-foreground">{i.resident_name}</td>
                  <td className="p-3 text-muted-foreground">{i.staff_name}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      i.status === "resolved" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}>{i.status}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{i.follow_up_required ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

/* =========================================================
   6. Compliance Status Summary
   ========================================================= */
function ComplianceReport() {
  const { shifts, employees } = useApp();

  const stats = useMemo(() => {
    const completed = shifts.filter(s => s.clockOut);
    const missedMealBreaks = completed.filter(s => s.mealBreakTaken === false);
    const noDocs = completed.filter(s => s.adlReports.length === 0 && s.emarRecords.length === 0);
    const noLocation = completed.filter(s => !s.clockInLocation);
    const over12 = completed.filter(s => {
      if (!s.clockOut) return false;
      return (new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 3600000 > 12;
    });

    // Per-employee compliance
    const empMap = new Map<string, { name: string; total: number; missingDocs: number; missedBreaks: number }>();
    completed.forEach(s => {
      const e = empMap.get(s.caregiverId) || { name: s.caregiverName, total: 0, missingDocs: 0, missedBreaks: 0 };
      e.total++;
      if (s.adlReports.length === 0 && s.emarRecords.length === 0) e.missingDocs++;
      if (s.mealBreakTaken === false) e.missedBreaks++;
      empMap.set(s.caregiverId, e);
    });

    return {
      totalShifts: completed.length,
      missedMealBreaks: missedMealBreaks.length,
      noDocs: noDocs.length,
      noLocation: noLocation.length,
      over12: over12.length,
      byEmployee: Array.from(empMap.entries()),
    };
  }, [shifts]);

  const exportCSV = () => {
    const rows = [
      "Metric,Count",
      `Total Completed Shifts,${stats.totalShifts}`,
      `Missed Meal Breaks,${stats.missedMealBreaks}`,
      `Shifts Without Documentation,${stats.noDocs}`,
      `Shifts Without GPS Location,${stats.noLocation}`,
      `Shifts Over 12 Hours,${stats.over12}`,
      ``,
      `Employee,Total Shifts,Missing Docs,Missed Breaks,Doc Compliance %`,
      ...stats.byEmployee.map(([, e]) => {
        const pct = e.total > 0 ? (((e.total - e.missingDocs) / e.total) * 100).toFixed(0) : "N/A";
        return `${e.name},${e.total},${e.missingDocs},${e.missedBreaks},${pct}%`;
      }),
    ].join("\n");
    downloadCSV("compliance-summary", rows);
  };

  const complianceRate = stats.totalShifts > 0
    ? (((stats.totalShifts - stats.noDocs) / stats.totalShifts) * 100).toFixed(0)
    : "N/A";

  return (
    <ReportShell title="Compliance Status Summary" count={stats.totalShifts} subtitle="shifts reviewed" onExport={exportCSV} icon={ShieldCheck}>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
        <MiniCard label="Doc Compliance" value={`${complianceRate}%`} color={Number(complianceRate) >= 90 ? "text-success" : "text-warning"} />
        <MiniCard label="Missed Breaks" value={String(stats.missedMealBreaks)} color={stats.missedMealBreaks > 0 ? "text-destructive" : "text-success"} />
        <MiniCard label="No Documentation" value={String(stats.noDocs)} color={stats.noDocs > 0 ? "text-warning" : "text-success"} />
        <MiniCard label="No GPS" value={String(stats.noLocation)} color={stats.noLocation > 0 ? "text-warning" : "text-success"} />
      </div>

      {/* Per-employee breakdown */}
      {stats.byEmployee.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Shifts</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Missing Docs</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Missed Breaks</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Compliance</th>
            </tr></thead>
            <tbody>
              {stats.byEmployee.map(([id, e]) => {
                const pct = e.total > 0 ? ((e.total - e.missingDocs) / e.total * 100).toFixed(0) : "N/A";
                return (
                  <tr key={id} className="border-t border-border">
                    <td className="p-3 font-medium text-foreground">{e.name}</td>
                    <td className="p-3 text-right text-foreground">{e.total}</td>
                    <td className="p-3 text-right">{e.missingDocs > 0 ? <span className="text-warning">{e.missingDocs}</span> : <span className="text-success">0</span>}</td>
                    <td className="p-3 text-right">{e.missedBreaks > 0 ? <span className="text-destructive">{e.missedBreaks}</span> : <span className="text-success">0</span>}</td>
                    <td className="p-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        Number(pct) >= 90 ? "bg-success/10 text-success" : Number(pct) >= 70 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                      }`}>{pct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

/* =========================================================
   Shared components
   ========================================================= */
function ReportShell({ title, count, subtitle, onExport, icon: Icon, children }: {
  title: string; count: number; subtitle?: string; onExport: () => void; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{count} {subtitle || "records"}</span>
        </div>
        <button
          onClick={onExport}
          disabled={count === 0}
          className="flex items-center gap-2 rounded-lg border border-border text-foreground px-3 py-1.5 text-xs font-medium hover:bg-muted active:scale-[0.97] transition-all disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>
      {children}
    </div>
  );
}

function MiniCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass-card rounded-xl p-4 space-y-1">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p className="font-medium">No data available</p>
      <p className="text-sm mt-1">Records will appear here once data is logged.</p>
    </div>
  );
}

export default ReportsCenter;
