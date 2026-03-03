import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { PayPeriod, PayRun, PayRunType } from "@/types";
import { MOCK_PAY_PERIODS } from "@/data/mockData";
import { buildPayRun, generatePayStubs, formatCurrency } from "@/lib/payroll";
import {
  Calendar, ChevronRight, Check, AlertTriangle, ArrowLeft,
  DollarSign, Clock, Users, FileCheck, Gift, Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";

type WizardStep = "select-type" | "select-period" | "bonus-amounts" | "review-hours" | "preview-pay" | "confirm";

const STEPS_REGULAR: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: "select-type", label: "Run Type", icon: Zap },
  { key: "select-period", label: "Pay Period", icon: Calendar },
  { key: "review-hours", label: "Review Hours", icon: Clock },
  { key: "preview-pay", label: "Preview Pay", icon: DollarSign },
  { key: "confirm", label: "Approve", icon: FileCheck },
];

const STEPS_BONUS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: "select-type", label: "Run Type", icon: Zap },
  { key: "select-period", label: "Pay Period", icon: Calendar },
  { key: "bonus-amounts", label: "Amounts", icon: Gift },
  { key: "preview-pay", label: "Preview Pay", icon: DollarSign },
  { key: "confirm", label: "Approve", icon: FileCheck },
];

const RUN_TYPES: { key: PayRunType; label: string; description: string; icon: React.ElementType }[] = [
  { key: "regular", label: "Regular Payroll", description: "Standard pay period run from shift data", icon: Calendar },
  { key: "off_cycle", label: "Off-Cycle", description: "Ad-hoc run outside the normal schedule", icon: Zap },
  { key: "bonus", label: "Bonus", description: "One-time bonus payments to employees", icon: Gift },
  { key: "termination", label: "Termination", description: "Final pay for departing employees", icon: ArrowLeft },
];

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

