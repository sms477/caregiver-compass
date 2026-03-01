import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { PayrollEntry, Shift } from "@/types";
import {
  ArrowLeft, AlertTriangle, Clock, DollarSign, Download,
  FileText, Users, TrendingUp, Shield
} from "lucide-react";

const AdminDashboard = () => {
  const { setRole, shifts } = useApp();
  const [tab, setTab] = useState<"payroll" | "shifts" | "compliance">("payroll");

  const completedShifts = shifts.filter(s => s.clockOut);

  const payroll = useMemo(() => calcPayroll(completedShifts), [completedShifts]);

  const complianceAlerts = useMemo(() => {
    const alerts: { type: "warning" | "danger"; message: string; shift: Shift }[] = [];
    completedShifts.forEach(s => {
      if (s.mealBreakTaken === false) {
        alerts.push({ type: "danger", message: `${s.caregiverName} missed meal break — 1hr penalty added`, shift: s });
      }
      if (s.is24Hour && s.sleepStart && s.sleepEnd) {
        const sleepMs = new Date(s.sleepEnd).getTime() - new Date(s.sleepStart).getTime();
        const interruptMs = s.sleepInterruptions.reduce((sum, i) => {
          if (i.resumeTime) return sum + (new Date(i.resumeTime).getTime() - new Date(i.wakeTime).getTime());
          return sum;
        }, 0);
        const netSleep = (sleepMs - interruptMs) / 3600000;
        if (netSleep < 5) {
          alerts.push({ type: "warning", message: `${s.caregiverName} got only ${netSleep.toFixed(1)}h sleep — no deduction applied`, shift: s });
        }
      }
    });
    return alerts;
  }, [completedShifts]);

  const totalHours = payroll.reduce((s, p) => s + p.totalHours, 0);
  const totalPenalties = payroll.reduce((s, p) => s + p.mealPenalties, 0);

  const exportCSV = () => {
    const header = "Caregiver,Regular Hours,Overtime Hours,Meal Penalties (hrs),Sleep Deductions (hrs),Total Hours\n";
    const rows = payroll.map(p =>
      `${p.caregiverName},${p.regularHours.toFixed(2)},${p.overtimeHours.toFixed(2)},${p.mealPenalties.toFixed(2)},${p.sleepDeductions.toFixed(2)},${p.totalHours.toFixed(2)}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setRole(null)} className="flex items-center gap-1 text-muted-foreground text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="font-display font-bold text-foreground">Admin Dashboard</h1>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium active:scale-[0.97] transition-transform"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </header>

      <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <SummaryCard icon={Clock} label="Total Hours" value={totalHours.toFixed(1)} />
          <SummaryCard icon={Users} label="Caregivers" value={payroll.length.toString()} />
          <SummaryCard icon={AlertTriangle} label="Meal Penalties" value={`${totalPenalties}hr`} color="warning" />
          <SummaryCard icon={TrendingUp} label="Shifts" value={completedShifts.length.toString()} />
        </div>

        {/* Compliance Alerts */}
        {complianceAlerts.length > 0 && (
          <div className="glass-card rounded-xl p-4 space-y-2 border-l-4 border-warning">
            <h3 className="font-display font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" /> Compliance Alerts
            </h3>
            {complianceAlerts.map((a, i) => (
              <div key={i} className={`rounded-lg p-3 text-sm ${
                a.type === "danger" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
              }`}>
                {a.message}
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border">
          {([
            { key: "payroll" as const, icon: DollarSign, label: "Payroll Summary" },
            { key: "shifts" as const, icon: FileText, label: "Shift Log" },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                tab === key ? "text-primary border-primary" : "text-muted-foreground border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "payroll" ? (
          <PayrollTable entries={payroll} />
        ) : (
          <ShiftLogTable shifts={completedShifts} />
        )}
      </div>
    </div>
  );
};

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string; color?: string;
}) {
  return (
    <div className="glass-card rounded-xl p-4 space-y-1">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color === "warning" ? "text-warning" : "text-primary"}`} />
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
    </div>
  );
}

