import { Shift, Employee, PayrollLineItem, TaxBreakdown, DeductionBreakdown, PayRun, PayPeriod, PayStub } from "@/types";

/* ---- Tax Rate Constants (CA 2024 simplified) ---- */
// Employee taxes
const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE = 168600;
const MEDICARE_RATE = 0.0145;
const MEDICARE_ADDITIONAL_RATE = 0.009; // Additional Medicare over $200k
const MEDICARE_ADDITIONAL_THRESHOLD = 200000;
const CA_SDI_RATE = 0.011;
const LOCAL_TAX_RATE = 0.0; // Placeholder — configurable per jurisdiction

// Employer taxes
const EMPLOYER_SS_RATE = 0.062;
const EMPLOYER_MEDICARE_RATE = 0.0145;
const FUTA_RATE = 0.006; // After credit
const FUTA_WAGE_BASE = 7000;
const CA_SUI_RATE = 0.034; // CA employer SUI rate (varies)
const CA_SUI_WAGE_BASE = 7000;

const OT_MULTIPLIER = 1.5;

function estimateFederalIncomeTax(annualGross: number, filingStatus: string): number {
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

export function calculateDeductions(employee: Employee): DeductionBreakdown {
  const preTax = (employee.deductions || [])
    .filter(d => d.type === "pre_tax")
    .map(d => ({ label: d.label, amount: d.amount }));
  const postTax = (employee.deductions || [])
    .filter(d => d.type === "post_tax")
    .map(d => ({ label: d.label, amount: d.amount }));

  const totalPreTax = preTax.reduce((s, d) => s + d.amount, 0);
  const totalPostTax = postTax.reduce((s, d) => s + d.amount, 0);

  return {
    preTax,
    postTax,
    totalPreTax: round(totalPreTax),
    totalPostTax: round(totalPostTax),
    totalDeductions: round(totalPreTax + totalPostTax),
  };
}

export function calculateTaxes(grossPay: number, employee: Employee, preTaxDeductions: number = 0): TaxBreakdown {
  // Taxable income = gross minus pre-tax deductions
  const taxableGross = Math.max(0, grossPay - preTaxDeductions);
  const annualizedGross = taxableGross * 24; // semi-monthly

  // Federal income tax
  let federalIncome = 0;
  if (!employee.w4?.isExempt) {
    const annualFederal = estimateFederalIncomeTax(annualizedGross, employee.filingStatus);
    federalIncome = Math.max(0, annualFederal / 24);
  }

  // W-4 additional withholding
  const additionalFederal = employee.w4?.additionalWithholding || 0;

  // Social Security (employee)
  const socialSecurity = Math.min(
    taxableGross * SOCIAL_SECURITY_RATE,
    (SOCIAL_SECURITY_WAGE_BASE / 24) * SOCIAL_SECURITY_RATE
  );

  // Medicare (employee) — includes additional Medicare tax
  let medicare = taxableGross * MEDICARE_RATE;
  if (annualizedGross > MEDICARE_ADDITIONAL_THRESHOLD) {
    const excessPerPeriod = Math.max(0, taxableGross - MEDICARE_ADDITIONAL_THRESHOLD / 24);
    medicare += excessPerPeriod * MEDICARE_ADDITIONAL_RATE;
  }

  // CA State income tax
  const annualState = estimateCAIncomeTax(annualizedGross);
  const stateIncome = Math.max(0, annualState / 24);

  // Local tax (placeholder, configurable)
  const localTax = taxableGross * LOCAL_TAX_RATE;

  // CA SDI
  const sdi = taxableGross * CA_SDI_RATE;

  const totalEmployeeTaxes = federalIncome + additionalFederal + socialSecurity + medicare + stateIncome + localTax + sdi;

  // Employer taxes (calculated on gross, not reduced by pre-tax deductions for SS/Medicare)
  const employerSocialSecurity = Math.min(
    grossPay * EMPLOYER_SS_RATE,
    (SOCIAL_SECURITY_WAGE_BASE / 24) * EMPLOYER_SS_RATE
  );
  const employerMedicare = grossPay * EMPLOYER_MEDICARE_RATE;
  const futa = Math.min(grossPay, FUTA_WAGE_BASE / 24) * FUTA_RATE;
  const sui = Math.min(grossPay, CA_SUI_WAGE_BASE / 24) * CA_SUI_RATE;
  const totalEmployerTaxes = employerSocialSecurity + employerMedicare + futa + sui;

  return {
    federalIncome: round(federalIncome),
    additionalFederal: round(additionalFederal),
    socialSecurity: round(socialSecurity),
    medicare: round(medicare),
    stateIncome: round(stateIncome),
    localTax: round(localTax),
    sdi: round(sdi),
    totalEmployeeTaxes: round(totalEmployeeTaxes),
    employerSocialSecurity: round(employerSocialSecurity),
    employerMedicare: round(employerMedicare),
    futa: round(futa),
    sui: round(sui),
    totalEmployerTaxes: round(totalEmployerTaxes),
    // Legacy compat — totalTaxes = employee portion only (affects net pay)
    totalTaxes: round(totalEmployeeTaxes),
  };
}

export function calculatePayrollLineItem(
  employee: Employee,
  shifts: Shift[]
): PayrollLineItem {
  const effectiveRate = employee.payType === "salaried"
    ? employee.annualSalary / 2080
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

    if (employee.shiftDifferentials?.length > 0) {
      for (const diff of employee.shiftDifferentials) {
        const extraMultiplier = diff.multiplier - 1;
        shiftDifferentialPay += hoursWorked * effectiveRate * extraMultiplier;
      }
    }
  });

  const grossHours = regularHours + overtimeHours + mealPenaltyHours - sleepDeductionHours;

  let grossPay: number;
  if (employee.payType === "salaried") {
    const perPeriodSalary = employee.annualSalary / 24;
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

  // Calculate deductions
  const deductions = calculateDeductions(employee);

  // Calculate taxes (pre-tax deductions reduce taxable income)
  const taxes = calculateTaxes(grossPay, employee, deductions.totalPreTax);

  // Net = gross - employee taxes - all deductions
  const netPay = round(grossPay - taxes.totalTaxes - deductions.totalDeductions);

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
    deductions,
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
  }).filter(li => li.grossHours > 0 || li.grossPay > 0);

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
