export interface Resident {
  id: string;
  name: string;
  room: string;
  medications: Medication[];
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  schedule: string;
}

export interface Shift {
  id: string;
  caregiverId: string;
  caregiverName: string;
  clockIn: Date;
  clockOut: Date | null;
  is24Hour: boolean;
  mealBreakTaken: boolean | null;
  mealBreakReason: string | null;
  sleepStart: Date | null;
  sleepEnd: Date | null;
  sleepInterruptions: SleepInterruption[];
  adlReports: ADLReport[];
  emarRecords: EMARRecord[];
}

export interface SleepInterruption {
  id: string;
  wakeTime: Date;
  resumeTime: Date | null;
  reason: string;
}

export interface ADLReport {
  residentId: string;
  bathing: boolean;
  dressing: boolean;
  eating: boolean;
  mobility: boolean;
  toileting: boolean;
  notes: string;
}

export interface EMARRecord {
  id: string;
  residentId: string;
  medicationId: string;
  administeredAt: Date;
  administeredBy: string;
}

/* ---- Payroll Types ---- */

export type FilingStatus = 'single' | 'married' | 'head_of_household';
export type PayType = 'hourly' | 'salaried';

export interface ShiftDifferential {
  label: string;        // e.g. "Night", "Weekend"
  multiplier: number;   // e.g. 1.10 for 10% extra
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  payType: PayType;
  hourlyRate: number;         // used for hourly employees (and as derived rate for salaried)
  annualSalary: number;       // used for salaried employees
  shiftDifferentials: ShiftDifferential[];
  filingStatus: FilingStatus;
  federalAllowances: number;
  stateAllowances: number;
  startDate: string;
  role: string;
}

export interface TaxBreakdown {
  federalIncome: number;
  socialSecurity: number;
  medicare: number;
  stateIncome: number;
  sdi: number; // CA State Disability Insurance
  totalTaxes: number;
}

export interface PayrollLineItem {
  employeeId: string;
  employeeName: string;
  payType: PayType;
  hourlyRate: number;
  regularHours: number;
  overtimeHours: number;
  shiftDifferentialPay: number;
  mealPenaltyHours: number;
  sleepDeductionHours: number;
  grossHours: number;
  grossPay: number;
  taxes: TaxBreakdown;
  netPay: number;
  shifts: Shift[];
}

export interface PayPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  payDate: Date;
  label: string;
}

export type PayRunStatus = 'draft' | 'reviewing' | 'approved' | 'paid';

export interface PayRun {
  id: string;
  payPeriod: PayPeriod;
  status: PayRunStatus;
  lineItems: PayrollLineItem[];
  totalGrossPay: number;
  totalTaxes: number;
  totalNetPay: number;
  approvedAt: Date | null;
  createdAt: Date;
}

export interface PayStub {
  id: string;
  payRunId: string;
  employeeId: string;
  employeeName: string;
  payPeriod: PayPeriod;
  lineItem: PayrollLineItem;
  paidAt: Date;
}

// Legacy compat
export interface PayrollEntry {
  caregiverId: string;
  caregiverName: string;
  regularHours: number;
  overtimeHours: number;
  mealPenalties: number;
  sleepDeductions: number;
  totalHours: number;
  shifts: Shift[];
}

export type UserRole = 'caregiver' | 'admin';
