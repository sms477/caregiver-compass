import { Shift, Employee, PayrollLineItem, TaxBreakdown, DeductionBreakdown, PayRun, PayPeriod, PayStub, PayRunType, USState } from "@/types";

/* ---- Tax Rate Constants ---- */
const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE = 168600;
const MEDICARE_RATE = 0.0145;
const MEDICARE_ADDITIONAL_RATE = 0.009;
const MEDICARE_ADDITIONAL_THRESHOLD = 200000;

const EMPLOYER_SS_RATE = 0.062;
const EMPLOYER_MEDICARE_RATE = 0.0145;
const FUTA_RATE = 0.006;
const FUTA_WAGE_BASE = 7000;

const OT_MULTIPLIER = 1.5;
const DT_MULTIPLIER = 2.0;

/* ---- Multi-State Tax Tables (2024 simplified) ---- */

interface StateTaxConfig {
  brackets: { limit: number; rate: number }[];
  sdiRate: number;
  suiRate: number;
  suiWageBase: number;
  localTaxRate: number;
  hasDailyOT: boolean;       // CA has daily OT rules
  hasDoubleTime: boolean;    // CA has double-time
}

const STATE_TAX_CONFIGS: Record<string, StateTaxConfig> = {
  CA: {
    brackets: [
      { limit: 10412, rate: 0.01 }, { limit: 24684, rate: 0.02 },
      { limit: 38959, rate: 0.04 }, { limit: 54081, rate: 0.06 },
      { limit: 68350, rate: 0.08 }, { limit: 349137, rate: 0.093 },
    ],
    sdiRate: 0.011, suiRate: 0.034, suiWageBase: 7000, localTaxRate: 0, hasDailyOT: true, hasDoubleTime: true,
  },
  NY: {
    brackets: [
      { limit: 8500, rate: 0.04 }, { limit: 11700, rate: 0.045 },
      { limit: 13900, rate: 0.0525 }, { limit: 80650, rate: 0.055 },
      { limit: 215400, rate: 0.06 }, { limit: 1077550, rate: 0.0685 },
    ],
    sdiRate: 0.005, suiRate: 0.041, suiWageBase: 12300, localTaxRate: 0, hasDailyOT: false, hasDoubleTime: false,
  },
  TX: {
    brackets: [], // No state income tax
    sdiRate: 0, suiRate: 0.027, suiWageBase: 9000, localTaxRate: 0, hasDailyOT: false, hasDoubleTime: false,
  },
  FL: {
    brackets: [], // No state income tax
    sdiRate: 0, suiRate: 0.027, suiWageBase: 7000, localTaxRate: 0, hasDailyOT: false, hasDoubleTime: false,
  },
  WA: {
    brackets: [], // No state income tax
    sdiRate: 0.0058, suiRate: 0.027, suiWageBase: 67600, localTaxRate: 0, hasDailyOT: false, hasDoubleTime: false,
  },
  NV: {
    brackets: [], // No state income tax
    sdiRate: 0, suiRate: 0.0275, suiWageBase: 40100, localTaxRate: 0, hasDailyOT: true, hasDoubleTime: false,
  },
  IL: {
    brackets: [{ limit: Infinity, rate: 0.0495 }], // Flat rate
    sdiRate: 0, suiRate: 0.0325, suiWageBase: 13271, localTaxRate: 0, hasDailyOT: false, hasDoubleTime: false,
  },
  PA: {
    brackets: [{ limit: Infinity, rate: 0.0307 }],
    sdiRate: 0, suiRate: 0.037, suiWageBase: 10000, localTaxRate: 0, hasDailyOT: false, hasDoubleTime: false,
  },
  AZ: {
    brackets: [{ limit: Infinity, rate: 0.025 }],
    sdiRate: 0, suiRate: 0.027, suiWageBase: 8000, localTaxRate: 0, hasDailyOT: false, hasDoubleTime: false,
  },
  CO: {
    brackets: [{ limit: Infinity, rate: 0.044 }],
    sdiRate: 0.009, suiRate: 0.017, suiWageBase: 20400, localTaxRate: 0, hasDailyOT: false, hasDoubleTime: false,
  },
};

// Default fallback for unlisted states — moderate flat rate
const DEFAULT_STATE_CONFIG: StateTaxConfig = {
  brackets: [{ limit: Infinity, rate: 0.05 }],
  sdiRate: 0, suiRate: 0.027, suiWageBase: 7000, localTaxRate: 0, hasDailyOT: false, hasDoubleTime: false,
};

