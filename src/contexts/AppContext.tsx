import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Shift, ADLReport, EMARRecord, SleepInterruption, UserRole } from "@/types";
import { MOCK_SHIFTS, MOCK_CAREGIVERS } from "@/data/mockData";

interface AppState {
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
  currentCaregiverId: string;
  setCurrentCaregiverId: (id: string) => void;
  shifts: Shift[];
  activeShift: Shift | null;
  clockIn: (is24Hour: boolean) => void;
  clockOut: (mealBreakTaken: boolean, mealBreakReason: string | null) => void;
  startSleep: () => void;
  endSleep: () => void;
  logSleepInterruption: (reason: string) => void;
  resumeSleep: () => void;
  addADLReport: (report: ADLReport) => void;
  addEMARRecord: (record: Omit<EMARRecord, "id">) => void;
}

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentCaregiverId, setCurrentCaregiverId] = useState(MOCK_CAREGIVERS[0].id);
  const [shifts, setShifts] = useState<Shift[]>(MOCK_SHIFTS);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);

  const caregiverName = MOCK_CAREGIVERS.find(c => c.id === currentCaregiverId)?.name || "Unknown";

  const clockIn = useCallback((is24Hour: boolean) => {
    const newShift: Shift = {
      id: `s-${Date.now()}`,
      caregiverId: currentCaregiverId,
      caregiverName: caregiverName,
      clockIn: new Date(),
      clockOut: null,
      is24Hour,
      mealBreakTaken: null,
      mealBreakReason: null,
      sleepStart: null,
      sleepEnd: null,
      sleepInterruptions: [],
      adlReports: [],
      emarRecords: [],
    };
    setActiveShift(newShift);
  }, [currentCaregiverId, caregiverName]);

  const clockOut = useCallback((mealBreakTaken: boolean, mealBreakReason: string | null) => {
    if (!activeShift) return;
    const completed: Shift = {
      ...activeShift,
      clockOut: new Date(),
      mealBreakTaken,
      mealBreakReason,
    };
    setShifts(prev => [completed, ...prev]);
    setActiveShift(null);
  }, [activeShift]);

  const startSleep = useCallback(() => {
    if (!activeShift) return;
    setActiveShift(prev => prev ? { ...prev, sleepStart: new Date() } : null);
  }, [activeShift]);

  const endSleep = useCallback(() => {
    if (!activeShift) return;
    setActiveShift(prev => prev ? { ...prev, sleepEnd: new Date() } : null);
  }, [activeShift]);

  const logSleepInterruption = useCallback((reason: string) => {
    if (!activeShift) return;
    const interruption: SleepInterruption = {
      id: `si-${Date.now()}`,
      wakeTime: new Date(),
      resumeTime: null,
      reason,
    };
    setActiveShift(prev => prev ? {
      ...prev,
      sleepInterruptions: [...prev.sleepInterruptions, interruption],
    } : null);
  }, [activeShift]);

  const resumeSleep = useCallback(() => {
    if (!activeShift) return;
    setActiveShift(prev => {
      if (!prev) return null;
      const interruptions = [...prev.sleepInterruptions];
      const last = interruptions[interruptions.length - 1];
      if (last && !last.resumeTime) {
        interruptions[interruptions.length - 1] = { ...last, resumeTime: new Date() };
      }
      return { ...prev, sleepInterruptions: interruptions };
    });
  }, [activeShift]);

  const addADLReport = useCallback((report: ADLReport) => {
    if (!activeShift) return;
    setActiveShift(prev => prev ? {
      ...prev,
      adlReports: [...prev.adlReports.filter(r => r.residentId !== report.residentId), report],
    } : null);
  }, [activeShift]);

  const addEMARRecord = useCallback((record: Omit<EMARRecord, "id">) => {
    if (!activeShift) return;
    const full: EMARRecord = { ...record, id: `em-${Date.now()}` };
    setActiveShift(prev => prev ? {
      ...prev,
      emarRecords: [...prev.emarRecords, full],
    } : null);
  }, [activeShift]);

  return (
    <AppContext.Provider value={{
      role, setRole,
      currentCaregiverId, setCurrentCaregiverId,
      shifts, activeShift,
      clockIn, clockOut,
      startSleep, endSleep, logSleepInterruption, resumeSleep,
      addADLReport, addEMARRecord,
    }}>
      {children}
    </AppContext.Provider>
  );
};