function PayrollTable({ entries }: { entries: PayrollEntry[] }) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Caregiver</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Regular</th>
              <th className="text-right p-3 font-medium text-muted-foreground">OT</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Penalties</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Sleep Ded.</th>
              <th className="text-right p-3 font-medium text-foreground font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.caregiverId} className="border-b border-border last:border-0">
                <td className="p-3 font-medium text-foreground">{e.caregiverName}</td>
                <td className="p-3 text-right text-foreground">{e.regularHours.toFixed(2)}</td>
                <td className="p-3 text-right text-foreground">{e.overtimeHours.toFixed(2)}</td>
                <td className="p-3 text-right">
                  {e.mealPenalties > 0 ? (
                    <span className="text-destructive font-medium">+{e.mealPenalties.toFixed(2)}</span>
                  ) : (
                    <span className="text-muted-foreground">0.00</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  {e.sleepDeductions > 0 ? (
                    <span className="text-primary font-medium">-{e.sleepDeductions.toFixed(2)}</span>
                  ) : (
                    <span className="text-muted-foreground">0.00</span>
                  )}
                </td>
                <td className="p-3 text-right font-bold text-foreground">{e.totalHours.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShiftLogTable({ shifts }: { shifts: Shift[] }) {
  return (
    <div className="space-y-3">
      {shifts.map(s => (
        <div key={s.id} className="glass-card rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{s.caregiverName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(s.clockIn).toLocaleDateString()} — {new Date(s.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} to{" "}
                {s.clockOut ? new Date(s.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </p>
            </div>
            <div className="flex gap-2">
              {s.is24Hour && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">24hr</span>
              )}
              {s.mealBreakTaken === false && (
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full font-medium">No break</span>
              )}
              {s.mealBreakTaken === true && (
                <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">Break ✓</span>
              )}
            </div>
          </div>
          {s.emarRecords.length > 0 && (
            <p className="text-xs text-muted-foreground">{s.emarRecords.length} medication(s) administered</p>
          )}
          {s.adlReports.length > 0 && (
            <p className="text-xs text-muted-foreground">{s.adlReports.length} ADL report(s) filed</p>
          )}
        </div>
      ))}
      {shifts.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No completed shifts yet.</p>
      )}
    </div>
  );
}

/* ---- Payroll Calculation Engine ---- */

function calcPayroll(shifts: Shift[]): PayrollEntry[] {
  const grouped = new Map<string, Shift[]>();
  shifts.forEach(s => {
    const existing = grouped.get(s.caregiverId) || [];
    existing.push(s);
    grouped.set(s.caregiverId, existing);
  });

  const entries: PayrollEntry[] = [];
  grouped.forEach((caregiverShifts, caregiverId) => {
    let totalRegular = 0;
    let totalOT = 0;
    let mealPenalties = 0;
    let sleepDeductions = 0;

    caregiverShifts.forEach(s => {
      if (!s.clockOut) return;
      const hoursWorked = (new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 3600000;

      // CA overtime: over 8hrs/day
      const regular = Math.min(hoursWorked, 8);
      const ot = Math.max(hoursWorked - 8, 0);
      totalRegular += regular;
      totalOT += ot;

      // Meal break penalty: 1 hour if not taken
      if (s.mealBreakTaken === false) {
        mealPenalties += 1;
      }

      // Sleep deduction: up to 8 hours if 5+ hours uninterrupted sleep
      if (s.is24Hour && s.sleepStart && s.sleepEnd) {
        const sleepMs = new Date(s.sleepEnd).getTime() - new Date(s.sleepStart).getTime();
        const interruptMs = s.sleepInterruptions.reduce((sum, i) => {
          if (i.resumeTime) return sum + (new Date(i.resumeTime).getTime() - new Date(i.wakeTime).getTime());
          return sum;
        }, 0);
        const netSleepHours = (sleepMs - interruptMs) / 3600000;
        if (netSleepHours >= 5) {
          sleepDeductions += Math.min(netSleepHours, 8);
        }
      }
    });

    entries.push({
      caregiverId,
      caregiverName: caregiverShifts[0].caregiverName,
      regularHours: totalRegular,
      overtimeHours: totalOT,
      mealPenalties,
      sleepDeductions,
      totalHours: totalRegular + totalOT + mealPenalties - sleepDeductions,
      shifts: caregiverShifts,
    });
  });

  return entries;
}

export default AdminDashboard;
