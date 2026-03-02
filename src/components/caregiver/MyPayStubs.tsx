import { useApp } from "@/contexts/AppContext";
import { PayStub as PayStubType } from "@/types";
import { formatCurrency } from "@/lib/payroll";
import { FileText, Download, Receipt, ChevronLeft } from "lucide-react";
import { useState } from "react";

const MyPayStubs = () => {
  const { payStubs, currentCaregiverId } = useApp();
  const [selectedStub, setSelectedStub] = useState<PayStubType | null>(null);

  const myStubs = payStubs.filter(s => s.employeeId === currentCaregiverId);

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
      ...(li.deductions.preTax.map(d => `${d.label} (pre-tax),,${formatCurrency(d.amount)}`)),
      ...(li.deductions.postTax.map(d => `${d.label} (post-tax),,${formatCurrency(d.amount)}`)),
      `Total Taxes,,${formatCurrency(li.taxes.totalTaxes)}`,
      `Total Deductions,,${formatCurrency(li.deductions.totalDeductions)}`,
      ``,
      `Net Pay,,${formatCurrency(li.netPay)}`,
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paystub-${stub.payPeriod.label.replace(/[^a-zA-Z0-9]/g, "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (selectedStub) {
    const li = selectedStub.lineItem;
    return (
      <div className="space-y-4 animate-slide-up">
        <button onClick={() => setSelectedStub(null)} className="flex items-center gap-1 text-muted-foreground text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Pay Stubs
        </button>

        <div className="glass-card rounded-xl overflow-hidden">
          {/* Stub Header */}
          <div className="bg-primary/5 border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pay Stub</p>
                <h2 className="text-lg font-display font-bold text-foreground mt-1">{selectedStub.payPeriod.label}</h2>
                <p className="text-xs text-muted-foreground">
                  Paid {new Date(selectedStub.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => exportStubCSV(selectedStub)}
                className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium active:scale-[0.97] transition-transform"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>

          <div className="p-4 space-y-5">
            {/* Earnings */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Earnings</h3>
              <div className="space-y-2 text-sm">
                <StubRow label="Regular Hours" detail={`${li.regularHours} hrs × ${formatCurrency(li.hourlyRate)}`} amount={formatCurrency(li.regularHours * li.hourlyRate)} />
                {li.overtimeHours > 0 && (
                  <StubRow label="Overtime (1.5×)" detail={`${li.overtimeHours} hrs`} amount={formatCurrency(li.overtimeHours * li.hourlyRate * 1.5)} />
                )}
                {li.doubleTimeHours > 0 && (
                  <StubRow label="Double-Time (2×)" detail={`${li.doubleTimeHours} hrs`} amount={formatCurrency(li.doubleTimeHours * li.hourlyRate * 2)} />
                )}
                {li.shiftDifferentialPay > 0 && (
                  <StubRow label="Shift Differential" amount={formatCurrency(li.shiftDifferentialPay)} />
                )}
                {li.mealPenaltyHours > 0 && (
                  <StubRow label="Meal Penalty" detail={`${li.mealPenaltyHours} hr(s)`} amount={formatCurrency(li.mealPenaltyHours * li.hourlyRate)} />
                )}
                {li.sleepDeductionHours > 0 && (
                  <StubRow label="Sleep Deduction" detail={`${li.sleepDeductionHours} hrs`} amount={`-${formatCurrency(li.sleepDeductionHours * li.hourlyRate)}`} />
                )}
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span className="text-foreground">Gross Pay</span>
                  <span className="text-foreground">{formatCurrency(li.grossPay)}</span>
                </div>
              </div>
            </div>

            {/* Tax Withholdings */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Tax Withholdings</h3>
              <div className="space-y-2 text-sm">
                <StubRow label="Federal Income Tax" amount={`-${formatCurrency(li.taxes.federalIncome)}`} />
                {li.taxes.additionalFederal > 0 && (
                  <StubRow label="Additional Federal (W-4)" amount={`-${formatCurrency(li.taxes.additionalFederal)}`} />
                )}
                <StubRow label="Social Security (6.2%)" amount={`-${formatCurrency(li.taxes.socialSecurity)}`} />
                <StubRow label="Medicare (1.45%)" amount={`-${formatCurrency(li.taxes.medicare)}`} />
                <StubRow label="CA State Income Tax" amount={`-${formatCurrency(li.taxes.stateIncome)}`} />
                <StubRow label="CA SDI (1.1%)" amount={`-${formatCurrency(li.taxes.sdi)}`} />
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span className="text-foreground">Total Taxes</span>
                  <span className="text-destructive">-{formatCurrency(li.taxes.totalTaxes)}</span>
                </div>
              </div>
            </div>

            {/* Pre/Post-Tax Deductions */}
            {li.deductions.totalDeductions > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Other Deductions</h3>
                <div className="space-y-2 text-sm">
                  {li.deductions.preTax.map((d, i) => (
                    <StubRow key={`pre-${i}`} label={d.label} detail="pre-tax" amount={`-${formatCurrency(d.amount)}`} />
                  ))}
                  {li.deductions.postTax.map((d, i) => (
                    <StubRow key={`post-${i}`} label={d.label} detail="post-tax" amount={`-${formatCurrency(d.amount)}`} />
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between font-semibold">
                    <span className="text-foreground">Total Deductions</span>
                    <span className="text-destructive">-{formatCurrency(li.deductions.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Net Pay */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
              <span className="font-display font-bold text-foreground text-lg">Net Pay</span>
              <span className="font-display font-bold text-foreground text-2xl">{formatCurrency(li.netPay)}</span>
            </div>

            {/* Hours Summary */}
            <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm mb-1">Hours Summary</p>
              <div className="grid grid-cols-2 gap-1">
                <span>Regular: {li.regularHours} hrs</span>
                <span>Overtime: {li.overtimeHours} hrs</span>
                <span>Double-Time: {li.doubleTimeHours} hrs</span>
                <span>Total: {li.grossHours} hrs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-slide-up">
      <h2 className="text-xl font-display font-bold text-foreground">My Pay Stubs</h2>
      <p className="text-sm text-muted-foreground">View and download your pay history.</p>

      {myStubs.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center space-y-3">
          <Receipt className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-foreground">No pay stubs yet</p>
          <p className="text-sm text-muted-foreground">Your pay stubs will appear here after payroll is processed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myStubs.map(stub => (
            <button
              key={stub.id}
              onClick={() => setSelectedStub(stub)}
              className="w-full glass-card rounded-xl p-4 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{stub.payPeriod.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Paid {new Date(stub.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
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

function StubRow({ label, detail, amount }: {
  label: string; detail?: string; amount: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <span className="text-foreground">{label}</span>
        {detail && <span className="text-muted-foreground ml-2 text-xs">({detail})</span>}
      </div>
      <span className="font-medium text-foreground">{amount}</span>
    </div>
  );
}

export default MyPayStubs;
