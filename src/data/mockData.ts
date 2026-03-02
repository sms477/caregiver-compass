import { Resident, Shift, Employee, PayPeriod, PayRun, PayStub } from "@/types";

export const MOCK_RESIDENTS: Resident[] = [
  {
    id: "r1", name: "John Doe", room: "Room 1",
    medications: [
      { id: "m1", name: "Lisinopril", dosage: "10mg", schedule: "Morning" },
      { id: "m2", name: "Metformin", dosage: "500mg", schedule: "Morning" },
    ],
  },
  {
    id: "r2", name: "Mary Smith", room: "Room 2",
    medications: [{ id: "m3", name: "Amlodipine", dosage: "5mg", schedule: "Evening" }],
  },
  {
    id: "r3", name: "Robert Johnson", room: "Room 3",
    medications: [
      { id: "m4", name: "Omeprazole", dosage: "20mg", schedule: "Morning" },
      { id: "m5", name: "Aspirin", dosage: "81mg", schedule: "Morning" },
    ],
  },
  {
    id: "r4", name: "Linda Williams", room: "Room 4",
    medications: [{ id: "m6", name: "Levothyroxine", dosage: "50mcg", schedule: "Morning" }],
  },
  {
    id: "r5", name: "James Brown", room: "Room 5",
    medications: [{ id: "m7", name: "Atorvastatin", dosage: "20mg", schedule: "Evening" }],
  },
  {
    id: "r6", name: "Patricia Davis", room: "Room 6",
    medications: [
      { id: "m8", name: "Donepezil", dosage: "5mg", schedule: "Evening" },
      { id: "m9", name: "Sertraline", dosage: "50mg", schedule: "Morning" },
    ],
  },
];

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "c1", name: "Maria Garcia", email: "maria@example.com", phone: "(555) 123-4567",
    payType: "hourly", hourlyRate: 18.50, annualSalary: 0, shiftDifferentials: [{ label: "Night", multiplier: 1.10 }],
    filingStatus: "single", federalAllowances: 1, stateAllowances: 1,
    w4: { additionalWithholding: 0, isExempt: false },
    deductions: [{ label: "Health Insurance", type: "pre_tax", amount: 150 }],
    bankInfo: { bankName: "Chase", routingNumber: "021000021", accountNumber: "****4567", accountType: "checking" },
    startDate: "2024-03-15", role: "Lead Caregiver",
  },
  {
    id: "c2", name: "Ana Rodriguez", email: "ana@example.com", phone: "(555) 234-5678",
    payType: "hourly", hourlyRate: 17.00, annualSalary: 0, shiftDifferentials: [],
    filingStatus: "married", federalAllowances: 2, stateAllowances: 2,
    w4: { additionalWithholding: 25, isExempt: false },
    deductions: [{ label: "401(k)", type: "pre_tax", amount: 200 }, { label: "Roth IRA", type: "post_tax", amount: 100 }],
    bankInfo: null,
    startDate: "2024-06-01", role: "Caregiver",
  },
  {
    id: "c3", name: "David Chen", email: "david@example.com", phone: "(555) 345-6789",
    payType: "salaried", hourlyRate: 0, annualSalary: 49920, shiftDifferentials: [],
    filingStatus: "single", federalAllowances: 1, stateAllowances: 1,
    w4: { additionalWithholding: 0, isExempt: false },
    deductions: [],
    bankInfo: { bankName: "Bank of America", routingNumber: "026009593", accountNumber: "****8901", accountType: "checking" },
    startDate: "2024-01-10", role: "Senior Caregiver",
  },
];

export const MOCK_CAREGIVERS = MOCK_EMPLOYEES.map(e => ({ id: e.id, name: e.name }));

// Shifts
const now = new Date();
const day = (d: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - d);
  return date;
};

const makeShift = (
  caregiverId: string, caregiverName: string, daysAgo: number,
  startHour: number, endHour: number, mealBreak: boolean, is24 = false
): Shift => {
  const clockIn = new Date(day(daysAgo));
  clockIn.setHours(startHour, 0, 0, 0);
  const clockOut = new Date(day(is24 ? daysAgo - 1 : daysAgo));
  clockOut.setHours(endHour, 0, 0, 0);
  return {
    id: `s-${caregiverId}-${daysAgo}-${startHour}`,
    caregiverId, caregiverName, clockIn, clockOut, is24Hour: is24,
    clockInLocation: null,
    clockOutLocation: null,
    mealBreakTaken: mealBreak,
    mealBreakReason: mealBreak ? null : "Resident emergency",
    secondMealBreakTaken: null,
    secondMealBreakReason: null,
    sleepStart: is24 ? (() => { const d = new Date(clockIn); d.setHours(22, 0); return d; })() : null,
    sleepEnd: is24 ? (() => { const d = new Date(clockIn); d.setDate(d.getDate() + 1); d.setHours(6, 0); return d; })() : null,
    sleepInterruptions: [],
    adlReports: [],
    emarRecords: [],
  };
};

export const MOCK_SHIFTS: Shift[] = [
  makeShift("c1", "Maria Garcia", 1, 7, 15, true),
  makeShift("c1", "Maria Garcia", 2, 7, 17, false),
  makeShift("c1", "Maria Garcia", 3, 7, 15, true),
  makeShift("c1", "Maria Garcia", 5, 7, 16, true),
  makeShift("c2", "Ana Rodriguez", 1, 15, 23, true),
  makeShift("c2", "Ana Rodriguez", 2, 7, 15, true),
  makeShift("c2", "Ana Rodriguez", 4, 7, 16, false),
  makeShift("c3", "David Chen", 1, 7, 7, true, true),
  makeShift("c3", "David Chen", 3, 7, 15, false),
  makeShift("c3", "David Chen", 5, 15, 23, true),
];

// Pay periods
export const MOCK_PAY_PERIODS: PayPeriod[] = (() => {
  const periods: PayPeriod[] = [];
  const current = new Date(now);
  // Current bi-weekly period
  const dayOfMonth = current.getDate();
  const periodStart1 = new Date(current.getFullYear(), current.getMonth(), dayOfMonth <= 15 ? 1 : 16);
  const periodEnd1 = new Date(current.getFullYear(), current.getMonth(), dayOfMonth <= 15 ? 15 : new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate());
  const payDate1 = new Date(periodEnd1);
  payDate1.setDate(payDate1.getDate() + 5);

  periods.push({
    id: "pp-current",
    startDate: periodStart1,
    endDate: periodEnd1,
    payDate: payDate1,
    label: `${periodStart1.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${periodEnd1.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
  });

  // Previous period
  const prevEnd = new Date(periodStart1);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() <= 15 ? 1 : 16);
  const prevPayDate = new Date(prevEnd);
  prevPayDate.setDate(prevPayDate.getDate() + 5);

  periods.push({
    id: "pp-prev",
    startDate: prevStart,
    endDate: prevEnd,
    payDate: prevPayDate,
    label: `${prevStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${prevEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
  });

  return periods;
})();

// Past pay runs (simulated)
export const MOCK_PAST_PAY_RUNS: PayRun[] = [];
