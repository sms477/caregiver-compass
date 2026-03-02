import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Shift, ADLReport, EMARRecord, SleepInterruption, UserRole, Employee, PayRun, PayStub } from "@/types";
import { supabase } from "@/integrations/supabase/client";

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
  employees: Employee[];
  refreshEmployees: () => Promise<void>;
  updateEmployee: (emp: Employee) => void;
  payRuns: PayRun[];
  addPayRun: (run: PayRun) => void;
  updatePayRunStatus: (id: string, status: PayRun["status"]) => void;
  payStubs: PayStub[];
  addPayStubs: (stubs: PayStub[]) => void;
}

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentCaregiverId, setCurrentCaregiverId] = useState("");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payRuns, setPayRuns] = useState<PayRun[]>([]);
  const [payStubs, setPayStubs] = useState<PayStub[]>([]);

  const refreshEmployees = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*");
    if (data && !error) {
      const mapped: Employee[] = data.map((p) => ({
        id: p.user_id,
        name: p.display_name,
        email: "", // email is in auth.users, not exposed
        phone: p.phone || "",
        hourlyRate: Number(p.hourly_rate) || 0,
        filingStatus: (p.filing_status as Employee["filingStatus"]) || "single",
        federalAllowances: p.federal_allowances || 1,
        stateAllowances: p.state_allowances || 1,
        startDate: p.start_date || p.created_at,
        role: p.job_title || "Caregiver",
      }));
      setEmployees(mapped);
    }
  }, []);

  useEffect(() => {
    refreshEmployees();
  }, [refreshEmployees]);

  const caregiverName = employees.find(c => c.id === currentCaregiverId)?.name || "Unknown";

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
    const completed: Shift = { ...activeShift, clockOut: new Date(), mealBreakTaken, mealBreakReason };
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
    const interruption: SleepInterruption = { id: `si-${Date.now()}`, wakeTime: new Date(), resumeTime: null, reason };
    setActiveShift(prev => prev ? { ...prev, sleepInterruptions: [...prev.sleepInterruptions, interruption] } : null);
  }, [activeShift]);

  const resumeSleep = useCallback(() => {
    if (!activeShift) return;
    setActiveShift(prev => {
      if (!prev) return null;
      const interruptions = [...prev.sleepInterruptions];
      const last = interruptions[interruptions.length - 1];
      if (last && !last.resumeTime) interruptions[interruptions.length - 1] = { ...last, resumeTime: new Date() };
      return { ...prev, sleepInterruptions: interruptions };
    });
  }, [activeShift]);

  const addADLReport = useCallback((report: ADLReport) => {
    if (!activeShift) return;
    setActiveShift(prev => prev ? { ...prev, adlReports: [...prev.adlReports.filter(r => r.residentId !== report.residentId), report] } : null);
  }, [activeShift]);

  const addEMARRecord = useCallback((record: Omit<EMARRecord, "id">) => {
    if (!activeShift) return;
    const full: EMARRecord = { ...record, id: `em-${Date.now()}` };
    setActiveShift(prev => prev ? { ...prev, emarRecords: [...prev.emarRecords, full] } : null);
  }, [activeShift]);

  const updateEmployee = useCallback(async (emp: Employee) => {
    // Update in DB
    await supabase
      .from("profiles")
      .update({
        hourly_rate: emp.hourlyRate,
        filing_status: emp.filingStatus,
        federal_allowances: emp.federalAllowances,
        state_allowances: emp.stateAllowances,
        phone: emp.phone,
        job_title: emp.role,
      })
      .eq("user_id", emp.id);
    setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  }, []);

  const addPayRun = useCallback((run: PayRun) => {
    setPayRuns(prev => [run, ...prev]);
  }, []);

  const updatePayRunStatus = useCallback((id: string, status: PayRun["status"]) => {
    setPayRuns(prev => prev.map(r => r.id === id ? { ...r, status, approvedAt: status === "approved" || status === "paid" ? new Date() : r.approvedAt } : r));
  }, []);

  const addPayStubs = useCallback((stubs: PayStub[]) => {
    setPayStubs(prev => [...stubs, ...prev]);
  }, []);

  return (
    <AppContext.Provider value={{
      role, setRole,
      currentCaregiverId, setCurrentCaregiverId,
      shifts, activeShift,
      clockIn, clockOut,
      startSleep, endSleep, logSleepInterruption, resumeSleep,
      addADLReport, addEMARRecord,
      employees, refreshEmployees, updateEmployee,
      payRuns, addPayRun, updatePayRunStatus,
      payStubs, addPayStubs,
    }}>
      {children}
    </AppContext.Provider>
  );
};
