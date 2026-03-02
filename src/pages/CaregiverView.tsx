import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { useResidents, DBResident } from "@/hooks/useResidents";
import { ADLReport } from "@/types";
import {
  Clock, LogOut, Moon, Sun, AlertTriangle, Check, Pill,
  ChevronLeft, ClipboardList, Activity, ArrowLeft, History,
  MapPin
} from "lucide-react";
import { toast } from "sonner";
import IncidentsView from "@/components/admin/IncidentsView";

type Tab = "clock" | "adl" | "emar" | "incidents";

const CaregiverView = () => {
  const {
    setRole, activeShift, shifts, clockIn, clockOut,
    startSleep, endSleep, logSleepInterruption, resumeSleep,
    addADLReport, addEMARRecord, currentCaregiverId,
  } = useApp();
  const { residents } = useResidents();

  const [tab, setTab] = useState<Tab>("clock");
  const [showMealPrompt, setShowMealPrompt] = useState(false);
  const [showSecondMealPrompt, setShowSecondMealPrompt] = useState(false);
  const [showClockInOptions, setShowClockInOptions] = useState(false);
  const [mealReason, setMealReason] = useState("");
  const [secondMealReason, setSecondMealReason] = useState("");
  const [wakeReason, setWakeReason] = useState("");
  const [showWakePrompt, setShowWakePrompt] = useState(false);
  // Store first meal answers while asking second
  const [firstMealTaken, setFirstMealTaken] = useState(false);
  const [firstMealReason, setFirstMealReason] = useState<string | null>(null);

  const { employees } = useApp();
  
  const caregiverName = employees.find(c => c.id === currentCaregiverId)?.name || "";
  const clockInTimeRef = useRef<Date | null>(null);

  const isSleeping = activeShift?.sleepStart && !activeShift?.sleepEnd;
  const hasActiveInterruption = activeShift?.sleepInterruptions.some(i => !i.resumeTime);

  // Track clock-in time for the confirmation message
  useEffect(() => {
    if (activeShift) {
      clockInTimeRef.current = new Date(activeShift.clockIn);
    }
  }, [activeShift]);

  const handleClockOutAttempt = () => setShowMealPrompt(true);

  // Check if shift is 10+ hours (requires second meal break)
  const shiftHours = activeShift ? (Date.now() - new Date(activeShift.clockIn).getTime()) / 3600000 : 0;
  const requiresSecondMeal = shiftHours >= 10;

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const handleMealResponse = async (taken: boolean) => {
    const shouldProceed = taken || !!mealReason;
    if (!shouldProceed) return;

    const meal1Taken = taken;
    const meal1Reason = taken ? null : mealReason;

    // If shift is 10+ hours, ask about second meal break
    if (requiresSecondMeal) {
      setFirstMealTaken(meal1Taken);
      setFirstMealReason(meal1Reason);
      setShowMealPrompt(false);
      setMealReason("");
      setShowSecondMealPrompt(true);
      return;
    }

    await finalizeClockOut(meal1Taken, meal1Reason, null, null);
  };

  const handleSecondMealResponse = async (taken: boolean) => {
    const shouldProceed = taken || !!secondMealReason;
    if (!shouldProceed) return;

    await finalizeClockOut(
      firstMealTaken,
      firstMealReason,
      taken,
      taken ? null : secondMealReason
    );
  };

  const finalizeClockOut = async (
    meal1Taken: boolean, meal1Reason: string | null,
    meal2Taken: boolean | null, meal2Reason: string | null
  ) => {
    const clockInTime = clockInTimeRef.current;
    const duration = clockInTime ? formatDuration(Date.now() - clockInTime.getTime()) : "unknown";
    const name = caregiverName || "Your";
    const adlCount = activeShift?.adlReports?.length || 0;
    const emarCount = activeShift?.emarRecords?.length || 0;

    await clockOut(meal1Taken, meal1Reason, meal2Taken, meal2Reason);
    setShowMealPrompt(false);
    setShowSecondMealPrompt(false);
    setMealReason("");
    setSecondMealReason("");

    const parts = [`${name}'s shift of ${duration} has been recorded.`];
    if (adlCount > 0) parts.push(`${adlCount} ADL report(s) logged.`);
    if (emarCount > 0) parts.push(`${emarCount} medication(s) administered.`);
    if (adlCount === 0 && emarCount === 0) parts.push("No ADL reports or medications were logged.");

    toast.success("✓ Shift logged!", {
      description: parts.join(" "),
      duration: 6000,
    });
  };

  const handleWakeUp = () => {
    if (wakeReason) {
      logSleepInterruption(wakeReason);
      setShowWakePrompt(false);
      setWakeReason("");
    }
  };

  const [elapsed, setElapsed] = useState("0h 0m");

  useEffect(() => {
    if (!activeShift) {
      setElapsed("0h 0m");
      return;
    }
    const tick = () => {
      const diff = Date.now() - new Date(activeShift.clockIn).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeShift]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => setRole(null)} className="flex items-center gap-1 text-muted-foreground text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="font-display font-bold text-foreground">CareGuard</h1>
        <span className="text-sm font-medium text-foreground">{caregiverName}</span>
      </header>

      {/* Tab Bar */}
      <div className="flex border-b border-border bg-card">
        {([
          ...(activeShift ? [
            { key: "clock" as Tab, icon: Clock, label: "Shift" },
            { key: "adl" as Tab, icon: ClipboardList, label: "ADLs" },
            { key: "emar" as Tab, icon: Pill, label: "eMAR" },
          ] : [
            { key: "incidents" as Tab, icon: AlertTriangle, label: "Incidents" },
          ]),
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
              tab === key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
        {tab === "incidents" ? (
          <IncidentsView staffOnly={{ id: currentCaregiverId, name: caregiverName }} />
        ) : !activeShift ? (
          <ClockInView
            showOptions={showClockInOptions}
            setShowOptions={setShowClockInOptions}
            onClockIn={(is24) => { clockIn(is24); setTab("clock"); }}
          />
        ) : tab === "clock" ? (
          <>
            <ShiftView
              elapsed={elapsed}
              shift={activeShift}
              isSleeping={!!isSleeping}
              hasActiveInterruption={!!hasActiveInterruption}
              showMealPrompt={showMealPrompt}
              mealReason={mealReason}
              setMealReason={setMealReason}
              showWakePrompt={showWakePrompt}
              wakeReason={wakeReason}
              setWakeReason={setWakeReason}
              onClockOut={handleClockOutAttempt}
              onMealResponse={handleMealResponse}
              onStartSleep={startSleep}
              onEndSleep={endSleep}
              onWakeUp={handleWakeUp}
              onResumeSleep={resumeSleep}
              setShowMealPrompt={setShowMealPrompt}
              setShowWakePrompt={setShowWakePrompt}
            />

            {/* Second Meal Break Attestation */}
            {showSecondMealPrompt && (
              <div className="glass-card rounded-xl p-5 space-y-4 border-2 border-warning">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <h3 className="font-display font-bold text-foreground">Second Meal Break</h3>
                </div>
                <p className="text-sm text-foreground">
                  Your shift is over 10 hours. Did you take a <strong>second uninterrupted, 30-minute</strong> meal break?
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleSecondMealResponse(true)}
                    className="w-full touch-target rounded-lg bg-success text-success-foreground font-semibold py-3 active:scale-[0.97] transition-transform"
                  >
                    <Check className="w-5 h-5 inline mr-2" /> Yes, I took my second break
                  </button>
                  <div className="space-y-2">
                    <input
                      value={secondMealReason}
                      onChange={(e) => setSecondMealReason(e.target.value)}
                      placeholder="Reason second break was missed..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-warning focus:outline-none"
                    />
                    <button
                      onClick={() => handleSecondMealResponse(false)}
                      disabled={!secondMealReason}
                      className="w-full touch-target rounded-lg bg-warning text-warning-foreground font-semibold py-3 disabled:opacity-50 active:scale-[0.97] transition-transform"
                    >
                      No — Submit Reason
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { setShowSecondMealPrompt(false); setSecondMealReason(""); }}
                  className="w-full text-muted-foreground text-sm py-1"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        ) : tab === "adl" ? (
          <ADLView onSave={addADLReport} existingReports={activeShift.adlReports} residents={residents} />
        ) : (
          <EMARView
            onAdminister={addEMARRecord}
            records={activeShift.emarRecords}
            caregiverId={currentCaregiverId}
            residents={residents}
          />
        )}
      </main>
    </div>
  );
};

/* ---- Sub-Views ---- */

function ClockInView({ showOptions, setShowOptions, onClockIn }: {
  showOptions: boolean;
  setShowOptions: (v: boolean) => void;
  onClockIn: (is24: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-slide-up">
      <div className="text-center space-y-2">
        <Clock className="w-12 h-12 text-primary mx-auto" />
        <h2 className="text-2xl font-display font-bold text-foreground">Ready to Start?</h2>
        <p className="text-muted-foreground text-sm">Tap below to begin your shift</p>
      </div>

      {!showOptions ? (
        <button
          onClick={() => setShowOptions(true)}
          className="touch-target w-48 h-48 rounded-full bg-primary text-primary-foreground font-display font-bold text-xl shadow-lg animate-pulse-glow transition-transform active:scale-95 flex items-center justify-center"
        >
          CLOCK IN
        </button>
      ) : (
        <div className="space-y-3 w-full max-w-xs">
          <button
            onClick={() => onClockIn(false)}
            className="w-full touch-target rounded-xl bg-primary text-primary-foreground font-semibold py-4 text-lg shadow-md active:scale-[0.97] transition-transform"
          >
            Standard Shift
          </button>
          <button
            onClick={() => onClockIn(true)}
            className="w-full touch-target rounded-xl bg-card border-2 border-primary text-primary font-semibold py-4 text-lg active:scale-[0.97] transition-transform"
          >
            24-Hour Shift
          </button>
          <button
            onClick={() => setShowOptions(false)}
            className="w-full text-muted-foreground text-sm py-2"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function ShiftView(props: {
  elapsed: string;
  shift: any;
  isSleeping: boolean;
  hasActiveInterruption: boolean;
  showMealPrompt: boolean;
  mealReason: string;
  setMealReason: (v: string) => void;
  showWakePrompt: boolean;
  wakeReason: string;
  setWakeReason: (v: string) => void;
  onClockOut: () => void;
  onMealResponse: (taken: boolean) => void;
  onStartSleep: () => void;
  onEndSleep: () => void;
  onWakeUp: () => void;
  onResumeSleep: () => void;
  setShowMealPrompt: (v: boolean) => void;
  setShowWakePrompt: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4 animate-slide-up">
      {/* Shift Timer */}
      <div className="glass-card rounded-xl p-6 text-center space-y-2">
        <p className="text-sm text-muted-foreground font-medium">Shift Duration</p>
        <p className="text-4xl font-display font-bold text-foreground">{props.elapsed}</p>
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-success font-medium">
            {props.shift.is24Hour ? "24-Hour Shift" : "Standard Shift"} — Active
          </span>
        </div>
        {props.shift.clockInLocation && (
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>Location verified at clock-in</span>
          </div>
        )}
      </div>

      {/* Sleep Controls (24-hr only) */}
      {props.shift.is24Hour && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Sleep Tracker</h3>
          </div>

          {!props.shift.sleepStart ? (
            <button
              onClick={props.onStartSleep}
              className="w-full touch-target rounded-lg bg-secondary text-secondary-foreground font-medium py-3 active:scale-[0.97] transition-transform"
            >
              <Moon className="w-5 h-5 inline mr-2" /> Start Sleep Block
            </button>
          ) : props.isSleeping ? (
            <div className="space-y-3">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                <p className="text-sm text-primary font-medium">💤 Sleep block in progress</p>
              </div>
              {props.hasActiveInterruption ? (
                <button
                  onClick={props.onResumeSleep}
                  className="w-full touch-target rounded-lg bg-primary text-primary-foreground font-medium py-3 active:scale-[0.97] transition-transform"
                >
                  Resume Sleep
                </button>
              ) : (
                <>
                  {!props.showWakePrompt ? (
                    <button
                      onClick={() => props.setShowWakePrompt(true)}
                      className="w-full touch-target rounded-lg bg-destructive text-destructive-foreground font-bold py-4 text-lg active:scale-[0.97] transition-transform"
                    >
                      <AlertTriangle className="w-5 h-5 inline mr-2" /> EMERGENCY WAKE UP
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <input
                        value={props.wakeReason}
                        onChange={(e) => props.setWakeReason(e.target.value)}
                        placeholder="Reason (e.g., Resident fall)"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-destructive focus:outline-none"
                      />
                      <button
                        onClick={props.onWakeUp}
                        disabled={!props.wakeReason}
                        className="w-full touch-target rounded-lg bg-destructive text-destructive-foreground font-medium py-3 disabled:opacity-50 active:scale-[0.97] transition-transform"
                      >
                        Log Interruption
                      </button>
                    </div>
                  )}
                </>
              )}
              <button
                onClick={props.onEndSleep}
                className="w-full rounded-lg border border-border text-muted-foreground font-medium py-2 text-sm"
              >
                <Sun className="w-4 h-4 inline mr-1" /> End Sleep Block
              </button>
            </div>
          ) : (
            <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-center">
              <p className="text-sm text-success font-medium">
                ✓ Sleep block completed — {props.shift.sleepInterruptions.length} interruption(s)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Clock Out */}
      {!props.showMealPrompt ? (
        <button
          onClick={props.onClockOut}
          className="w-full touch-target rounded-xl bg-destructive/10 border-2 border-destructive text-destructive font-semibold py-4 text-lg active:scale-[0.97] transition-transform"
        >
          <LogOut className="w-5 h-5 inline mr-2" /> Clock Out
        </button>
      ) : (
        <div className="glass-card rounded-xl p-5 space-y-4 border-2 border-warning">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="font-display font-bold text-foreground">Meal Break Attestation</h3>
          </div>
          <p className="text-sm text-foreground">
            Did you take an <strong>uninterrupted, 30-minute, off-duty</strong> meal break during this shift?
          </p>
          <div className="space-y-2">
            <button
              onClick={() => props.onMealResponse(true)}
              className="w-full touch-target rounded-lg bg-success text-success-foreground font-semibold py-3 active:scale-[0.97] transition-transform"
            >
              <Check className="w-5 h-5 inline mr-2" /> Yes, I took my break
            </button>
            <div className="space-y-2">
              <input
                value={props.mealReason}
                onChange={(e) => props.setMealReason(e.target.value)}
                placeholder="Reason break was missed..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-warning focus:outline-none"
              />
              <button
                onClick={() => props.onMealResponse(false)}
                disabled={!props.mealReason}
                className="w-full touch-target rounded-lg bg-warning text-warning-foreground font-semibold py-3 disabled:opacity-50 active:scale-[0.97] transition-transform"
              >
                No — Submit Reason
              </button>
            </div>
          </div>
          <button
            onClick={() => props.setShowMealPrompt(false)}
            className="w-full text-muted-foreground text-sm py-1"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function ADLView({ onSave, existingReports, residents }: {
  onSave: (r: ADLReport) => void;
  existingReports: ADLReport[];
  residents: DBResident[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ADLReport, "residentId">>({
    bathing: false, dressing: false, eating: false, mobility: false, toileting: false, notes: "",
  });

  const resident = residents.find(r => r.id === selected);
  const saved = existingReports.find(r => r.residentId === selected);

  const handleSave = () => {
    if (!selected) return;
    onSave({ ...form, residentId: selected });
    setSelected(null);
    setForm({ bathing: false, dressing: false, eating: false, mobility: false, toileting: false, notes: "" });
  };

  if (selected && resident) {
    return (
      <div className="space-y-4 animate-slide-up">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-muted-foreground text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to residents
        </button>
        <h2 className="text-xl font-display font-bold text-foreground">{resident.name} — ADL Report</h2>
        <div className="space-y-3">
          {(["bathing", "dressing", "eating", "mobility", "toileting"] as const).map((key) => (
            <label
              key={key}
              className="glass-card rounded-lg p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
            >
              <span className="font-medium text-foreground capitalize">{key === "eating" ? "Ate meals" : `Needed help with ${key}`}</span>
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.checked }))}
                className="w-6 h-6 rounded accent-primary"
              />
            </label>
          ))}
          <textarea
            value={form.notes}
            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes..."
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <button
            onClick={handleSave}
            className="w-full touch-target rounded-xl bg-primary text-primary-foreground font-semibold py-3 active:scale-[0.97] transition-transform"
          >
            Save ADL Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-slide-up">
      <h2 className="text-xl font-display font-bold text-foreground">Resident ADL Reports</h2>
      <p className="text-sm text-muted-foreground">Tap a resident to complete their daily activity report.</p>
      {residents.map(r => {
        const done = existingReports.some(rep => rep.residentId === r.id);
        return (
          <button
            key={r.id}
            onClick={() => setSelected(r.id)}
            className="w-full glass-card rounded-lg p-4 flex items-center justify-between active:scale-[0.98] transition-transform"
          >
            <div>
              <p className="font-medium text-foreground">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.room}</p>
            </div>
            {done ? (
              <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">✓ Done</span>
            ) : (
              <span className="text-xs font-medium text-warning bg-warning/10 px-2 py-1 rounded-full">Pending</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function EMARView({ onAdminister, records, caregiverId, residents }: {
  onAdminister: (r: Omit<import("@/types").EMARRecord, "id">) => void;
  records: import("@/types").EMARRecord[];
  caregiverId: string;
  residents: DBResident[];
}) {
  return (
    <div className="space-y-3 animate-slide-up">
      <h2 className="text-xl font-display font-bold text-foreground">Medication Administration</h2>
      <p className="text-sm text-muted-foreground">Tap "Administer" after giving each medication.</p>
      {residents.map(r => (
        <div key={r.id} className="glass-card rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">{r.name}</h3>
            <span className="text-xs text-muted-foreground">({r.room})</span>
          </div>
          {r.medications.map(med => {
            const administered = records.some(rec => rec.medicationId === med.id);
            return (
              <div key={med.id} className="flex items-center justify-between pl-6 py-1">
                <div>
                  <p className="text-sm text-foreground">{med.name} — {med.dosage}</p>
                  <p className="text-xs text-muted-foreground">{med.schedule}</p>
                </div>
                {administered ? (
                  <span className="text-xs font-medium text-success bg-success/10 px-3 py-1.5 rounded-full">
                    <Check className="w-3 h-3 inline mr-1" /> Given
                  </span>
                ) : (
                  <button
                    onClick={() => onAdminister({
                      residentId: r.id,
                      medicationId: med.id,
                      administeredAt: new Date(),
                      administeredBy: caregiverId,
                    })}
                    className="text-xs font-medium text-primary-foreground bg-primary px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                  >
                    Administer
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function HistoryView({ shifts, residents }: { shifts: import("@/types").Shift[]; residents: DBResident[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const formatDuration = (start: Date, end: Date) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (shifts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3 animate-slide-up">
        <History className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">No completed shifts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-slide-up">
      <h2 className="text-xl font-display font-bold text-foreground">Shift History</h2>
      <p className="text-sm text-muted-foreground">Tap a shift to see details.</p>

      {shifts.map((shift) => {
        const isExpanded = expandedId === shift.id;
        const duration = shift.clockOut ? formatDuration(shift.clockIn, shift.clockOut) : "—";
        const adlCount = shift.adlReports?.length || 0;
        const emarCount = shift.emarRecords?.length || 0;
        const noDocs = adlCount === 0 && emarCount === 0;

        return (
          <button
            key={shift.id}
            onClick={() => setExpandedId(isExpanded ? null : shift.id)}
            className={`w-full text-left glass-card rounded-xl p-4 space-y-2 active:scale-[0.98] transition-transform ${noDocs ? "border-l-4 border-warning" : ""}`}
          >
            {/* Summary row */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{formatDate(shift.clockIn)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(shift.clockIn)} – {shift.clockOut ? formatTime(shift.clockOut) : "—"}
                  {shift.is24Hour && <span className="ml-1 text-primary">(24hr)</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{duration}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {adlCount > 0 && <span className="text-success">{adlCount} ADL</span>}
                  {emarCount > 0 && <span className="text-primary">{emarCount} Med</span>}
                  {noDocs && (
                    <span className="text-warning flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" /> No docs
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Meal break badge */}
            <div className="flex gap-2 flex-wrap">
              {shift.mealBreakTaken === true && (
                <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">✓ Meal break taken</span>
              )}
              {shift.mealBreakTaken === false && (
                <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full">⚠ No meal break: {shift.mealBreakReason}</span>
              )}
              {shift.sleepInterruptions?.length > 0 && (
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                  {shift.sleepInterruptions.length} sleep interruption(s)
                </span>
              )}
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="pt-2 border-t border-border space-y-3" onClick={(e) => e.stopPropagation()}>
                {/* ADL Reports */}
                {adlCount > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">ADL Reports</p>
                    {shift.adlReports.map((adl, i) => {
                      const resName = residents.find(r => r.id === adl.residentId)?.name || adl.residentId;
                      const tasks = (["bathing", "dressing", "eating", "mobility", "toileting"] as const)
                        .filter(k => adl[k]);
                      return (
                        <div key={i} className="bg-muted/50 rounded-lg p-2 mb-1">
                          <p className="text-sm font-medium text-foreground">{resName}</p>
                          {tasks.length > 0 && (
                            <p className="text-xs text-muted-foreground">{tasks.join(", ")}</p>
                          )}
                          {adl.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{adl.notes}"</p>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* eMAR Records */}
                {emarCount > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Medications Given</p>
                    {shift.emarRecords.map((rec, i) => {
                      const resident = residents.find(r => r.id === rec.residentId);
                      const med = resident?.medications.find(m => m.id === rec.medicationId);
                      return (
                        <div key={i} className="bg-muted/50 rounded-lg p-2 mb-1 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-foreground">{med?.name || rec.medicationId} — {med?.dosage || ""}</p>
                            <p className="text-xs text-muted-foreground">{resident?.name || rec.residentId}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatTime(rec.administeredAt)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {adlCount === 0 && emarCount === 0 && (
                  <p className="text-xs text-muted-foreground italic">No ADL reports or medications logged for this shift.</p>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default CaregiverView;