export function getStateConfig(state: USState): StateTaxConfig {
  return STATE_TAX_CONFIGS[state] || DEFAULT_STATE_CONFIG;
}

function estimateFederalIncomeTax(annualGross: number, filingStatus: string): number {
  const brackets = filingStatus === "married"
    ? [
        { limit: 23200, rate: 0.10 }, { limit: 94300, rate: 0.12 },
        { limit: 201050, rate: 0.22 }, { limit: 383900, rate: 0.24 },
      ]
    : [
        { limit: 11600, rate: 0.10 }, { limit: 47150, rate: 0.12 },
        { limit: 100525, rate: 0.22 }, { limit: 191950, rate: 0.24 },
      ];

  let tax = 0, remaining = annualGross, prevLimit = 0;
  for (const bracket of brackets) {
    const taxable = Math.min(remaining, bracket.limit - prevLimit);
    if (taxable <= 0) break;
    tax += taxable * bracket.rate;
    remaining -= taxable;
    prevLimit = bracket.limit;
  }
  return tax;
}

function estimateStateIncomeTax(annualGross: number, state: USState): number {
  const config = getStateConfig(state);
  if (config.brackets.length === 0) return 0;

  let tax = 0, remaining = annualGross, prevLimit = 0;
  for (const bracket of config.brackets) {
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
    preTax, postTax,
    totalPreTax: round(totalPreTax),
    totalPostTax: round(totalPostTax),
    totalDeductions: round(totalPreTax + totalPostTax),
  };
}

export function calculateTaxes(grossPay: number, employee: Employee, preTaxDeductions: number = 0): TaxBreakdown {
  const isContractor = employee.workerType === "contractor";
  const state = employee.workState || "CA";
  const stateConfig = getStateConfig(state);

  // Contractors: no withholding, no employer taxes
  if (isContractor) {
    return {
      federalIncome: 0, additionalFederal: 0, socialSecurity: 0, medicare: 0,
      stateIncome: 0, localTax: 0, sdi: 0, totalEmployeeTaxes: 0,
      employerSocialSecurity: 0, employerMedicare: 0, futa: 0, sui: 0,
      totalEmployerTaxes: 0, totalTaxes: 0,
    };
  }

  const taxableGross = Math.max(0, grossPay - preTaxDeductions);
  const annualizedGross = taxableGross * 24;

  // Federal income tax
  let federalIncome = 0;
  if (!employee.w4?.isExempt) {
    const annualFederal = estimateFederalIncomeTax(annualizedGross, employee.filingStatus);
    federalIncome = Math.max(0, annualFederal / 24);
  }

  const additionalFederal = employee.w4?.additionalWithholding || 0;

  const socialSecurity = Math.min(
    taxableGross * SOCIAL_SECURITY_RATE,
    (SOCIAL_SECURITY_WAGE_BASE / 24) * SOCIAL_SECURITY_RATE
  );

  let medicare = taxableGross * MEDICARE_RATE;
  if (annualizedGross > MEDICARE_ADDITIONAL_THRESHOLD) {
    const excessPerPeriod = Math.max(0, taxableGross - MEDICARE_ADDITIONAL_THRESHOLD / 24);
    medicare += excessPerPeriod * MEDICARE_ADDITIONAL_RATE;
  }

  // State income tax (multi-state)
  const annualState = estimateStateIncomeTax(annualizedGross, state);
  const stateIncome = Math.max(0, annualState / 24);

  const localTax = taxableGross * stateConfig.localTaxRate;
  const sdi = taxableGross * stateConfig.sdiRate;

  const totalEmployeeTaxes = federalIncome + additionalFederal + socialSecurity + medicare + stateIncome + localTax + sdi;

  // Employer taxes
  const employerSocialSecurity = Math.min(grossPay * EMPLOYER_SS_RATE, (SOCIAL_SECURITY_WAGE_BASE / 24) * EMPLOYER_SS_RATE);
  const employerMedicare = grossPay * EMPLOYER_MEDICARE_RATE;
  const futa = Math.min(grossPay, FUTA_WAGE_BASE / 24) * FUTA_RATE;
  const sui = Math.min(grossPay, stateConfig.suiWageBase / 24) * stateConfig.suiRate;
  const totalEmployerTaxes = employerSocialSecurity + employerMedicare + futa + sui;

  return {
    federalIncome: round(federalIncome), additionalFederal: round(additionalFederal),
    socialSecurity: round(socialSecurity), medicare: round(medicare),
    stateIncome: round(stateIncome), localTax: round(localTax), sdi: round(sdi),
    totalEmployeeTaxes: round(totalEmployeeTaxes),
    employerSocialSecurity: round(employerSocialSecurity), employerMedicare: round(employerMedicare),
    futa: round(futa), sui: round(sui), totalEmployerTaxes: round(totalEmployerTaxes),
    totalTaxes: round(totalEmployeeTaxes),
  };
}

