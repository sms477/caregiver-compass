import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Clock } from "lucide-react";

interface ActiveShift {
  id: string;
  caregiver_name: string;
  clock_in: string;
  is_24_hour: boolean;
}

const MAX_STANDARD_HOURS = 14;
const MAX_24HR_HOURS = 26;

export default function OverdueShiftAlerts() {
  const [overdueShifts, setOverdueShifts] = useState<(ActiveShift & { hours: number })[]>([]);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("shifts")
        .select("id, caregiver_name, clock_in, is_24_hour")
        .is("clock_out", null);

      if (data) {
        const now = Date.now();
        const overdue = data
          .map((s: any) => {
            const hours = (now - new Date(s.clock_in).getTime()) / 3600000;
            const max = s.is_24_hour ? MAX_24HR_HOURS : MAX_STANDARD_HOURS;
            return { ...s, hours, max };
          })
          .filter((s: any) => s.hours > s.max);
        setOverdueShifts(overdue);
      }
    };

    check();
    const interval = setInterval(check, 60000); // check every minute
    return () => clearInterval(interval);
  }, []);

  if (overdueShifts.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-4 space-y-2 border-l-4 border-destructive">
      <h3 className="font-display font-bold text-foreground flex items-center gap-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        {overdueShifts.length} Overdue Shift{overdueShifts.length > 1 ? "s" : ""}
      </h3>
      <p className="text-xs text-muted-foreground">
        These shifts have exceeded their expected duration. The caregiver may have forgotten to clock out.
      </p>
      {overdueShifts.map((s) => (
        <div key={s.id} className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{s.caregiver_name}</span>
          </div>
          <span className="font-mono text-xs">
            {s.hours.toFixed(1)}h running
          </span>
        </div>
      ))}
    </div>
  );
}
