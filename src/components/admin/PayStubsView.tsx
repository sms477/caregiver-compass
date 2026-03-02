import { useApp } from "@/contexts/AppContext";
import { PayStub as PayStubType } from "@/types";
import { formatCurrency } from "@/lib/payroll";
import { FileText, Download, Receipt } from "lucide-react";
import { useState } from "react";

const PayStubsView = () => {
  const { payStubs, employees } = useApp();
  const [selectedStub, setSelectedStub] = useState<PayStubType | null>(null);
  const [filterEmployee, setFilterEmployee] = useState<string>("all");

  const filtered = filterEmployee === "all"
    ? payStubs
    : payStubs.filter(s => s.employeeId === filterEmployee);

  const exportStubCSV = (stub: PayStubType) => {
    const li = stub.lineItem;
    const rows = [
      `Pay Stub - ${stub.employeeName}`,
      `Period: ${stub.payPeriod.label}`,
      ``,
      `Earnings`,
      `Regular Hours,${li.regularHours},${formatCurrency(li.regularHours * li.hourlyRate)}`,
      `Overtime Hours (1.5×),${li.overtimeHours},${formatCurrency(li.overtimeHours * li.hourlyRate * 1.5)}`,
      `Double-Time Hours (2×),${li.doubleTimeHours},${formatCurrency(li.doubleTimeHours * li.hourlyRate * 2)}`,
      `Meal Penalties,${li.mealPenaltyHours},${formatCurrency(li.mealPenaltyHours * li.hourlyRate)}`,
      `Sleep Deductions,-${li.sleepDeductionHours},-${formatCurrency(li.sleepDeductionHours * li.hourlyRate)}`,
      `Gross Pay,,${formatCurrency(li.grossPay)}`,
      ``,
      `Deductions`,
      `Federal Income Tax,,${formatCurrency(li.taxes.federalIncome)}`,
      `Social Security,,${formatCurrency(li.taxes.socialSecurity)}`,
      `Medicare,,${formatCurrency(li.taxes.medicare)}`,
      `CA State Tax,,${formatCurrency(li.taxes.stateIncome)}`,
      `CA SDI,,${formatCurrency(li.taxes.sdi)}`,
      `Total Taxes,,${formatCurrency(li.taxes.totalTaxes)}`,
      ``,
      `Net Pay,,${formatCurrency(li.netPay)}`,
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paystub-${stub.employeeName.replace(/ /g, "-")}-${stub.payPeriod.label.replace(/[^a-zA-Z0-9]/g, "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (selectedStub) {
    const li = selectedStub.lineItem;
    return (
      <div className="space-y-4 animate-slide-up">
        <button onClick={() => setSelectedStub(null)} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Pay Stubs
        </button>

        <div className="glass-card rounded-xl overflow-hidden">
          {/* Stub Header */}
          <div className="bg-primary/5 border-b border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pay Stub</p>
                <h2 className="text-xl font-display font-bold text-foreground mt-1">{selectedStub.employeeName}</h2>
                <p className="text-sm text-muted-foreground">{selectedStub.payPeriod.label}</p>
              </div>
              <button
                onClick={() => exportStubCSV(selectedStub)}
                className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium active:scale-[0.97] transition-transform"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Earnings */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Earnings</h3>
              <div className="space-y-2 text-sm">
                <Row label="Regular Hours" detail={`${li.regularHours} hrs × ${formatCurrency(li.hourlyRate)}`} amount={formatCurrency(li.regularHours * li.hourlyRate)} />
                {li.overtimeHours > 0 && (
                  <Row label="Overtime (1.5×)" detail={`${li.overtimeHours} hrs × ${formatCurrency(li.hourlyRate * 1.5)}`} amount={formatCurrency(li.overtimeHours * li.hourlyRate * 1.5)} />
                )}
                {li.doubleTimeHours > 0 && (
                  <Row label="Double-Time (2×)" detail={`${li.doubleTimeHours} hrs × ${formatCurrency(li.hourlyRate * 2)}`} amount={formatCurrency(li.doubleTimeHours * li.hourlyRate * 2)} />
                )}
                {li.mealPenaltyHours > 0 && (
                  <Row label="Meal Penalty Pay" detail={`${li.mealPenaltyHours} hr(s)`} amount={formatCurrency(li.mealPenaltyHours * li.hourlyRate)} color="destructive" />
                )}
                {li.sleepDeductionHours > 0 && (
                  <Row label="Sleep Time Deduction" detail={`${li.sleepDeductionHours} hrs`} amount={`-${formatCurrency(li.sleepDeductionHours * li.hourlyRate)}`} />
                )}
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span className="text-foreground">Gross Pay</span>
                  <span className="text-foreground">{formatCurrency(li.grossPay)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Tax Withholdings</h3>
              <div className="space-y-2 text-sm">
                <Row label="Federal Income Tax" amount={`-${formatCurrency(li.taxes.federalIncome)}`} />
                <Row label="Social Security (6.2%)" amount={`-${formatCurrency(li.taxes.socialSecurity)}`} />
                <Row label="Medicare (1.45%)" amount={`-${formatCurrency(li.taxes.medicare)}`} />
                <Row label="CA State Income Tax" amount={`-${formatCurrency(li.taxes.stateIncome)}`} />
                <Row label="CA SDI (1.1%)" amount={`-${formatCurrency(li.taxes.sdi)}`} />
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span className="text-foreground">Total Taxes</span>
                  <span className="text-destructive">-{formatCurrency(li.taxes.totalTaxes)}</span>
                </div>
              </div>
            </div>

            {/* Net Pay */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
              <span className="font-display font-bold text-foreground text-lg">Net Pay</span>
              <span className="font-display font-bold text-foreground text-2xl">{formatCurrency(li.netPay)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Pay Stubs</h2>
          <p className="text-sm text-muted-foreground mt-1">View and download individual pay stubs.</p>
        </div>
        <select
          value={filterEmployee}
          onChange={e => setFilterEmployee(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="all">All Employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">No pay stubs yet</p>
          <p className="text-sm text-muted-foreground mt-1">Run payroll to generate pay stubs for your team.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(stub => (
            <button
              key={stub.id}
              onClick={() => setSelectedStub(stub)}
              className="w-full glass-card rounded-xl p-4 text-left transition-all hover:shadow-lg active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{stub.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{stub.payPeriod.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-foreground">{formatCurrency(stub.lineItem.netPay)}</p>
                  <p className="text-xs text-muted-foreground">net pay</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function Row({ label, detail, amount, color }: {
  label: string; detail?: string; amount: string; color?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <span className="text-foreground">{label}</span>
        {detail && <span className="text-muted-foreground ml-2">({detail})</span>}
      </div>
      <span className={`font-medium ${color === "destructive" ? "text-destructive" : "text-foreground"}`}>
        {amount}
      </span>
    </div>
  );
}

export default PayStubsView;