export function calculatePayrollLineItem(
  employee: Employee,
  shifts: Shift[],
  options?: { bonusAmount?: number }
): PayrollLineItem {
  const isContractor = employee.workerType === "contractor";
  const stateConfig = getStateConfig(employee.workState || "CA");

  const effectiveRate = employee.payType === "salaried"
    ? employee.annualSalary / 2080
    : employee.hourlyRate;

  // For bonus-only runs
  if (options?.bonusAmount && options.bonusAmount > 0) {
    const grossPay = round(options.bonusAmount);
    const deductions = isContractor ? { preTax: [], postTax: [], totalPreTax: 0, totalPostTax: 0, totalDeductions: 0 } : calculateDeductions(employee);
    const taxes = calculateTaxes(grossPay, employee, deductions.totalPreTax);
    const netPay = round(grossPay - taxes.totalTaxes - deductions.totalDeductions);
    return {
      employeeId: employee.id, employeeName: employee.name,
      payType: employee.payType, hourlyRate: round(effectiveRate),
      regularHours: 0, overtimeHours: 0, doubleTimeHours: 0,
      shiftDifferentialPay: 0, mealPenaltyHours: 0, sleepDeductionHours: 0,
      grossHours: 0, grossPay, taxes, deductions, netPay, shifts: [],
    };
  }

  let regularHours = 0, overtimeHours = 0, doubleTimeHours = 0;
  let mealPenaltyHours = 0, sleepDeductionHours = 0, shiftDifferentialPay = 0;

  const sortedShifts = [...shifts].filter(s => s.clockOut).sort(
    (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()
  );

  const weekMap = new Map<string, { totalHours: number; consecutiveDays: Set<string> }>();

  sortedShifts.forEach(s => {
    const clockIn = new Date(s.clockIn);
    const clockOut = new Date(s.clockOut!);
    const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / 3600000;

    const dayOfWeek = clockIn.getDay();
    const weekStart = new Date(clockIn);
    weekStart.setDate(weekStart.getDate() - dayOfWeek);
    const weekKey = weekStart.toISOString().split("T")[0];

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { totalHours: 0, consecutiveDays: new Set() });
    }
    const week = weekMap.get(weekKey)!;
    week.consecutiveDays.add(clockIn.toISOString().split("T")[0]);

    const is7thDay = week.consecutiveDays.size >= 7;
    let dailyRegular: number, dailyOT: number, dailyDT: number;

    if (stateConfig.hasDailyOT) {
      if (is7thDay) {
        dailyRegular = 0;
        dailyOT = Math.min(hoursWorked, 8);
        dailyDT = stateConfig.hasDoubleTime ? Math.max(hoursWorked - 8, 0) : 0;
        if (!stateConfig.hasDoubleTime) dailyOT = hoursWorked;
      } else {
        dailyRegular = Math.min(hoursWorked, 8);
        dailyOT = Math.min(Math.max(hoursWorked - 8, 0), 4);
        dailyDT = stateConfig.hasDoubleTime ? Math.max(hoursWorked - 12, 0) : 0;
        if (!stateConfig.hasDoubleTime) dailyOT = Math.max(hoursWorked - 8, 0);
      }
    } else {
      // Federal OT only (weekly >40)
      dailyRegular = hoursWorked;
      dailyOT = 0;
      dailyDT = 0;
    }

    // Weekly OT
    const prevWeekHours = week.totalHours;
    week.totalHours += hoursWorked;

    if (prevWeekHours < 40 && week.totalHours > 40 && !is7thDay) {
      const weeklyOTHours = Math.min(dailyRegular, week.totalHours - 40);
      dailyRegular -= weeklyOTHours;
      dailyOT += weeklyOTHours;
    } else if (prevWeekHours >= 40 && !is7thDay) {
      dailyOT += dailyRegular;
      dailyRegular = 0;
    }

    regularHours += dailyRegular;
    overtimeHours += dailyOT;
    doubleTimeHours += dailyDT;

    if (s.mealBreakTaken === false) mealPenaltyHours += 1;

    if (s.is24Hour && s.sleepStart && s.sleepEnd) {
      const sleepMs = new Date(s.sleepEnd).getTime() - new Date(s.sleepStart).getTime();
      const interruptMs = s.sleepInterruptions.reduce((sum, i) => {
        if (i.resumeTime) return sum + (new Date(i.resumeTime).getTime() - new Date(i.wakeTime).getTime());
        return sum;
      }, 0);
      const netSleepHours = (sleepMs - interruptMs) / 3600000;
      if (netSleepHours >= 5) sleepDeductionHours += Math.min(netSleepHours, 8);
    }

    if (employee.shiftDifferentials?.length > 0) {
      for (const diff of employee.shiftDifferentials) {
        shiftDifferentialPay += hoursWorked * effectiveRate * (diff.multiplier - 1);
      }
    }
  });

  const grossHours = regularHours + overtimeHours + doubleTimeHours + mealPenaltyHours - sleepDeductionHours;

  let grossPay: number;
  if (employee.payType === "salaried") {
    const perPeriodSalary = employee.annualSalary / 24;
    grossPay = round(perPeriodSalary + overtimeHours * effectiveRate * OT_MULTIPLIER
      + doubleTimeHours * effectiveRate * DT_MULTIPLIER
      + mealPenaltyHours * effectiveRate - sleepDeductionHours * effectiveRate + shiftDifferentialPay);
  } else {
    grossPay = round(
      regularHours * effectiveRate + overtimeHours * effectiveRate * OT_MULTIPLIER
      + doubleTimeHours * effectiveRate * DT_MULTIPLIER
      + mealPenaltyHours * effectiveRate - sleepDeductionHours * effectiveRate + shiftDifferentialPay
    );
  }

  const deductions = isContractor
    ? { preTax: [], postTax: [], totalPreTax: 0, totalPostTax: 0, totalDeductions: 0 }
    : calculateDeductions(employee);
  const taxes = calculateTaxes(grossPay, employee, deductions.totalPreTax);
  const netPay = round(grossPay - taxes.totalTaxes - deductions.totalDeductions);

  return {
    employeeId: employee.id, employeeName: employee.name,
    payType: employee.payType, hourlyRate: round(effectiveRate),
    regularHours: round(regularHours), overtimeHours: round(overtimeHours),
    doubleTimeHours: round(doubleTimeHours), shiftDifferentialPay: round(shiftDifferentialPay),
    mealPenaltyHours: round(mealPenaltyHours), sleepDeductionHours: round(sleepDeductionHours),
    grossHours: round(grossHours), grossPay, taxes, deductions, netPay, shifts,
  };
}

