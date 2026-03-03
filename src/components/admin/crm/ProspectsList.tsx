import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Plus, Phone, Mail, Star } from "lucide-react";
import { STAGES, STAGE_CONFIG, type Prospect, type ProspectStage } from "@/hooks/useCRM";
import QuickAddProspect from "./QuickAddProspect";
import ProspectDetail from "./ProspectDetail";
import { format } from "date-fns";

interface Props {
  crm: ReturnType<typeof import("@/hooks/useCRM").useCRM>;
}

const ProspectsList = ({ crm }: Props) => {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Prospect | null>(null);

  const filtered = useMemo(() => {
    return crm.prospects.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
        || p.phone?.includes(search) || p.email?.toLowerCase().includes(search.toLowerCase());
      const matchStage = stageFilter === "all" || p.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [crm.prospects, search, stageFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email…"
            className="pl-9 h-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="All stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {STAGES.map(s => (
              <SelectItem key={s} value={s}>{STAGE_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1 h-9" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {showAdd && <QuickAddProspect crm={crm} onClose={() => setShowAdd(false)} />}

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">No prospects found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new prospect.</p>
          </div>
        )}
        {filtered.map(p => {
          const conf = STAGE_CONFIG[p.stage];
          return (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              className="glass-card rounded-xl p-4 cursor-pointer hover:shadow-md transition-all flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground text-sm truncate">{p.name}</p>
                  {p.priority === "high" && <Star className="w-3.5 h-3.5 text-warning fill-warning shrink-0" />}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {p.phone}</span>}
                  {p.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {p.email}</span>}
                  <span>{format(new Date(p.created_at), "MMM d")}</span>
                </div>
              </div>
              <Badge className={`${conf.bg} ${conf.color} border-0 text-xs shrink-0`}>{conf.label}</Badge>
            </div>
          );
        })}
      </div>

      {selected && <ProspectDetail prospect={selected} crm={crm} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default ProspectsList;
