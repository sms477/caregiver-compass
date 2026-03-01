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
  schedule: string; // e.g., "Morning", "Evening"
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