export function buildPayRun(
  payPeriod: PayPeriod,
  employees: Employee[],
  allShifts: Shift[],
  runType: PayRunType = "regular",
  bonusAmounts?: Map<string, number>
): PayRun {
  const periodShifts = allShifts.filter(s => {
    if (!s.clockOut) return false;
    const clockIn = new Date(s.clockIn);
    return clockIn >= payPeriod.startDate && clockIn <= payPeriod.endDate;
  });

  const lineItems = employees.map(emp => {
    const empShifts = periodShifts.filter(s => s.caregiverId === emp.id);
    const bonus = bonusAmounts?.get(emp.id);

    if (runType === "bonus" && bonus) {
      return calculatePayrollLineItem(emp, [], { bonusAmount: bonus });
    }

    return calculatePayrollLineItem(emp, empShifts);
  }).filter(li => li.grossHours > 0 || li.grossPay > 0);

  const totalGrossPay = round(lineItems.reduce((s, li) => s + li.grossPay, 0));
  const totalTaxes = round(lineItems.reduce((s, li) => s + li.taxes.totalTaxes, 0));
  const totalNetPay = round(lineItems.reduce((s, li) => s + li.netPay, 0));

  return {
    id: `pr-${payPeriod.id}-${Date.now()}`,
    payPeriod,
    runType,
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
