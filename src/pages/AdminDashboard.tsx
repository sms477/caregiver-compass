import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Shift } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft, AlertTriangle, Clock, DollarSign, Download,
  FileText, Users, TrendingUp, Shield, Play, Receipt,
  LayoutDashboard, UserCircle, ChevronRight, Building2, FileCheck,
  CalendarIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
  Home, History, Activity, Wallet, CreditCard
} from "lucide-react";
import { formatCurrency } from "@/lib/payroll";
import { buildPayRun } from "@/lib/payroll";
import { MOCK_PAY_PERIODS } from "@/data/mockData";
import PayRunWizard from "@/components/admin/PayRunWizard";
import EmployeeProfiles from "@/components/admin/EmployeeProfiles";
import PayStubsView from "@/components/admin/PayStubsView";
import ReportsCenter from "@/components/admin/ReportsCenter";
import PaymentsView from "@/components/admin/PaymentsView";
import TaxFormsView from "@/components/admin/TaxFormsView";
import ResidentsManager from "@/components/admin/ResidentsManager";
import IncidentsView from "@/components/admin/IncidentsView";
import AuditTrailView from "@/components/admin/AuditTrailView";
import OverdueShiftAlerts from "@/components/admin/OverdueShiftAlerts";
import ShiftEditor from "@/components/admin/ShiftEditor";
import AcuityReview from "@/components/admin/AcuityReview";
import BillingDashboard from "@/components/admin/BillingDashboard";
import AdminDashboardHome from "@/components/admin/AdminDashboardHome";
import CRMDashboard from "@/components/admin/crm/CRMDashboard";
import SubscriptionBilling from "@/components/admin/SubscriptionBilling";
import AdminLocationsManager from "@/components/admin/AdminLocationsManager";
import { type Prospect } from "@/hooks/useCRM";
import { Heart } from "lucide-react";

import { type ProspectConversionData } from "@/components/admin/ResidentsManager";

type AdminTab = "dashboard" | "crm" | "run-payroll" | "employees" | "residents" | "acuity-review" | "billing" | "incidents" | "pay-stubs" | "payments" | "tax-forms" | "reports" | "shifts" | "audit-trail" | "subscription" | "locations";

const NAV_ITEMS: { key: AdminTab; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "crm", label: "CRM", icon: Heart },
  { key: "run-payroll", label: "Run Payroll", icon: Play },
  { key: "employees", label: "Team", icon: UserCircle },
  { key: "residents", label: "Residents", icon: Home },
  { key: "acuity-review", label: "Acuity Review", icon: Activity },
  { key: "billing", label: "Billing", icon: Wallet },
  { key: "incidents", label: "Incidents", icon: AlertTriangle },
  { key: "pay-stubs", label: "Pay Stubs", icon: Receipt },
  { key: "payments", label: "Payments", icon: Building2 },
  { key: "tax-forms", label: "Tax Forms", icon: FileCheck },
  { key: "reports", label: "Reports", icon: TrendingUp },
  { key: "shifts", label: "Shift Log", icon: FileText },
  { key: "audit-trail", label: "Audit Trail", icon: History },
  { key: "subscription", label: "Subscription", icon: CreditCard },
  { key: "locations", label: "Locations", icon: MapPin },
];

const AdminDashboard = () => {
  const { setRole, shifts, employees, payRuns, activeShift } = useApp();
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [conversionData, setConversionData] = useState<ProspectConversionData | null>(null);

  const handleConvertProspect = (prospect: Prospect) => {
    setConversionData({
      prospectId: prospect.id,
      name: prospect.name,
      locationId: prospect.location_id,
      phone: prospect.phone,
      email: prospect.email,
    });
    setTab("residents");
  };

  const handleConversionComplete = () => {
    setConversionData(null);
    setTab("billing");
  };

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
      if (s.adlReports.length === 0 && s.emarRecords.length === 0) {
        const date = new Date(s.clockIn).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        alerts.push({ type: "warning", message: `${s.caregiverName} (${date}) — no ADL or eMAR documentation` });
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
    const header = "Employee,Rate,Regular Hrs,OT Hrs,DT Hrs,Meal Penalties,Sleep Ded,Gross Pay,Taxes,Net Pay\n";
    const rows = previewRun.lineItems.map((li: any) =>
      `${li.employeeName},${li.hourlyRate},${li.regularHours},${li.overtimeHours},${li.doubleTimeHours},${li.mealPenaltyHours},${li.sleepDeductionHours},${li.grossPay},${li.taxes.totalTaxes},${li.netPay}`
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
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <span className="text-sm font-display font-black">E</span>
            </div>
            <span className="font-display font-bold text-foreground text-lg tracking-tight">EasyRCFE</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Operations & Compliance</p>
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
          <span className="font-display font-bold text-foreground tracking-tight">EasyRCFE</span>
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
            <AdminDashboardHome onNavigate={(t) => setTab(t as AdminTab)} />
          )}

          {tab === "run-payroll" && (
            <PayRunWizard
              onComplete={() => setTab("dashboard")}
              onCancel={() => setTab("dashboard")}
            />
          )}

          {tab === "crm" && <CRMDashboard onConvertProspect={handleConvertProspect} />}
          {tab === "employees" && <EmployeeProfiles />}
          {tab === "residents" && (
            <ResidentsManager
              conversionData={conversionData}
              onConversionComplete={handleConversionComplete}
            />
          )}
          {tab === "acuity-review" && <AcuityReview />}
          {tab === "billing" && <BillingDashboard />}
          {tab === "incidents" && <IncidentsView />}
          {tab === "pay-stubs" && <PayStubsView />}
          {tab === "payments" && <PaymentsView />}
          {tab === "tax-forms" && <TaxFormsView />}
          {tab === "reports" && <ReportsCenter />}
          {tab === "audit-trail" && <AuditTrailView />}
          {tab === "subscription" && <SubscriptionBilling />}

          {tab === "shifts" && (
            <ShiftLogView shifts={completedShifts} onRefresh={() => setRefreshKey(k => k + 1)} />
          )}
        </div>
      </main>
    </div>
  );
};

