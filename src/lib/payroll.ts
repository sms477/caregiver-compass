import { Shift, Employee, PayrollLineItem, TaxBreakdown, PayRun, PayPeriod, PayStub } from "@/types";

/* ---- Tax Rate Constants (CA 2024 simplified) ---- */
const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE = 168600;
const MEDICARE_RATE = 0.0145;
const CA_SDI_RATE = 0.011;
const OT_MULTIPLIER = 1.5;

function estimateFederalIncomeTax(annualGross: number, filingStatus: string): number {
  // Simplified 2024 brackets
  const brackets = filingStatus === "married"
    ? [
        { limit: 23200, rate: 0.10 },
        { limit: 94300, rate: 0.12 },
        { limit: 201050, rate: 0.22 },
        { limit: 383900, rate: 0.24 },
      ]
    : [
        { limit: 11600, rate: 0.10 },
        { limit: 47150, rate: 0.12 },
        { limit: 100525, rate: 0.22 },
        { limit: 191950, rate: 0.24 },
      ];

  let tax = 0;
  let remaining = annualGross;
  let prevLimit = 0;

  for (const bracket of brackets) {
    const taxable = Math.min(remaining, bracket.limit - prevLimit);
    if (taxable <= 0) break;
    tax += taxable * bracket.rate;
    remaining -= taxable;
    prevLimit = bracket.limit;
  }

  return tax;
}

function estimateCAIncomeTax(annualGross: number): number {
  // Simplified CA brackets
  const brackets = [
    { limit: 10412, rate: 0.01 },
    { limit: 24684, rate: 0.02 },
    { limit: 38959, rate: 0.04 },
    { limit: 54081, rate: 0.06 },
    { limit: 68350, rate: 0.08 },
    { limit: 349137, rate: 0.093 },
  ];

  let tax = 0;
  let remaining = annualGross;
  let prevLimit = 0;

  for (const bracket of brackets) {
    const taxable = Math.min(remaining, bracket.limit - prevLimit);
    if (taxable <= 0) break;
    tax += taxable * bracket.rate;
    remaining -= taxable;
    prevLimit = bracket.limit;
  }

  return tax;
}

export function calculateTaxes(grossPay: number, employee: Employee): TaxBreakdown {
  // Annualize for bracket calculation (assume semi-monthly = 24 periods)
  const annualizedGross = grossPay * 24;

  const annualFederal = estimateFederalIncomeTax(annualizedGross, employee.filingStatus);
  const federalIncome = Math.max(0, annualFederal / 24);

  const socialSecurity = Math.min(grossPay * SOCIAL_SECURITY_RATE, (SOCIAL_SECURITY_WAGE_BASE / 24) * SOCIAL_SECURITY_RATE);
  const medicare = grossPay * MEDICARE_RATE;

  const annualState = estimateCAIncomeTax(annualizedGross);
  const stateIncome = Math.max(0, annualState / 24);

  const sdi = grossPay * CA_SDI_RATE;

  const totalTaxes = federalIncome + socialSecurity + medicare + stateIncome + sdi;

  return {
    federalIncome: round(federalIncome),
    socialSecurity: round(socialSecurity),
    medicare: round(medicare),
    stateIncome: round(stateIncome),
    sdi: round(sdi),
    totalTaxes: round(totalTaxes),
  };
}

