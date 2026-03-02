import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Shift } from "@/types";
import {
  ArrowLeft, AlertTriangle, Clock, DollarSign, Download,
  FileText, Users, TrendingUp, Shield, Play, Receipt,
  LayoutDashboard, UserCircle, ChevronRight
} from "lucide-react";
import { formatCurrency } from "@/lib/payroll";
import { buildPayRun } from "@/lib/payroll";
import { MOCK_PAY_PERIODS } from "@/data/mockData";
import PayRunWizard from "@/components/admin/PayRunWizard";
import EmployeeProfiles from "@/components/admin/EmployeeProfiles";
import PayStubsView from "@/components/admin/PayStubsView";
import PayrollReports from "@/components/admin/PayrollReports";

type AdminTab = "dashboard" | "run-payroll" | "employees" | "pay-stubs" | "reports" | "shifts";

const NAV_ITEMS: { key: AdminTab; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "run-payroll", label: "Run Payroll", icon: Play },
  { key: "employees", label: "Team", icon: UserCircle },
  { key: "pay-stubs", label: "Pay Stubs", icon: Receipt },
  { key: "reports", label: "Reports", icon: TrendingUp },
  { key: "shifts", label: "Shift Log", icon: FileText },
];

const AdminDashboard = () => {
  const { setRole, shifts, employees, payRuns } = useApp();
  const [tab, setTab] = useState<AdminTab>("dashboard");

  const completedShifts = shifts.filter(s => s.clockOut);

  // Current period preview
  const currentPeriod = MOCK_PAY_PERIODS[0];
  const previewRun = useMemo(
    () => buildPayRun(currentPeriod, employees, shifts),
    [currentPeriod, employees, shifts]
  );

  const complianceAlerts = useMemo(() => {
    const alerts: { type: "warning" | "danger"; message: string }[] = [];
    completedShifts.forEach(s => {
      if (s.mealBreakTaken === false) {
        alerts.push({ type: "danger", message: `${s.caregiverName} missed meal break — 1hr penalty added` });
      }
      if (s.is24Hour && s.sleepStart && s.sleepEnd) {
        const sleepMs = new Date(s.sleepEnd).getTime() - new Date(s.sleepStart).getTime();
        const interruptMs = s.sleepInterruptions.reduce((sum, i) => {
          if (i.resumeTime) return sum + (new Date(i.resumeTime).getTime() - new Date(i.wakeTime).getTime());
          return sum;
        }, 0);
        const netSleep = (sleepMs - interruptMs) / 3600000;
        if (netSleep < 5) {
          alerts.push({ type: "warning", message: `${s.caregiverName} got only ${netSleep.toFixed(1)}h sleep — no deduction applied` });
        }
      }
    });
    return alerts;
  }, [completedShifts]);

  const exportCSV = () => {
    const header = "Employee,Rate,Regular Hrs,OT Hrs,Meal Penalties,Sleep Ded,Gross Pay,Taxes,Net Pay\n";
    const rows = previewRun.lineItems.map(li =>
      `${li.employeeName},${li.hourlyRate},${li.regularHours},${li.overtimeHours},${li.mealPenaltyHours},${li.sleepDeductionHours},${li.grossPay},${li.taxes.totalTaxes},${li.netPay}`
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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border hidden lg:flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-foreground text-lg">CareGuard</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Payroll & Compliance</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={() => setRole(null)}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-10 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setRole(null)} className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-display font-bold text-foreground">CareGuard Admin</span>
          <div className="w-5" />
        </div>
        <div className="flex overflow-x-auto px-2 pb-2 gap-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:pt-0 pt-24 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-6">
          {tab === "dashboard" && (
            <DashboardView
              previewRun={previewRun}
              currentPeriod={currentPeriod}
              completedShifts={completedShifts}
              complianceAlerts={complianceAlerts}
              payRuns={payRuns}
              onRunPayroll={() => setTab("run-payroll")}
              onExportCSV={exportCSV}
            />
          )}

          {tab === "run-payroll" && (
            <PayRunWizard
              onComplete={() => setTab("dashboard")}
              onCancel={() => setTab("dashboard")}
            />
          )}

          {tab === "employees" && <EmployeeProfiles />}
          {tab === "pay-stubs" && <PayStubsView />}
          {tab === "reports" && <PayrollReports />}

          {tab === "shifts" && (
            <ShiftLogView shifts={completedShifts} />
          )}
        </div>
      </main>
    </div>
  );
};

/* ---- Dashboard Home ---- */

function DashboardView({ previewRun, currentPeriod, completedShifts, complianceAlerts, payRuns, onRunPayroll, onExportCSV }: {
  previewRun: any;
  currentPeriod: any;
  completedShifts: Shift[];
  complianceAlerts: { type: string; message: string }[];
  payRuns: any[];
  onRunPayroll: () => void;
  onExportCSV: () => void;
}) {
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Payroll Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Current period: {currentPeriod.label}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 rounded-lg border border-border text-foreground px-4 py-2 text-sm font-medium hover:bg-muted active:scale-[0.97] transition-all"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={onRunPayroll}
            className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.97] transition-all"
          >
            <Play className="w-4 h-4" /> Run Payroll
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Est. Net Pay" value={formatCurrency(previewRun.totalNetPay)} accent />
        <StatCard icon={TrendingUp} label="Est. Gross Pay" value={formatCurrency(previewRun.totalGrossPay)} />
        <StatCard icon={Users} label="Employees" value={previewRun.lineItems.length.toString()} />
        <StatCard icon={Clock} label="Total Shifts" value={completedShifts.length.toString()} />
      </div>

      {/* Compliance Alerts */}
      {complianceAlerts.length > 0 && (
        <div className="glass-card rounded-xl p-4 space-y-2 border-l-4 border-warning">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-warning" /> {complianceAlerts.length} Compliance Alert(s)
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

      {/* Quick Preview Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Period Preview</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {currentPeriod.label}
          </span>
        </div>
        {previewRun.lineItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Hours</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Gross</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Taxes</th>
                  <th className="text-right p-3 font-semibold text-foreground">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {previewRun.lineItems.map((li: any) => (
                  <tr key={li.employeeId} className="border-t border-border">
                    <td className="p-3">
                      <p className="font-medium text-foreground">{li.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(li.hourlyRate)}/hr</p>
                    </td>
                    <td className="p-3 text-right text-foreground">
                      {li.grossHours.toFixed(1)}
                      {li.overtimeHours > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">({li.overtimeHours.toFixed(1)} OT)</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-foreground">{formatCurrency(li.grossPay)}</td>
                    <td className="p-3 text-right text-destructive">-{formatCurrency(li.taxes.totalTaxes)}</td>
                    <td className="p-3 text-right font-bold text-foreground">{formatCurrency(li.netPay)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="p-3 font-semibold text-foreground">Total</td>
                  <td className="p-3" />
                  <td className="p-3 text-right font-semibold text-foreground">{formatCurrency(previewRun.totalGrossPay)}</td>
                  <td className="p-3 text-right font-semibold text-destructive">-{formatCurrency(previewRun.totalTaxes)}</td>
                  <td className="p-3 text-right font-bold text-foreground text-lg">{formatCurrency(previewRun.totalNetPay)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No shifts found for the current period.
          </div>
        )}
      </div>

      {/* Past Pay Runs */}
      {payRuns.length > 0 && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-foreground">Recent Pay Runs</h3>
          {payRuns.map(run => (
            <div key={run.id} className="flex items-center justify-between border-b border-border last:border-0 pb-3 last:pb-0">
              <div>
                <p className="font-medium text-foreground text-sm">{run.payPeriod.label}</p>
                <p className="text-xs text-muted-foreground">
                  {run.lineItems.length} employees · {run.status === "approved" ? "Approved" : run.status}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">{formatCurrency(run.totalNetPay)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  run.status === "approved" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}>
                  {run.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string; accent?: boolean;
}) {
  return (
    <div className={`glass-card rounded-xl p-4 space-y-1 ${accent ? "border-2 border-primary/20" : ""}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-display font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function ShiftLogView({ shifts }: { shifts: Shift[] }) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">Shift Log</h2>
        <p className="text-sm text-muted-foreground mt-1">Complete history of all caregiver shifts.</p>
      </div>
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
    </div>
  );
}

export default AdminDashboard;
