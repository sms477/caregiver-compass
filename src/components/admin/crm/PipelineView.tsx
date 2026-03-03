import { useState } from "react";
import { STAGES, STAGE_CONFIG, type Prospect, type ProspectStage } from "@/hooks/useCRM";
import { Button } from "@/components/ui/button";
import { Plus, Phone, Mail, Calendar, Star, ChevronRight } from "lucide-react";
import QuickAddProspect from "./QuickAddProspect";
import ProspectDetail from "./ProspectDetail";

interface Props {
  crm: ReturnType<typeof import("@/hooks/useCRM").useCRM>;
  onConvertProspect?: (prospect: Prospect) => void;
}

const PipelineView = ({ crm, onConvertProspect }: Props) => {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  const stageCounts = STAGES.map(s => ({
    stage: s,
    count: crm.prospects.filter(p => p.stage === s).length,
  }));

  const totalProspects = crm.prospects.length;
  const convertedCount = crm.prospects.filter(p => p.stage === "converted").length;
  const upcomingTours = crm.tours.filter(t => new Date(t.scheduled_at) >= new Date() && t.status === "scheduled").length;

  const handleStageChange = async (prospect: Prospect, newStage: ProspectStage) => {
    // If moving to converted, trigger the resident creation modal instead
    if (newStage === "converted" && onConvertProspect) {
      onConvertProspect(prospect);
      return;
    }
    await crm.updateStage(prospect.id, newStage);
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalProspects}</p>
          <p className="text-xs text-muted-foreground">Total Prospects</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{convertedCount}</p>
          <p className="text-xs text-muted-foreground">Converted</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{upcomingTours}</p>
          <p className="text-xs text-muted-foreground">Upcoming Tours</p>
        </div>
      </div>

      {/* Quick Add Button */}
      <Button onClick={() => setShowAdd(true)} className="w-full sm:w-auto gap-2 rounded-xl shadow-md">
        <Plus className="w-4 h-4" /> Add Prospect
      </Button>

      {showAdd && <QuickAddProspect crm={crm} onClose={() => setShowAdd(false)} />}

      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {STAGES.map(stage => {
          const config = STAGE_CONFIG[stage];
          const stageProspects = crm.prospects.filter(p => p.stage === stage);

          return (
            <div key={stage} className="space-y-2">
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${config.bg}`}>
                <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                <span className={`text-xs font-bold ${config.color}`}>{stageProspects.length}</span>
              </div>

              <div className="space-y-2 min-h-[100px]">
                {stageProspects.map(prospect => (
                  <div
                    key={prospect.id}
                    onClick={() => setSelectedProspect(prospect)}
                    className="glass-card rounded-xl p-3 cursor-pointer hover:shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-foreground text-sm leading-tight">{prospect.name}</p>
                      {prospect.priority === "high" && <Star className="w-3.5 h-3.5 text-warning fill-warning shrink-0" />}
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      {prospect.phone && <Phone className="w-3 h-3" />}
                      {prospect.email && <Mail className="w-3 h-3" />}
                      {prospect.preferred_move_in_date && <Calendar className="w-3 h-3" />}
                    </div>

                    {/* Stage navigation */}
                    {stage !== "converted" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextIdx = STAGES.indexOf(stage) + 1;
                          if (nextIdx < STAGES.length) handleStageChange(prospect, STAGES[nextIdx]);
                        }}
                        className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Move to {STAGE_CONFIG[STAGES[STAGES.indexOf(stage) + 1]]?.label}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

                {stageProspects.length === 0 && (
                  <div className="rounded-xl border-2 border-dashed border-border/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground">No prospects</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedProspect && (
        <ProspectDetail
          prospect={selectedProspect}
          crm={crm}
          onClose={() => setSelectedProspect(null)}
          onConvert={onConvertProspect}
        />
      )}
    </div>
  );
};

export default PipelineView;
