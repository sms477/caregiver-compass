import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useResidents, DBResident } from "@/hooks/useResidents";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertTriangle, Activity } from "lucide-react";
import { subDays, format } from "date-fns";

const ADL_KEYS = ["bathing", "dressing", "toileting", "transfers", "eating"] as const;
type ADLKey = typeof ADL_KEYS[number];

const LEVEL_LABELS: Record<string, string> = {
  Independent: "Independent",
  Assist: "Physical Assist",
  Total: "Total Dependence",
};

const SCORE_MAP: Record<string, number> = {
  Independent: 0,
  Assist: 3,
  Total: 5,
};

function classifyLevel(score: number): string {
  if (score <= 10) return "Basic";
  if (score <= 20) return "Level 1";
  if (score <= 30) return "Level 2";
  return "High Acuity";
}

function levelColor(level: string): string {
  switch (level) {
    case "Basic": return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700";
    case "Level 1": return "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-700";
    case "Level 2": return "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700";
    case "High Acuity": return "bg-destructive/15 text-destructive border-destructive/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

interface DominantNeed {
  adl: ADLKey;
  dominant: string;
  counts: Record<string, number>;
  score: number;
}

const AcuityReview = () => {
  const { residents, loading: residentsLoading, refresh: refreshResidents } = useResidents();
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedResident = residents.find(r => r.id === selectedResidentId) || null;

  useEffect(() => {
    if (!selectedResidentId) { setLogs([]); return; }
    const fetchLogs = async () => {
      setLoadingLogs(true);
      const since = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("daily_care_logs")
        .select("*")
        .eq("resident_id", selectedResidentId)
        .gte("log_date", since)
        .order("log_date", { ascending: false });
      if (error) toast.error("Failed to load care logs");
      setLogs(data || []);
      setLoadingLogs(false);
    };
    fetchLogs();
  }, [selectedResidentId]);

  const analysis = useMemo((): { needs: DominantNeed[]; totalScore: number; level: string } | null => {
    if (logs.length === 0) return null;

    const needs: DominantNeed[] = ADL_KEYS.map(adl => {
      const counts: Record<string, number> = {};
      logs.forEach(log => {
        const val = log[adl] || "Independent";
        counts[val] = (counts[val] || 0) + 1;
      });
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      const score = SCORE_MAP[dominant] ?? 0;
      return { adl, dominant, counts, score };
    });

    const totalScore = needs.reduce((sum, n) => sum + n.score, 0);
    return { needs, totalScore, level: classifyLevel(totalScore) };
  }, [logs]);

  const handleUpdate = async () => {
    if (!analysis || !selectedResidentId) return;
    setSaving(true);
    const { error } = await supabase
      .from("residents")
      .update({
        care_level: analysis.level,
        acuity_score: analysis.totalScore,
        last_assessment_date: format(new Date(), "yyyy-MM-dd"),
      })
      .eq("id", selectedResidentId);

    if (error) {
      toast.error("Failed to update resident level");
    } else {
      toast.success(`${selectedResident?.name} updated to ${analysis.level}`);
      refreshResidents();
    }
    setSaving(false);
  };

  if (residentsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Acuity Review
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Analyze 30-day care logs to calculate a resident's acuity level.
        </p>
      </div>

      {/* Resident Selector */}
      <div className="glass-card rounded-xl p-4">
        <label className="text-sm font-medium text-foreground block mb-2">Select Resident</label>
        <Select value={selectedResidentId} onValueChange={setSelectedResidentId}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Choose a resident…" />
          </SelectTrigger>
          <SelectContent>
            {residents.map(r => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} — {r.room}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {loadingLogs && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {/* No logs */}
      {!loadingLogs && selectedResidentId && logs.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No care logs found for the last 30 days.</p>
        </div>
      )}

      {/* Analysis */}
      {!loadingLogs && analysis && (
        <div className="space-y-4">
          {/* Summary Header */}
          <div className="glass-card rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Based on <strong className="text-foreground">{logs.length}</strong> log entries
              </p>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold px-3 py-1 rounded-full border ${levelColor(analysis.level)}`}>
                  {analysis.level}
                </span>
                <span className="text-2xl font-display font-bold text-foreground">
                  {analysis.totalScore} <span className="text-sm font-normal text-muted-foreground">pts</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Current: <span className="font-medium text-foreground">{selectedResident?.care_level}</span> · Score: {selectedResident?.acuity_score}
              </p>
            </div>
            <Button
              onClick={handleUpdate}
              disabled={saving || analysis.level === selectedResident?.care_level}
              className="gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirm & Update Resident Level
            </Button>
          </div>

          {/* Scorecard */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">ADL Scorecard — Dominant Needs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">ADL Category</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Dominant Need</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Breakdown</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.needs.map(n => (
                    <tr key={n.adl} className="border-t border-border">
                      <td className="p-3 font-medium text-foreground capitalize">{n.adl}</td>
                      <td className="p-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          n.dominant === "Independent"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700"
                            : n.dominant === "Total"
                              ? "bg-destructive/15 text-destructive border-destructive/30"
                              : "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700"
                        }`}>
                          {LEVEL_LABELS[n.dominant] || n.dominant}
                        </span>
                      </td>
                      <td className="p-3 text-center text-xs text-muted-foreground">
                        {Object.entries(n.counts).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </td>
                      <td className="p-3 text-right font-bold text-foreground">{n.score}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td colSpan={3} className="p-3 font-semibold text-foreground">Total</td>
                    <td className="p-3 text-right font-bold text-foreground text-lg">{analysis.totalScore}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Scoring Guide */}
          <div className="glass-card rounded-xl p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Scoring Guide</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { label: "Basic", range: "≤ 10 pts", color: levelColor("Basic") },
                { label: "Level 1", range: "11–20 pts", color: levelColor("Level 1") },
                { label: "Level 2", range: "21–30 pts", color: levelColor("Level 2") },
                { label: "High Acuity", range: "31+ pts", color: levelColor("High Acuity") },
              ].map(g => (
                <div key={g.label} className={`rounded-lg border px-3 py-2 text-center ${g.color}`}>
                  <p className="font-bold">{g.label}</p>
                  <p className="opacity-80">{g.range}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcuityReview;
