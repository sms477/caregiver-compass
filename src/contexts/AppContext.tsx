import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Shift, ADLReport, EMARRecord, SleepInterruption, UserRole, Employee, PayRun, PayStub, GeoLocation } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface AppState {
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
  currentCaregiverId: string;
  setCurrentCaregiverId: (id: string) => void;
  shifts: Shift[];
  activeShift: Shift | null;
  clockIn: (is24Hour: boolean) => void;
  clockOut: (mealBreakTaken: boolean, mealBreakReason: string | null, secondMealBreakTaken?: boolean | null, secondMealBreakReason?: string | null) => void;
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
  addPayRun: (run: PayRun) => Promise<PayRun | undefined>;
  updatePayRunStatus: (id: string, status: PayRun["status"]) => void;
  payStubs: PayStub[];
  addPayStubs: (stubs: PayStub[]) => Promise<void>;
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

  // Helper: convert DB row to Shift
  const dbToShift = (row: any): Shift => ({
    id: row.id,
    caregiverId: row.caregiver_id,
    caregiverName: row.caregiver_name,
    clockIn: new Date(row.clock_in),
    clockOut: row.clock_out ? new Date(row.clock_out) : null,
    clockInLocation: row.clock_in_location || null,
    clockOutLocation: row.clock_out_location || null,
    is24Hour: row.is_24_hour,
    mealBreakTaken: row.meal_break_taken,
    mealBreakReason: row.meal_break_reason,
    secondMealBreakTaken: row.second_meal_break_taken ?? null,
    secondMealBreakReason: row.second_meal_break_reason ?? null,
    sleepStart: row.sleep_start ? new Date(row.sleep_start) : null,
    sleepEnd: row.sleep_end ? new Date(row.sleep_end) : null,
    sleepInterruptions: (row.sleep_interruptions || []).map((si: any) => ({
      ...si,
      wakeTime: new Date(si.wakeTime),
      resumeTime: si.resumeTime ? new Date(si.resumeTime) : null,
    })),
    adlReports: row.adl_reports || [],
    emarRecords: (row.emar_records || []).map((r: any) => ({
      ...r,
      administeredAt: new Date(r.administeredAt),
    })),
  });

  // Helper: push active shift updates to DB
  const syncShiftToDB = async (shift: Shift) => {
    await supabase
      .from("shifts")
      .update({
        clock_out: shift.clockOut?.toISOString() || null,
        clock_in_location: shift.clockInLocation ? JSON.parse(JSON.stringify(shift.clockInLocation)) as Json : null,
        clock_out_location: shift.clockOutLocation ? JSON.parse(JSON.stringify(shift.clockOutLocation)) as Json : null,
        meal_break_taken: shift.mealBreakTaken,
        meal_break_reason: shift.mealBreakReason,
        second_meal_break_taken: shift.secondMealBreakTaken,
        second_meal_break_reason: shift.secondMealBreakReason,
        sleep_start: shift.sleepStart?.toISOString() || null,
        sleep_end: shift.sleepEnd?.toISOString() || null,
        sleep_interruptions: JSON.parse(JSON.stringify(shift.sleepInterruptions)) as Json,
        adl_reports: JSON.parse(JSON.stringify(shift.adlReports)) as Json,
        emar_records: JSON.parse(JSON.stringify(shift.emarRecords)) as Json,
      } as any)
      .eq("id", shift.id);
  };

  const refreshEmployees = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*");
    if (data && !error) {
      const mapped: Employee[] = data.map((p) => ({
        id: p.user_id,
        name: p.display_name,
        email: "",
        phone: p.phone || "",
        workerType: ((p as any).worker_type as Employee["workerType"]) || "employee",
        workState: ((p as any).work_state as Employee["workState"]) || "CA",
        payType: ((p as any).pay_type as Employee["payType"]) || "hourly",
        hourlyRate: Number(p.hourly_rate) || 0,
        annualSalary: Number((p as any).annual_salary) || 0,
        shiftDifferentials: ((p as any).shift_differentials as Employee["shiftDifferentials"]) || [],
        filingStatus: (p.filing_status as Employee["filingStatus"]) || "single",
        federalAllowances: p.federal_allowances || 1,
        stateAllowances: p.state_allowances || 1,
        w4: ((p as any).w4 as Employee["w4"]) || { additionalWithholding: 0, isExempt: false },
        deductions: ((p as any).deductions as Employee["deductions"]) || [],
        bankInfo: (p as any).bank_name ? {
          bankName: (p as any).bank_name,
          routingNumber: (p as any).bank_routing_number || "",
          accountNumber: (p as any).bank_account_number || "",
          accountType: ((p as any).bank_account_type as "checking" | "savings") || "checking",
        } : null,
        startDate: p.start_date || p.created_at,
        role: p.job_title || "Caregiver",
      }));
      setEmployees(mapped);
    }
  }, []);

  // Load pay runs from DB
  const refreshPayRuns = useCallback(async () => {
    const { data, error } = await supabase
      .from("pay_runs")
      .select("*")
      .order("created_at", { ascending: false });
    if (data && !error) {
      const mapped: PayRun[] = data.map((r: any) => ({
        id: r.id,
        payPeriod: {
          ...r.pay_period,
          startDate: new Date(r.pay_period.startDate),
          endDate: new Date(r.pay_period.endDate),
          payDate: new Date(r.pay_period.payDate),
        },
        runType: r.run_type || "regular",
        status: r.status,
        lineItems: r.line_items || [],
        totalGrossPay: Number(r.total_gross_pay),
        totalTaxes: Number(r.total_taxes),
        totalNetPay: Number(r.total_net_pay),
        approvedAt: r.approved_at ? new Date(r.approved_at) : null,
        createdAt: new Date(r.created_at),
      }));
      setPayRuns(mapped);
    }
  }, []);

  // Load pay stubs from DB
  const refreshPayStubs = useCallback(async () => {
    const { data, error } = await supabase
      .from("pay_stubs")
      .select("*")
      .order("created_at", { ascending: false });
    if (data && !error) {
      const mapped: PayStub[] = data.map((s: any) => ({
        id: s.id,
        payRunId: s.pay_run_id,
        employeeId: s.employee_id,
        employeeName: s.employee_name,
        payPeriod: {
          ...s.pay_period,
          startDate: new Date(s.pay_period.startDate),
          endDate: new Date(s.pay_period.endDate),
          payDate: new Date(s.pay_period.payDate),
        },
        lineItem: s.line_item,
        paidAt: new Date(s.paid_at),
      }));
      setPayStubs(mapped);
    }
  }, []);

  // Load shifts from DB
  const refreshShifts = useCallback(async () => {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .order("clock_in", { ascending: false });
    if (data && !error) {
      const mapped = data.map(dbToShift);
      // Separate active (no clock_out) from completed
      const active = mapped.find(s => !s.clockOut && s.caregiverId === currentCaregiverId);
      const completed = mapped.filter(s => s.clockOut);
      setShifts(completed);
      setActiveShift(active || null);
    }
  }, [currentCaregiverId]);

  useEffect(() => {
    refreshEmployees();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        setCurrentCaregiverId(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setCurrentCaregiverId(session.user.id);
        // Load pay data once authenticated
        refreshPayRuns();
        refreshPayStubs();
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshEmployees, refreshPayRuns, refreshPayStubs]);

  // Load shifts once we know the caregiver ID
  useEffect(() => {
    if (currentCaregiverId) {
      refreshShifts();
    }
  }, [currentCaregiverId, refreshShifts]);

  const caregiverName = employees.find(c => c.id === currentCaregiverId)?.name || "Unknown";

  // Helper: get current GPS position
  const getGeoLocation = (): Promise<GeoLocation | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const clockIn = useCallback(async (is24Hour: boolean) => {
    const location = await getGeoLocation();

    const { data, error } = await supabase
      .from("shifts")
      .insert({
        caregiver_id: currentCaregiverId,
        caregiver_name: caregiverName,
        clock_in: new Date().toISOString(),
        is_24_hour: is24Hour,
        clock_in_location: location ? (JSON.parse(JSON.stringify(location)) as Json) : null,
      } as any)
      .select()
      .single();

    if (data && !error) {
      setActiveShift(dbToShift(data));
    }
  }, [currentCaregiverId, caregiverName]);

  const clockOut = useCallback(async (mealBreakTaken: boolean, mealBreakReason: string | null, secondMealBreakTaken?: boolean | null, secondMealBreakReason?: string | null) => {
    if (!activeShift) return;
    const location = await getGeoLocation();
    const completed: Shift = {
      ...activeShift,
      clockOut: new Date(),
      clockOutLocation: location,
      mealBreakTaken,
      mealBreakReason,
      secondMealBreakTaken: secondMealBreakTaken ?? null,
      secondMealBreakReason: secondMealBreakReason ?? null,
    };
    await syncShiftToDB(completed);
    setShifts(prev => [completed, ...prev]);
    setActiveShift(null);
  }, [activeShift]);

  const startSleep = useCallback(async () => {
    if (!activeShift) return;
    const updated = { ...activeShift, sleepStart: new Date() };
    setActiveShift(updated);
    await syncShiftToDB(updated);
  }, [activeShift]);

  const endSleep = useCallback(async () => {
    if (!activeShift) return;
    const updated = { ...activeShift, sleepEnd: new Date() };
    setActiveShift(updated);
    await syncShiftToDB(updated);
  }, [activeShift]);

  const logSleepInterruption = useCallback(async (reason: string) => {
    if (!activeShift) return;
    const interruption: SleepInterruption = { id: `si-${Date.now()}`, wakeTime: new Date(), resumeTime: null, reason };
    const updated = { ...activeShift, sleepInterruptions: [...activeShift.sleepInterruptions, interruption] };
    setActiveShift(updated);
    await syncShiftToDB(updated);
  }, [activeShift]);

  const resumeSleep = useCallback(async () => {
    if (!activeShift) return;
    const interruptions = [...activeShift.sleepInterruptions];
    const last = interruptions[interruptions.length - 1];
    if (last && !last.resumeTime) interruptions[interruptions.length - 1] = { ...last, resumeTime: new Date() };
    const updated = { ...activeShift, sleepInterruptions: interruptions };
    setActiveShift(updated);
    await syncShiftToDB(updated);
  }, [activeShift]);

  const addADLReport = useCallback(async (report: ADLReport) => {
    if (!activeShift) return;
    const updated = { ...activeShift, adlReports: [...activeShift.adlReports.filter(r => r.residentId !== report.residentId), report] };
    setActiveShift(updated);
    await syncShiftToDB(updated);
  }, [activeShift]);

  const addEMARRecord = useCallback(async (record: Omit<EMARRecord, "id">) => {
    if (!activeShift) return;
    const full: EMARRecord = { ...record, id: `em-${Date.now()}` };
    const updated = { ...activeShift, emarRecords: [...activeShift.emarRecords, full] };
    setActiveShift(updated);
    await syncShiftToDB(updated);
  }, [activeShift]);

  const updateEmployee = useCallback(async (emp: Employee) => {
    await supabase
      .from("profiles")
      .update({
        hourly_rate: emp.hourlyRate,
        filing_status: emp.filingStatus,
        federal_allowances: emp.federalAllowances,
        state_allowances: emp.stateAllowances,
        phone: emp.phone,
        job_title: emp.role,
        pay_type: emp.payType,
        worker_type: emp.workerType,
        work_state: emp.workState,
        annual_salary: emp.annualSalary,
        shift_differentials: JSON.parse(JSON.stringify(emp.shiftDifferentials)),
        w4: JSON.parse(JSON.stringify(emp.w4)),
        deductions: JSON.parse(JSON.stringify(emp.deductions)),
        bank_name: emp.bankInfo?.bankName || null,
        bank_routing_number: emp.bankInfo?.routingNumber || null,
        bank_account_number: emp.bankInfo?.accountNumber || null,
        bank_account_type: emp.bankInfo?.accountType || 'checking',
      } as any)
      .eq("user_id", emp.id);
    setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  }, []);

  const addPayRun = useCallback(async (run: PayRun) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("pay_runs")
      .insert({
        pay_period: JSON.parse(JSON.stringify(run.payPeriod)) as Json,
        status: run.status,
        line_items: JSON.parse(JSON.stringify(run.lineItems)) as Json,
        total_gross_pay: run.totalGrossPay,
        total_taxes: run.totalTaxes,
        total_net_pay: run.totalNetPay,
        created_by: userId,
      } as any)
      .select()
      .single();

    if (data && !error) {
      const saved = { ...run, id: data.id };
      setPayRuns(prev => [saved, ...prev]);

      // Log audit entry
      await supabase.from("payroll_audit_log").insert({
        pay_run_id: data.id,
        action: "pay_run_created",
        performed_by: userId,
        details: { status: run.status, totalGrossPay: run.totalGrossPay, employeeCount: run.lineItems.length } as unknown as Json,
      } as any);

      return saved;
    }
    // Fallback to local state
    setPayRuns(prev => [run, ...prev]);
    return run;
  }, []);

  const updatePayRunStatus = useCallback(async (id: string, status: PayRun["status"]) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;

    const approvedAt = (status === "approved" || status === "paid") ? new Date().toISOString() : null;

    await supabase
      .from("pay_runs")
      .update({
        status,
        approved_at: approvedAt,
        approved_by: (status === "approved" || status === "paid") ? userId : null,
      } as any)
      .eq("id", id);

    setPayRuns(prev => prev.map(r =>
      r.id === id ? { ...r, status, approvedAt: approvedAt ? new Date(approvedAt) : r.approvedAt } : r
    ));

    // Audit log
    if (userId) {
      await supabase.from("payroll_audit_log").insert({
        pay_run_id: id,
        action: `status_changed_to_${status}`,
        performed_by: userId,
        details: { newStatus: status } as unknown as Json,
      } as any);
    }
  }, []);

  const addPayStubs = useCallback(async (stubs: PayStub[]) => {
    // Persist to DB
    const rows = stubs.map(s => ({
      pay_run_id: s.payRunId,
      employee_id: s.employeeId,
      employee_name: s.employeeName,
      pay_period: JSON.parse(JSON.stringify(s.payPeriod)) as Json,
      line_item: JSON.parse(JSON.stringify(s.lineItem)) as Json,
      paid_at: s.paidAt instanceof Date ? s.paidAt.toISOString() : s.paidAt,
    }));

    const { data, error } = await supabase
      .from("pay_stubs")
      .insert(rows as any)
      .select();

    if (data && !error) {
      const saved: PayStub[] = data.map((d: any) => ({
        id: d.id,
        payRunId: d.pay_run_id,
        employeeId: d.employee_id,
        employeeName: d.employee_name,
        payPeriod: d.pay_period,
        lineItem: d.line_item,
        paidAt: new Date(d.paid_at),
      }));
      setPayStubs(prev => [...saved, ...prev]);
    } else {
      setPayStubs(prev => [...stubs, ...prev]);
    }
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
