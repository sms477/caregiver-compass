import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { MOCK_RESIDENTS, MOCK_CAREGIVERS } from "@/data/mockData";
import { ADLReport } from "@/types";
import {
  Clock, LogOut, Moon, Sun, AlertTriangle, Check, Pill,
  ChevronLeft, ClipboardList, Activity, ArrowLeft
} from "lucide-react";

type Tab = "clock" | "adl" | "emar";

const CaregiverView = () => {
  const {
    setRole, activeShift, clockIn, clockOut,
    startSleep, endSleep, logSleepInterruption, resumeSleep,
    addADLReport, addEMARRecord, currentCaregiverId,
  } = useApp();

  const [tab, setTab] = useState<Tab>("clock");
  const [showMealPrompt, setShowMealPrompt] = useState(false);
  const [showClockInOptions, setShowClockInOptions] = useState(false);
  const [mealReason, setMealReason] = useState("");
  const [wakeReason, setWakeReason] = useState("");
  const [showWakePrompt, setShowWakePrompt] = useState(false);

  const caregiverName = MOCK_CAREGIVERS.find(c => c.id === currentCaregiverId)?.name || "";

  const isSleeping = activeShift?.sleepStart && !activeShift?.sleepEnd;
  const hasActiveInterruption = activeShift?.sleepInterruptions.some(i => !i.resumeTime);

  const handleClockOutAttempt = () => setShowMealPrompt(true);

  const handleMealResponse = (taken: boolean) => {
    if (taken) {
      clockOut(true, null);
      setShowMealPrompt(false);
    } else if (mealReason) {
      clockOut(false, mealReason);
      setShowMealPrompt(false);
      setMealReason("");
    }
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
        <span className="text-xs text-muted-foreground">{caregiverName.split(" ")[0]}</span>
      </header>

      {/* Tab Bar */}
      {activeShift && (
        <div className="flex border-b border-border bg-card">
          {([
            { key: "clock" as Tab, icon: Clock, label: "Shift" },
            { key: "adl" as Tab, icon: ClipboardList, label: "ADLs" },
            { key: "emar" as Tab, icon: Pill, label: "eMAR" },
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
      )}

      {/* Content */}
      <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
        {!activeShift ? (
          <ClockInView
            showOptions={showClockInOptions}
            setShowOptions={setShowClockInOptions}
            onClockIn={clockIn}
          />
        ) : tab === "clock" ? (
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
        ) : tab === "adl" ? (
          <ADLView onSave={addADLReport} existingReports={activeShift.adlReports} />
        ) : (
          <EMARView
            onAdminister={addEMARRecord}
            records={activeShift.emarRecords}
            caregiverId={currentCaregiverId}
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

function ADLView({ onSave, existingReports }: {
  onSave: (r: ADLReport) => void;
  existingReports: ADLReport[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ADLReport, "residentId">>({
    bathing: false, dressing: false, eating: false, mobility: false, toileting: false, notes: "",
  });

  const resident = MOCK_RESIDENTS.find(r => r.id === selected);
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
      {MOCK_RESIDENTS.map(r => {
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

function EMARView({ onAdminister, records, caregiverId }: {
  onAdminister: (r: Omit<import("@/types").EMARRecord, "id">) => void;
  records: import("@/types").EMARRecord[];
  caregiverId: string;
}) {
  return (
    <div className="space-y-3 animate-slide-up">
      <h2 className="text-xl font-display font-bold text-foreground">Medication Administration</h2>
      <p className="text-sm text-muted-foreground">Tap "Administer" after giving each medication.</p>
      {MOCK_RESIDENTS.map(r => (
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

export default CaregiverView;
