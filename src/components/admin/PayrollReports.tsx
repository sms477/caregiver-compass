import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/payroll";
import { PayRun, PayrollLineItem } from "@/types";
import { BarChart3, Download, FileSpreadsheet, Users, DollarSign, TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";

type ReportType = "summary" | "by-employee" | "tax-liability";

const PayrollReports = () => {
  const { payRuns, employees } = useApp();
  const [reportType, setReportType] = useState<ReportType>("summary");
  const [selectedRunId, setSelectedRunId] = useState<string>("all");

  const filteredRuns = selectedRunId === "all"
    ? payRuns
    : payRuns.filter(r => r.id === selectedRunId);

  // Aggregate all line items across selected runs
  const allLineItems = useMemo(
    () => filteredRuns.flatMap(r => r.lineItems),
    [filteredRuns]
  );

  const totals = useMemo(() => {
    const grossPay = allLineItems.reduce((s, li) => s + li.grossPay, 0);
    const totalEmployeeTaxes = allLineItems.reduce((s, li) => s + li.taxes.totalEmployeeTaxes, 0);
    const totalEmployerTaxes = allLineItems.reduce((s, li) => s + li.taxes.totalEmployerTaxes, 0);
    const totalDeductions = allLineItems.reduce((s, li) => s + li.deductions.totalDeductions, 0);
    const netPay = allLineItems.reduce((s, li) => s + li.netPay, 0);
    const totalRegularHours = allLineItems.reduce((s, li) => s + li.regularHours, 0);
    const totalOTHours = allLineItems.reduce((s, li) => s + li.overtimeHours, 0);
    return { grossPay, totalEmployeeTaxes, totalEmployerTaxes, totalDeductions, netPay, totalRegularHours, totalOTHours };
  }, [allLineItems]);

  // Per-employee aggregation
  const byEmployee = useMemo(() => {
    const map = new Map<string, { name: string; items: PayrollLineItem[] }>();
    for (const li of allLineItems) {
      const existing = map.get(li.employeeId);
      if (existing) {
        existing.items.push(li);
      } else {
        map.set(li.employeeId, { name: li.employeeName, items: [li] });
      }
    }
    return Array.from(map.entries()).map(([id, { name, items }]) => ({
      id,
      name,
      grossPay: items.reduce((s, li) => s + li.grossPay, 0),
      netPay: items.reduce((s, li) => s + li.netPay, 0),
      totalTaxes: items.reduce((s, li) => s + li.taxes.totalEmployeeTaxes, 0),
      totalDeductions: items.reduce((s, li) => s + li.deductions.totalDeductions, 0),
      regularHours: items.reduce((s, li) => s + li.regularHours, 0),
      overtimeHours: items.reduce((s, li) => s + li.overtimeHours, 0),
      periods: items.length,
    }));
  }, [allLineItems]);

  // Tax liability breakdown
  const taxBreakdown = useMemo(() => {
    const agg = {
      federalIncome: 0, socialSecurity: 0, medicare: 0, stateIncome: 0, sdi: 0, localTax: 0, additionalFederal: 0,
      employerSS: 0, employerMedicare: 0, futa: 0, sui: 0,
    };
    for (const li of allLineItems) {
      agg.federalIncome += li.taxes.federalIncome;
      agg.additionalFederal += li.taxes.additionalFederal;
      agg.socialSecurity += li.taxes.socialSecurity;
      agg.medicare += li.taxes.medicare;
      agg.stateIncome += li.taxes.stateIncome;
      agg.sdi += li.taxes.sdi;
      agg.localTax += li.taxes.localTax;
      agg.employerSS += li.taxes.employerSocialSecurity;
      agg.employerMedicare += li.taxes.employerMedicare;
      agg.futa += li.taxes.futa;
      agg.sui += li.taxes.sui;
    }
    return agg;
  }, [allLineItems]);

  const exportCSV = () => {
    let csv = "";
    if (reportType === "summary") {
      csv = [
        "Metric,Amount",
        `Total Gross Pay,${totals.grossPay.toFixed(2)}`,
        `Employee Taxes,${totals.totalEmployeeTaxes.toFixed(2)}`,
        `Employer Taxes,${totals.totalEmployerTaxes.toFixed(2)}`,
        `Pre/Post-Tax Deductions,${totals.totalDeductions.toFixed(2)}`,
        `Total Net Pay,${totals.netPay.toFixed(2)}`,
        `Regular Hours,${totals.totalRegularHours.toFixed(1)}`,
        `Overtime Hours,${totals.totalOTHours.toFixed(1)}`,
        `Pay Runs,${filteredRuns.length}`,
        `Employees,${byEmployee.length}`,
      ].join("\n");
    } else if (reportType === "by-employee") {
      csv = [
        "Employee,Periods,Regular Hrs,OT Hrs,Gross Pay,Taxes,Deductions,Net Pay",
        ...byEmployee.map(e =>
          `${e.name},${e.periods},${e.regularHours.toFixed(1)},${e.overtimeHours.toFixed(1)},${e.grossPay.toFixed(2)},${e.totalTaxes.toFixed(2)},${e.totalDeductions.toFixed(2)},${e.netPay.toFixed(2)}`
        ),
      ].join("\n");
    } else {
      csv = [
        "Tax Category,Amount",
        `Federal Income Tax,${taxBreakdown.federalIncome.toFixed(2)}`,
        `Additional Federal (W-4),${taxBreakdown.additionalFederal.toFixed(2)}`,
        `Social Security (Employee),${taxBreakdown.socialSecurity.toFixed(2)}`,
        `Medicare (Employee),${taxBreakdown.medicare.toFixed(2)}`,
        `CA State Income Tax,${taxBreakdown.stateIncome.toFixed(2)}`,
        `CA SDI,${taxBreakdown.sdi.toFixed(2)}`,
        `Local Tax,${taxBreakdown.localTax.toFixed(2)}`,
        ``,
        `Social Security (Employer),${taxBreakdown.employerSS.toFixed(2)}`,
        `Medicare (Employer),${taxBreakdown.employerMedicare.toFixed(2)}`,
        `FUTA,${taxBreakdown.futa.toFixed(2)}`,
        `CA SUI,${taxBreakdown.sui.toFixed(2)}`,
      ].join("\n");
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-report-${reportType}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const TABS: { key: ReportType; label: string; icon: React.ElementType }[] = [
    { key: "summary", label: "Summary", icon: BarChart3 },
    { key: "by-employee", label: "By Employee", icon: Users },
    { key: "tax-liability", label: "Tax Liability", icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Payroll Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">Summary reports across pay runs, employees, and tax records.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedRunId}
            onChange={e => setSelectedRunId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="all">All Pay Runs ({payRuns.length})</option>
            {payRuns.map(r => (
              <option key={r.id} value={r.id}>{r.payPeriod.label} — {r.status}</option>
            ))}
          </select>
          <button
            onClick={exportCSV}
            disabled={allLineItems.length === 0}
            className="flex items-center gap-2 rounded-lg border border-border text-foreground px-4 py-2 text-sm font-medium hover:bg-muted active:scale-[0.97] transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Report type tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setReportType(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                reportType === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {allLineItems.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">No payroll data yet</p>
          <p className="text-sm text-muted-foreground mt-1">Run payroll to generate reports.</p>
        </div>
      ) : (
        <>
          {reportType === "summary" && <SummaryReport totals={totals} runCount={filteredRuns.length} employeeCount={byEmployee.length} />}
          {reportType === "by-employee" && <ByEmployeeReport data={byEmployee} />}
          {reportType === "tax-liability" && <TaxLiabilityReport data={taxBreakdown} totals={totals} />}
        </>
      )}
    </div>
  );
};

/* ---- Summary ---- */
function SummaryReport({ totals, runCount, employeeCount }: {
  totals: { grossPay: number; totalEmployeeTaxes: number; totalEmployerTaxes: number; totalDeductions: number; netPay: number; totalRegularHours: number; totalOTHours: number };
  runCount: number;
  employeeCount: number;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Gross Pay" value={formatCurrency(totals.grossPay)} icon={DollarSign} accent />
        <MiniStat label="Net Pay" value={formatCurrency(totals.netPay)} icon={TrendingUp} />
        <MiniStat label="Pay Runs" value={String(runCount)} icon={FileSpreadsheet} />
        <MiniStat label="Employees" value={String(employeeCount)} icon={Users} />
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody>
            <TRow label="Total Gross Pay" amount={formatCurrency(totals.grossPay)} bold />
            <TRow label="Regular Hours" amount={`${totals.totalRegularHours.toFixed(1)} hrs`} />
            <TRow label="Overtime Hours" amount={`${totals.totalOTHours.toFixed(1)} hrs`} />
            <TRow label="Employee Tax Withholdings" amount={`-${formatCurrency(totals.totalEmployeeTaxes)}`} color="destructive" />
            <TRow label="Pre/Post-Tax Deductions" amount={`-${formatCurrency(totals.totalDeductions)}`} />
            <TRow label="Total Net Pay" amount={formatCurrency(totals.netPay)} bold />
            <TRow label="Employer Tax Liability" amount={formatCurrency(totals.totalEmployerTaxes)} color="warning" />
            <TRow label="Total Payroll Cost" amount={formatCurrency(totals.grossPay + totals.totalEmployerTaxes)} bold accent />
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- By Employee ---- */
function ByEmployeeReport({ data }: { data: { id: string; name: string; grossPay: number; netPay: number; totalTaxes: number; totalDeductions: number; regularHours: number; overtimeHours: number; periods: number }[] }) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Periods</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Reg Hrs</th>
              <th className="text-right p-3 font-medium text-muted-foreground">OT Hrs</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Gross</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Taxes</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Deductions</th>
              <th className="text-right p-3 font-semibold text-foreground">Net Pay</th>
            </tr>
          </thead>
          <tbody>
            {data.map(e => (
              <tr key={e.id} className="border-t border-border">
                <td className="p-3 font-medium text-foreground">{e.name}</td>
                <td className="p-3 text-right text-muted-foreground">{e.periods}</td>
                <td className="p-3 text-right text-foreground">{e.regularHours.toFixed(1)}</td>
                <td className="p-3 text-right text-foreground">{e.overtimeHours.toFixed(1)}</td>
                <td className="p-3 text-right text-foreground">{formatCurrency(e.grossPay)}</td>
                <td className="p-3 text-right text-destructive">-{formatCurrency(e.totalTaxes)}</td>
                <td className="p-3 text-right text-muted-foreground">-{formatCurrency(e.totalDeductions)}</td>
                <td className="p-3 text-right font-bold text-foreground">{formatCurrency(e.netPay)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/30">
              <td className="p-3 font-semibold text-foreground">Total</td>
              <td className="p-3" />
              <td className="p-3 text-right font-semibold text-foreground">{data.reduce((s, e) => s + e.regularHours, 0).toFixed(1)}</td>
              <td className="p-3 text-right font-semibold text-foreground">{data.reduce((s, e) => s + e.overtimeHours, 0).toFixed(1)}</td>
              <td className="p-3 text-right font-semibold text-foreground">{formatCurrency(data.reduce((s, e) => s + e.grossPay, 0))}</td>
              <td className="p-3 text-right font-semibold text-destructive">-{formatCurrency(data.reduce((s, e) => s + e.totalTaxes, 0))}</td>
              <td className="p-3 text-right font-semibold text-muted-foreground">-{formatCurrency(data.reduce((s, e) => s + e.totalDeductions, 0))}</td>
              <td className="p-3 text-right font-bold text-foreground text-lg">{formatCurrency(data.reduce((s, e) => s + e.netPay, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ---- Tax Liability ---- */
function TaxLiabilityReport({ data, totals }: {
  data: { federalIncome: number; additionalFederal: number; socialSecurity: number; medicare: number; stateIncome: number; sdi: number; localTax: number; employerSS: number; employerMedicare: number; futa: number; sui: number };
  totals: { totalEmployeeTaxes: number; totalEmployerTaxes: number };
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Employee withholdings */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="bg-primary/5 border-b border-border p-4">
            <h3 className="font-semibold text-foreground text-sm">Employee Tax Withholdings</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Amounts withheld from employee paychecks</p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <TRow label="Federal Income Tax" amount={formatCurrency(data.federalIncome)} />
              {data.additionalFederal > 0 && <TRow label="Additional Federal (W-4)" amount={formatCurrency(data.additionalFederal)} />}
              <TRow label="Social Security (6.2%)" amount={formatCurrency(data.socialSecurity)} />
              <TRow label="Medicare (1.45%)" amount={formatCurrency(data.medicare)} />
              <TRow label="CA State Income Tax" amount={formatCurrency(data.stateIncome)} />
              <TRow label="CA SDI (1.1%)" amount={formatCurrency(data.sdi)} />
              {data.localTax > 0 && <TRow label="Local Tax" amount={formatCurrency(data.localTax)} />}
              <TRow label="Total Employee Taxes" amount={formatCurrency(totals.totalEmployeeTaxes)} bold color="destructive" />
            </tbody>
          </table>
        </div>

        {/* Employer taxes */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="bg-accent/30 border-b border-border p-4">
            <h3 className="font-semibold text-foreground text-sm">Employer Tax Liability</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Taxes paid by the employer on top of wages</p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <TRow label="Social Security (6.2%)" amount={formatCurrency(data.employerSS)} />
              <TRow label="Medicare (1.45%)" amount={formatCurrency(data.employerMedicare)} />
              <TRow label="FUTA" amount={formatCurrency(data.futa)} />
              <TRow label="CA SUI" amount={formatCurrency(data.sui)} />
              <TRow label="Total Employer Taxes" amount={formatCurrency(totals.totalEmployerTaxes)} bold color="warning" />
            </tbody>
          </table>
        </div>
      </div>

      {/* Combined total */}
      <div className="glass-card rounded-xl p-4 flex justify-between items-center">
        <span className="font-display font-bold text-foreground">Total Tax Obligation</span>
        <span className="font-display font-bold text-foreground text-2xl">
          {formatCurrency(totals.totalEmployeeTaxes + totals.totalEmployerTaxes)}
        </span>
      </div>
    </div>
  );
}

/* ---- Shared components ---- */
function MiniStat({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ElementType; accent?: boolean }) {
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

function TRow({ label, amount, bold, color, accent }: { label: string; amount: string; bold?: boolean; color?: string; accent?: boolean }) {
  const textColor = color === "destructive" ? "text-destructive" : color === "warning" ? "text-warning" : "text-foreground";
  return (
    <tr className={`border-t border-border ${accent ? "bg-primary/5" : ""}`}>
      <td className={`p-3 ${bold ? "font-semibold" : ""} text-foreground`}>{label}</td>
      <td className={`p-3 text-right ${bold ? "font-bold" : "font-medium"} ${textColor}`}>{amount}</td>
    </tr>
  );
}

export default PayrollReports;
