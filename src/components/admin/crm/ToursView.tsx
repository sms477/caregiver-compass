import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle } from "lucide-react";
import { format, isAfter, isBefore } from "date-fns";

interface Props {
  crm: ReturnType<typeof import("@/hooks/useCRM").useCRM>;
}

const ToursView = ({ crm }: Props) => {
  const now = new Date();

  const upcoming = useMemo(
    () => crm.tours.filter(t => isAfter(new Date(t.scheduled_at), now) && t.status === "scheduled"),
    [crm.tours]
  );
  const past = useMemo(
    () => crm.tours.filter(t => isBefore(new Date(t.scheduled_at), now) || t.status !== "scheduled"),
    [crm.tours]
  );

  const handleComplete = async (tourId: string) => {
    await crm.updateTour(tourId, { status: "completed" });
  };

  return (
    <div className="space-y-6">
      {/* Upcoming */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-primary" /> Upcoming Tours ({upcoming.length})
        </h3>
        {upcoming.length === 0 && (
          <div className="glass-card rounded-xl p-6 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No upcoming tours. Schedule one from a prospect's detail view.</p>
          </div>
        )}
        <div className="space-y-2">
          {upcoming.map(t => (
            <div key={t.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">{t.prospect_name}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{format(new Date(t.scheduled_at), "EEEE, MMM d 'at' h:mm a")}</span>
                  {t.assigned_staff_name && <span>• {t.assigned_staff_name}</span>}
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleComplete(t.id)}>
                <CheckCircle className="w-3 h-3" /> Done
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Past Tours ({past.length})</h3>
          <div className="space-y-2 opacity-70">
            {past.map(t => (
              <div key={t.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground text-sm">{t.prospect_name}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(t.scheduled_at), "MMM d, h:mm a")}</p>
                </div>
                <Badge variant={t.status === "completed" ? "default" : "outline"} className="text-xs">{t.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToursView;
