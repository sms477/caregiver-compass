import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, CheckCircle, TrendingUp, Activity, Eye, DollarSign } from "lucide-react";
import { format } from "date-fns";

const LEVEL_ORDER: Record<string, number> = {
  "Basic": 0,
  "Level 1": 1,
  "Level 2": 2,
  "High Acuity": 3,
};

const LEVEL_LABELS: Record<string, string> = {
  Independent: "Independent",
  Assist: "Physical Assist",
  Total: "Total Dependence",
};

function levelColor(level: string): string {
  switch (level) {
    case "Basic": return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700";
    case "Level 1": return "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-700";
    case "Level 2": return "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700";
    case "High Acuity": return "bg-destructive/15 text-destructive border-destructive/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function dominantColor(dominant: string): string {
  switch (dominant) {
    case "Independent": return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700";
    case "Assist": return "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700";
    case "Total": return "bg-destructive/15 text-destructive border-destructive/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

interface AcuitySummary {
  resident_id: string;
  resident_name: string;
  room: string;
  current_level: string;
  current_score: number;
  log_count: number;
  calculated_score: number;
  calculated_level: string;
  adl_breakdown: Record<string, { dominant: string; points: number }>;
}

const AcuityReview = () => {
  const [data, setData] = useState<AcuitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResident, setSelectedResident] = useState<AcuitySummary | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("resident_acuity_summary" as any)
      .select("*");

    if (error) {
      toast.error("Failed to load acuity data");
      console.error(error);
    } else {
      setData((rows as any[] || []).map((r: any) => ({
        resident_id: r.resident_id,
        resident_name: r.resident_name,
        room: r.room,
        current_level: r.current_level || "Basic",
        current_score: r.current_score || 0,
        log_count: r.log_count || 0,
        calculated_score: r.calculated_score || 0,
        calculated_level: r.calculated_level || "Basic",
        adl_breakdown: typeof r.adl_breakdown === "object" ? r.adl_breakdown : {},
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const isUpgrade = (row: AcuitySummary) =>
    (LEVEL_ORDER[row.calculated_level] ?? 0) > (LEVEL_ORDER[row.current_level] ?? 0);

  const handleConfirm = async (row: AcuitySummary) => {
    setSaving(row.resident_id);
    const { error } = await supabase
      .from("residents")
      .update({
        care_level: row.calculated_level,
        acuity_score: row.calculated_score,
        last_assessment_date: format(new Date(), "yyyy-MM-dd"),
      })
      .eq("id", row.resident_id);

    if (error) {
      toast.error("Failed to update resident");
    } else {
      toast.success(`${row.resident_name} updated to ${row.calculated_level}`);
      fetchData();
      setSelectedResident(null);
    }
    setSaving(null);
  };

  const upgradeCount = data.filter(isUpgrade).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Acuity Review
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            30-day care log analysis vs. current resident levels.
          </p>
        </div>
        {upgradeCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-2">
            <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {upgradeCount} Revenue Opportunit{upgradeCount === 1 ? "y" : "ies"}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Residents with higher calculated care needs
              </p>
            </div>
          </div>
        )}
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

      {/* Main Table */}
      {data.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No residents found.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Resident</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Current Level</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Calculated Level</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Score</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Logs</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => {
                  const upgrade = isUpgrade(row);
                  return (
                    <tr
                      key={row.resident_id}
                      className={`border-t border-border transition-colors ${
                        upgrade
                          ? "bg-amber-50/80 dark:bg-amber-950/20"
                          : ""
                      }`}
                    >
                      <td className="p-3">
                        <p className="font-medium text-foreground">{row.resident_name}</p>
                        <p className="text-xs text-muted-foreground">{row.room}</p>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${levelColor(row.current_level)}`}>
                          {row.current_level}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${levelColor(row.calculated_level)}`}>
                          {row.calculated_level}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-foreground font-bold">{row.calculated_score}</span>
                        <span className="text-muted-foreground text-xs ml-0.5">pts</span>
                      </td>
                      <td className="p-3 text-center text-muted-foreground">
                        {row.log_count}
                      </td>
                      <td className="p-3 text-center">
                        {upgrade ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                            <TrendingUp className="w-3.5 h-3.5" /> Revenue Opportunity
                          </span>
                        ) : row.log_count === 0 ? (
                          <span className="text-xs text-muted-foreground">No data</span>
                        ) : (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Up to date</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 h-7 text-xs"
                          onClick={() => setSelectedResident(row)}
                          disabled={row.log_count === 0}
                        >
                          <Eye className="w-3 h-3" /> Review
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedResident} onOpenChange={(open) => !open && setSelectedResident(null)}>
        <DialogContent className="max-w-lg">
          {selectedResident && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  {selectedResident.resident_name} — ADL Breakdown
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Level comparison */}
                <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Current</p>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${levelColor(selectedResident.current_level)}`}>
                      {selectedResident.current_level}
                    </span>
                  </div>
                  {isUpgrade(selectedResident) && (
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                  )}
                  <div className="text-center space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Calculated</p>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${levelColor(selectedResident.calculated_level)}`}>
                      {selectedResident.calculated_level}
                    </span>
                  </div>
                </div>

                {/* ADL Table */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">ADL</th>
                        <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">Dominant Need</th>
                        <th className="text-right p-2.5 font-medium text-muted-foreground text-xs">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["bathing", "dressing", "toileting", "transfers", "eating"].map(adl => {
                        const entry = selectedResident.adl_breakdown[adl];
                        const dominant = entry?.dominant || "Independent";
                        const points = entry?.points ?? 0;
                        return (
                          <tr key={adl} className="border-t border-border">
                            <td className="p-2.5 font-medium text-foreground capitalize">{adl}</td>
                            <td className="p-2.5">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${dominantColor(dominant)}`}>
                                {LEVEL_LABELS[dominant] || dominant}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-foreground">{points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/30">
                        <td colSpan={2} className="p-2.5 font-semibold text-foreground">Total</td>
                        <td className="p-2.5 text-right font-bold text-foreground text-lg">{selectedResident.calculated_score}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {isUpgrade(selectedResident) && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      <strong>Revenue Opportunity:</strong> This resident's care needs have increased. 
                      Updating their level may qualify for a higher care rate to cover the additional labor cost.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setSelectedResident(null)}>Close</Button>
                {isUpgrade(selectedResident) && (
                  <Button
                    onClick={() => handleConfirm(selectedResident)}
                    disabled={saving === selectedResident.resident_id}
                    className="gap-2"
                  >
                    {saving === selectedResident.resident_id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <CheckCircle className="w-4 h-4" />}
                    Confirm New Care Level
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcuityReview;
