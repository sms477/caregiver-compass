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

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface Shift {
  id: string;
  caregiverId: string;
  caregiverName: string;
  clockIn: Date;
  clockOut: Date | null;
  clockInLocation: GeoLocation | null;
  clockOutLocation: GeoLocation | null;
  is24Hour: boolean;
  mealBreakTaken: boolean | null;
  mealBreakReason: string | null;
  secondMealBreakTaken: boolean | null;
  secondMealBreakReason: string | null;
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
export type DeductionType = 'pre_tax' | 'post_tax';
export type WorkerType = 'employee' | 'contractor';
export type PayRunType = 'regular' | 'off_cycle' | 'bonus' | 'termination';

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
] as const;
export type USState = typeof US_STATES[number];

export interface ShiftDifferential {
  label: string;        // e.g. "Night", "Weekend"
  multiplier: number;   // e.g. 1.10 for 10% extra
}

export interface Deduction {
  label: string;           // e.g. "Health Insurance", "401k", "Garnishment"
  type: DeductionType;     // pre_tax or post_tax
  amount: number;          // flat $ per pay period
}

export interface W4Config {
  additionalWithholding: number;   // W-4 Line 4(c) extra federal per period
  isExempt: boolean;               // W-4 exempt from federal withholding
}

export interface BankInfo {
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  workerType: WorkerType;
  workState: USState;
  payType: PayType;
  hourlyRate: number;
  annualSalary: number;
  shiftDifferentials: ShiftDifferential[];
  filingStatus: FilingStatus;
  federalAllowances: number;
  stateAllowances: number;
  w4: W4Config;
  deductions: Deduction[];
  bankInfo: BankInfo | null;
  startDate: string;
  role: string;
}

export type PaymentBatchStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PaymentItemStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PaymentBatch {
  id: string;
  payRunId: string;
  status: PaymentBatchStatus;
  totalAmount: number;
  paymentCount: number;
  initiatedBy: string;
  initiatedAt: Date;
  processedAt: Date | null;
  notes: string | null;
  items: PaymentItem[];
}

export type PaymentMethod = 'direct_deposit' | 'manual_check';

export interface PaymentItem {
  id: string;
  batchId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  bankName: string | null;
  accountLastFour: string | null;
  checkNumber: string | null;
  status: PaymentItemStatus;
  failureReason: string | null;
}

export interface TaxBreakdown {
  // Employee taxes
  federalIncome: number;
  additionalFederal: number;
  socialSecurity: number;
  medicare: number;
  stateIncome: number;
  localTax: number;
  sdi: number;
  totalEmployeeTaxes: number;
  // Employer taxes
  employerSocialSecurity: number;
  employerMedicare: number;
  futa: number;        // Federal Unemployment
  sui: number;         // State Unemployment (CA)
  totalEmployerTaxes: number;
  // Legacy compat
  totalTaxes: number;
}

export interface DeductionBreakdown {
  preTax: { label: string; amount: number }[];
  postTax: { label: string; amount: number }[];
  totalPreTax: number;
  totalPostTax: number;
  totalDeductions: number;
}

export interface PayrollLineItem {
  employeeId: string;
  employeeName: string;
  payType: PayType;
  hourlyRate: number;
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  shiftDifferentialPay: number;
  mealPenaltyHours: number;
  sleepDeductionHours: number;
  grossHours: number;
  grossPay: number;
  taxes: TaxBreakdown;
  deductions: DeductionBreakdown;
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
  runType: PayRunType;
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

export type UserRole = 'caregiver' | 'admin' | 'super_admin';