/* ---- Shift Log ---- */

function ShiftLogView({ shifts, onRefresh }: { shifts: Shift[]; onRefresh?: () => void }) {
  const [groupBy, setGroupBy] = useState<"day" | "employee">("day");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const shiftDates = useMemo(() => {
    const dates = new Set<string>();
    shifts.forEach(s => dates.add(new Date(s.clockIn).toDateString()));
    return dates;
  }, [shifts]);

  const filteredShifts = useMemo(() => {
    if (groupBy === "day" && selectedDate) {
      return shifts.filter(s => new Date(s.clockIn).toDateString() === selectedDate.toDateString());
    }
    return shifts;
  }, [shifts, groupBy, selectedDate]);

  const grouped = useMemo(() => {
    const map = new Map<string, Shift[]>();
    const sorted = [...filteredShifts].sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
    sorted.forEach(s => {
      const key = groupBy === "day"
        ? new Date(s.clockIn).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
        : s.caregiverName;
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    });
    return map;
  }, [filteredShifts, groupBy]);

  const sortedUniqueDates = useMemo(() => {
    return [...shiftDates].map(d => new Date(d)).sort((a, b) => b.getTime() - a.getTime());
  }, [shiftDates]);

  const currentIndex = selectedDate ? sortedUniqueDates.findIndex(d => d.toDateString() === selectedDate.toDateString()) : -1;
  const canGoPrev = currentIndex < sortedUniqueDates.length - 1;
  const canGoNext = currentIndex > 0;

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Shift Log</h2>
          <p className="text-sm text-muted-foreground mt-1">Complete history of all caregiver shifts.</p>
        </div>
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          <button
            onClick={() => { setGroupBy("day"); setSelectedDate(undefined); }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              groupBy === "day" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> By Day
          </button>
          <button
            onClick={() => setGroupBy("employee")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              groupBy === "employee" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> By Employee
          </button>
        </div>
      </div>

      {groupBy === "day" && shifts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedDate && (
            <>
              <button onClick={() => canGoPrev && setSelectedDate(sortedUniqueDates[currentIndex + 1])} disabled={!canGoPrev} className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button onClick={() => canGoNext && setSelectedDate(sortedUniqueDates[currentIndex - 1])} disabled={!canGoNext} className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "All dates — pick a day to filter"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{ hasShifts: sortedUniqueDates }}
                modifiersClassNames={{ hasShifts: "font-bold text-primary" }}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <button onClick={() => setSelectedDate(undefined)} className="text-xs text-muted-foreground hover:text-foreground underline">Show all</button>
          )}
        </div>
      )}

      {shifts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No completed shifts yet.</p>
      ) : filteredShifts.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="font-medium text-foreground">No shifts on this date</p>
          <p className="text-sm text-muted-foreground mt-1">Select a different date or click "Show all".</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([groupLabel, groupShifts]) => (
            <div key={groupLabel} className="glass-card rounded-xl overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">{groupLabel}</h3>
                <span className="text-xs text-muted-foreground">{groupShifts.length} shift(s)</span>
              </div>
              <div className="divide-y divide-border">
                {groupShifts.map(s => (
                  <div key={s.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        {groupBy === "day" ? (
                          <p className="font-medium text-foreground text-sm">{s.caregiverName}</p>
                        ) : (
                          <p className="font-medium text-foreground text-sm">
                            {new Date(s.clockIn).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {s.clockOut ? new Date(s.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ShiftEditor shift={s} onSaved={() => onRefresh?.()} />
                        {s.is24Hour && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">24hr</span>}
                        {s.mealBreakTaken === false && <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">No break</span>}
                        {s.mealBreakTaken === true && <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">Break ✓</span>}
                        {s.adlReports.length === 0 && s.emarRecords.length === 0 && (
                          <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> No docs
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {s.emarRecords.length > 0 && <span>{s.emarRecords.length} med(s)</span>}
                      {s.adlReports.length > 0 && <span>{s.adlReports.length} ADL(s)</span>}
                      {s.emarRecords.length === 0 && <span className="text-warning">0 meds</span>}
                      {s.adlReports.length === 0 && <span className="text-warning">0 ADLs</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