export function calculatePayrollLineItem(
  employee: Employee,
  shifts: Shift[]
): PayrollLineItem {
  // Derive effective hourly rate
  const effectiveRate = employee.payType === "salaried"
    ? employee.annualSalary / 2080  // 40hrs × 52wks
    : employee.hourlyRate;

  let regularHours = 0;
  let overtimeHours = 0;
  let mealPenaltyHours = 0;
  let sleepDeductionHours = 0;
  let shiftDifferentialPay = 0;

  shifts.forEach(s => {
    if (!s.clockOut) return;
    const hoursWorked = (new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 3600000;

    const regular = Math.min(hoursWorked, 8);
    const ot = Math.max(hoursWorked - 8, 0);
    regularHours += regular;
    overtimeHours += ot;

    if (s.mealBreakTaken === false) {
      mealPenaltyHours += 1;
    }

    if (s.is24Hour && s.sleepStart && s.sleepEnd) {
      const sleepMs = new Date(s.sleepEnd).getTime() - new Date(s.sleepStart).getTime();
      const interruptMs = s.sleepInterruptions.reduce((sum, i) => {
        if (i.resumeTime) return sum + (new Date(i.resumeTime).getTime() - new Date(i.wakeTime).getTime());
        return sum;
      }, 0);
      const netSleepHours = (sleepMs - interruptMs) / 3600000;
      if (netSleepHours >= 5) {
        sleepDeductionHours += Math.min(netSleepHours, 8);
      }
    }

    // Shift differentials — apply each configured differential to all hours in this shift
    if (employee.shiftDifferentials?.length > 0) {
      for (const diff of employee.shiftDifferentials) {
        const extraMultiplier = diff.multiplier - 1; // e.g. 0.10 for a 1.10x multiplier
        shiftDifferentialPay += hoursWorked * effectiveRate * extraMultiplier;
      }
    }
  });

  const grossHours = regularHours + overtimeHours + mealPenaltyHours - sleepDeductionHours;

  let grossPay: number;
  if (employee.payType === "salaried") {
    // Salaried: base is per-period salary, plus OT and adjustments at derived rate
    const perPeriodSalary = employee.annualSalary / 24; // semi-monthly
    const otPay = overtimeHours * effectiveRate * OT_MULTIPLIER;
    const mealPay = mealPenaltyHours * effectiveRate;
    const sleepDed = sleepDeductionHours * effectiveRate;
    grossPay = round(perPeriodSalary + otPay + mealPay - sleepDed + shiftDifferentialPay);
  } else {
    grossPay = round(
      (regularHours * effectiveRate) +
      (overtimeHours * effectiveRate * OT_MULTIPLIER) +
      (mealPenaltyHours * effectiveRate) -
      (sleepDeductionHours * effectiveRate) +
      shiftDifferentialPay
    );
  }

  const taxes = calculateTaxes(grossPay, employee);
  const netPay = round(grossPay - taxes.totalTaxes);

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    payType: employee.payType,
    hourlyRate: round(effectiveRate),
    regularHours: round(regularHours),
    overtimeHours: round(overtimeHours),
    shiftDifferentialPay: round(shiftDifferentialPay),
    mealPenaltyHours: round(mealPenaltyHours),
    sleepDeductionHours: round(sleepDeductionHours),
    grossHours: round(grossHours),
    grossPay,
    taxes,
    netPay,
    shifts,
  };
}

export function buildPayRun(
  payPeriod: PayPeriod,
  employees: Employee[],
  allShifts: Shift[]
): PayRun {
  const periodShifts = allShifts.filter(s => {
    if (!s.clockOut) return false;
    const clockIn = new Date(s.clockIn);
    return clockIn >= payPeriod.startDate && clockIn <= payPeriod.endDate;
  });

  const lineItems = employees.map(emp => {
    const empShifts = periodShifts.filter(s => s.caregiverId === emp.id);
    return calculatePayrollLineItem(emp, empShifts);
  }).filter(li => li.grossHours > 0);

  const totalGrossPay = round(lineItems.reduce((s, li) => s + li.grossPay, 0));
  const totalTaxes = round(lineItems.reduce((s, li) => s + li.taxes.totalTaxes, 0));
  const totalNetPay = round(lineItems.reduce((s, li) => s + li.netPay, 0));

  return {
    id: `pr-${payPeriod.id}-${Date.now()}`,
    payPeriod,
    status: "draft",
    lineItems,
    totalGrossPay,
    totalTaxes,
    totalNetPay,
    approvedAt: null,
    createdAt: new Date(),
  };
}

export function generatePayStubs(payRun: PayRun): PayStub[] {
  return payRun.lineItems.map(li => ({
    id: `ps-${li.employeeId}-${payRun.id}`,
    payRunId: payRun.id,
    employeeId: li.employeeId,
    employeeName: li.employeeName,
    payPeriod: payRun.payPeriod,
    lineItem: li,
    paidAt: payRun.approvedAt || new Date(),
  }));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}