const PayRunWizard = ({ onComplete, onCancel }: Props) => {
  const { shifts, employees, addPayRun, addPayStubs, updatePayRunStatus } = useApp();
  const [step, setStep] = useState<WizardStep>("select-type");
  const [runType, setRunType] = useState<PayRunType>("regular");
  const [selectedPeriod, setSelectedPeriod] = useState<PayPeriod | null>(null);
  const [payRun, setPayRun] = useState<PayRun | null>(null);
  const [bonusAmounts, setBonusAmounts] = useState<Map<string, number>>(new Map());

  const STEPS = runType === "bonus" ? STEPS_BONUS : STEPS_REGULAR;
  const stepIndex = STEPS.findIndex(s => s.key === step);

  const handleSelectPeriod = (period: PayPeriod) => {
    setSelectedPeriod(period);
    if (runType === "bonus") {
      // Initialize bonus amounts for all employees
      const initial = new Map<string, number>();
      employees.forEach(e => initial.set(e.id, 0));
      setBonusAmounts(initial);
      setStep("bonus-amounts");
    } else {
      const run = buildPayRun(period, employees, shifts, runType);
      setPayRun(run);
      setStep("review-hours");
    }
  };

  const handleBonusPreview = () => {
    if (!selectedPeriod) return;
    const filteredBonuses = new Map([...bonusAmounts].filter(([, v]) => v > 0));
    const bonusEmployees = employees.filter(e => filteredBonuses.has(e.id));
    const run = buildPayRun(selectedPeriod, bonusEmployees, [], "bonus", filteredBonuses);
    setPayRun(run);
    setStep("preview-pay");
  };

  const handleApprove = async () => {
    if (!payRun) return;
    const approved: PayRun = { ...payRun, status: "approved", approvedAt: new Date() };
    const savedRun = await addPayRun(approved);
    const runForStubs = savedRun || approved;
    const stubs = generatePayStubs(runForStubs);
    await addPayStubs(stubs);
    setStep("confirm");
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === stepIndex;
          const isDone = i < stepIndex;
          return (
            <div key={s.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isDone ? "bg-success text-success-foreground" :
                  isActive ? "bg-primary text-primary-foreground shadow-lg" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-full mx-1 rounded ${i < stepIndex ? "bg-success" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {step === "select-type" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Select Run Type</h2>
            <p className="text-sm text-muted-foreground mt-1">Choose the type of payroll run.</p>
          </div>
          {RUN_TYPES.map(rt => {
            const Icon = rt.icon;
            return (
              <button
                key={rt.key}
                onClick={() => { setRunType(rt.key); setStep("select-period"); }}
                className={`w-full glass-card rounded-xl p-5 text-left transition-all hover:shadow-lg hover:border-primary/30 active:scale-[0.99] group ${runType === rt.key ? "border-primary/40" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{rt.label}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{rt.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            );
          })}
          <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">← Cancel</button>
        </div>
      )}

      {step === "select-period" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Select Pay Period</h2>
            <p className="text-sm text-muted-foreground mt-1">Choose the pay period to run payroll for.</p>
          </div>
          {MOCK_PAY_PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectPeriod(p)}
              className="w-full glass-card rounded-xl p-5 text-left transition-all hover:shadow-lg hover:border-primary/30 active:scale-[0.99] group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{p.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pay date: {p.payDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>
          ))}
          <button onClick={() => setStep("select-type")} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </button>
        </div>
      )}

      {step === "bonus-amounts" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Set Bonus Amounts</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter the bonus amount for each employee. Leave at $0 to skip.</p>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {employees.map(emp => (
                <div key={emp.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground text-sm">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.role} · {emp.workerType === "contractor" ? "Contractor" : "Employee"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={bonusAmounts.get(emp.id) || ""}
                      onChange={e => {
                        const newMap = new Map(bonusAmounts);
                        newMap.set(emp.id, parseFloat(e.target.value) || 0);
                        setBonusAmounts(newMap);
                      }}
                      placeholder="0.00"
                      className="w-32"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("select-period")} className="flex-1 rounded-lg border border-border text-foreground font-medium py-3 active:scale-[0.98] transition-transform">Back</button>
            <button
              onClick={handleBonusPreview}
              disabled={[...bonusAmounts.values()].every(v => v <= 0)}
              className="flex-1 rounded-lg bg-primary text-primary-foreground font-medium py-3 disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              Preview Pay →
            </button>
          </div>
        </div>
      )}

      {step === "review-hours" && payRun && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Review Hours</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedPeriod?.label} — Verify hours before calculating pay.
            </p>
          </div>

          {payRun.lineItems.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">No shifts found for this period.</p>
              <p className="text-sm text-muted-foreground mt-1">Caregivers need to log shifts within this date range.</p>
            </div>
          ) : (
            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Regular</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">OT (1.5x)</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Diff.</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Penalties</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Sleep Ded.</th>
                    <th className="text-right p-3 font-semibold text-foreground">Total Hrs</th>
                  </tr>
                </thead>
                <tbody>
                  {payRun.lineItems.map(li => (
                    <tr key={li.employeeId} className="border-b border-border last:border-0">
                      <td className="p-3">
                        <p className="font-medium text-foreground">{li.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {li.payType === "salaried"
                            ? `Salaried (${formatCurrency(li.hourlyRate)}/hr equiv.)`
                            : `${formatCurrency(li.hourlyRate)}/hr`}
                        </p>
                      </td>
                      <td className="p-3 text-right text-foreground">{li.regularHours.toFixed(1)}</td>
                      <td className="p-3 text-right text-foreground">{li.overtimeHours.toFixed(1)}</td>
                      <td className="p-3 text-right">
                        {li.shiftDifferentialPay > 0 ? (
                          <span className="text-primary font-medium">+{formatCurrency(li.shiftDifferentialPay)}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3 text-right">
                        {li.mealPenaltyHours > 0 ? (
                          <span className="text-destructive font-medium">+{li.mealPenaltyHours}</span>
                        ) : <span className="text-muted-foreground">0</span>}
                      </td>
                      <td className="p-3 text-right">
                        {li.sleepDeductionHours > 0 ? (
                          <span className="text-primary font-medium">-{li.sleepDeductionHours.toFixed(1)}</span>
                        ) : <span className="text-muted-foreground">0</span>}
                      </td>
                      <td className="p-3 text-right font-bold text-foreground">{li.grossHours.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {payRun.lineItems.some(li => li.mealPenaltyHours > 0) && (
            <div className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <p className="text-sm text-warning">
                Meal penalty hours detected — 1 hour of penalty pay per missed break will be included.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep("select-period")} className="flex-1 rounded-lg border border-border text-foreground font-medium py-3 active:scale-[0.98] transition-transform">
              Back
            </button>
            <button
              onClick={() => setStep("preview-pay")}
              disabled={payRun.lineItems.length === 0}
              className="flex-1 rounded-lg bg-primary text-primary-foreground font-medium py-3 disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              Preview Pay →
            </button>
          </div>
        </div>
      )}

      {step === "preview-pay" && payRun && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Preview Payroll</h2>
            <p className="text-sm text-muted-foreground mt-1">Review gross pay, tax withholdings, and net pay before approving.</p>
          </div>

          {/* Totals Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground font-medium">Gross Pay</p>
              <p className="text-xl font-display font-bold text-foreground mt-1">{formatCurrency(payRun.totalGrossPay)}</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground font-medium">Total Taxes</p>
              <p className="text-xl font-display font-bold text-destructive mt-1">-{formatCurrency(payRun.totalTaxes)}</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center border-2 border-primary/20">
              <p className="text-xs text-primary font-medium">Net Pay</p>
              <p className="text-xl font-display font-bold text-foreground mt-1">{formatCurrency(payRun.totalNetPay)}</p>
            </div>
          </div>

          {/* Per-employee Breakdown */}
          <div className="space-y-3">
            {payRun.lineItems.map(li => (
              <div key={li.employeeId} className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{li.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {li.payType === "salaried" ? "Salaried" : `${li.grossHours.toFixed(1)} hrs × ${formatCurrency(li.hourlyRate)}/hr`}
                      {li.shiftDifferentialPay > 0 ? ` + ${formatCurrency(li.shiftDifferentialPay)} diff.` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-foreground">{formatCurrency(li.netPay)}</p>
                    <p className="text-xs text-muted-foreground">net pay</p>
                  </div>
                </div>
                <div className="border-t border-border pt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Pay</span>
                    <span className="text-foreground font-medium">{formatCurrency(li.grossPay)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Federal Tax</span>
                    <span className="text-foreground font-medium">-{formatCurrency(li.taxes.federalIncome)}</span>
                  </div>
                  {li.taxes.additionalFederal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Addl. Federal (W-4)</span>
                      <span className="text-foreground font-medium">-{formatCurrency(li.taxes.additionalFederal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Social Security</span>
                    <span className="text-foreground font-medium">-{formatCurrency(li.taxes.socialSecurity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Medicare</span>
                    <span className="text-foreground font-medium">-{formatCurrency(li.taxes.medicare)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CA State Tax</span>
                    <span className="text-foreground font-medium">-{formatCurrency(li.taxes.stateIncome)}</span>
                  </div>
                  {li.taxes.localTax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Local Tax</span>
                      <span className="text-foreground font-medium">-{formatCurrency(li.taxes.localTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CA SDI</span>
                    <span className="text-foreground font-medium">-{formatCurrency(li.taxes.sdi)}</span>
                  </div>

                  {/* Pre-tax deductions */}
                  {li.deductions.preTax.map((d, i) => (
                    <div key={`pre-${i}`} className="flex justify-between">
                      <span className="text-muted-foreground">{d.label} (pre-tax)</span>
                      <span className="text-foreground font-medium">-{formatCurrency(d.amount)}</span>
                    </div>
                  ))}

                  {/* Post-tax deductions */}
                  {li.deductions.postTax.map((d, i) => (
                    <div key={`post-${i}`} className="flex justify-between">
                      <span className="text-muted-foreground">{d.label} (post-tax)</span>
                      <span className="text-foreground font-medium">-{formatCurrency(d.amount)}</span>
                    </div>
                  ))}

                  {/* Employer taxes (informational) */}
                  <div className="col-span-2 border-t border-border mt-1 pt-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Employer Cost</p>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employer SS</span>
                    <span className="text-muted-foreground">{formatCurrency(li.taxes.employerSocialSecurity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employer Medicare</span>
                    <span className="text-muted-foreground">{formatCurrency(li.taxes.employerMedicare)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FUTA</span>
                    <span className="text-muted-foreground">{formatCurrency(li.taxes.futa)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CA SUI</span>
                    <span className="text-muted-foreground">{formatCurrency(li.taxes.sui)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("review-hours")} className="flex-1 rounded-lg border border-border text-foreground font-medium py-3 active:scale-[0.98] transition-transform">
              Back
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 rounded-lg bg-success text-success-foreground font-semibold py-3 active:scale-[0.98] transition-transform"
            >
              <Check className="w-4 h-4 inline mr-2" /> Approve & Submit
            </button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="text-center space-y-6 py-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 text-success">
            <Check className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Payroll Approved! 🎉</h2>
            <p className="text-muted-foreground mt-2">
              {selectedPeriod?.label}<br />
              <span className="text-foreground font-semibold">{formatCurrency(payRun?.totalNetPay || 0)}</span> total net pay for{" "}
              {payRun?.lineItems.length} employee(s).
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Pay stubs have been generated and are available in the Pay Stubs tab.</p>
          <button
            onClick={onComplete}
            className="rounded-lg bg-primary text-primary-foreground font-medium px-8 py-3 active:scale-[0.98] transition-transform"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default PayRunWizard;
