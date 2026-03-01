import { Resident, Shift } from "@/types";

export const MOCK_RESIDENTS: Resident[] = [
  {
    id: "r1",
    name: "John Doe",
    room: "Room 1",
    medications: [
      { id: "m1", name: "Lisinopril", dosage: "10mg", schedule: "Morning" },
      { id: "m2", name: "Metformin", dosage: "500mg", schedule: "Morning" },
    ],
  },
  {
    id: "r2",
    name: "Mary Smith",
    room: "Room 2",
    medications: [
      { id: "m3", name: "Amlodipine", dosage: "5mg", schedule: "Evening" },
    ],
  },
  {
    id: "r3",
    name: "Robert Johnson",
    room: "Room 3",
    medications: [
      { id: "m4", name: "Omeprazole", dosage: "20mg", schedule: "Morning" },
      { id: "m5", name: "Aspirin", dosage: "81mg", schedule: "Morning" },
    ],
  },
  {
    id: "r4",
    name: "Linda Williams",
    room: "Room 4",
    medications: [
      { id: "m6", name: "Levothyroxine", dosage: "50mcg", schedule: "Morning" },
    ],
  },
  {
    id: "r5",
    name: "James Brown",
    room: "Room 5",
    medications: [
      { id: "m7", name: "Atorvastatin", dosage: "20mg", schedule: "Evening" },
    ],
  },
  {
    id: "r6",
    name: "Patricia Davis",
    room: "Room 6",
    medications: [
      { id: "m8", name: "Donepezil", dosage: "5mg", schedule: "Evening" },
      { id: "m9", name: "Sertraline", dosage: "50mg", schedule: "Morning" },
    ],
  },
];

export const MOCK_CAREGIVERS = [
  { id: "c1", name: "Maria Garcia" },
  { id: "c2", name: "Ana Rodriguez" },
  { id: "c3", name: "David Chen" },
];

// Generate some past shifts for the admin dashboard demo
const now = new Date();
const day = (d: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - d);
  return date;
};

const makeShift = (
  caregiverId: string,
  caregiverName: string,
  daysAgo: number,
  startHour: number,
  endHour: number,
  mealBreak: boolean,
  is24: boolean = false
): Shift => {
  const clockIn = new Date(day(daysAgo));
  clockIn.setHours(startHour, 0, 0, 0);
  const clockOut = new Date(day(is24 ? daysAgo - 1 : daysAgo));
  clockOut.setHours(endHour, 0, 0, 0);
  return {
    id: `s-${caregiverId}-${daysAgo}-${startHour}`,
    caregiverId,
    caregiverName,
    clockIn,
    clockOut,
    is24Hour: is24,
    mealBreakTaken: mealBreak,
    mealBreakReason: mealBreak ? null : "Resident emergency",
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
  makeShift("c2", "Ana Rodriguez", 1, 15, 23, true),
  makeShift("c2", "Ana Rodriguez", 2, 7, 15, true),
  makeShift("c3", "David Chen", 1, 7, 7, true, true),
  makeShift("c3", "David Chen", 3, 7, 15, false),
];
