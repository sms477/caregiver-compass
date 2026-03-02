import { useState } from "react";
import { useAuditLog, AuditEntry } from "@/hooks/useAuditLog";
import { useApp } from "@/contexts/AppContext";
import { FileText, Filter, ChevronDown, ChevronRight } from "lucide-react";

const TABLE_LABELS: Record<string, string> = {
  medications: "Medication Changes",
  incidents: "Incident Modifications",
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-success/10 text-success",
  UPDATE: "bg-warning/10 text-warning",
  DELETE: "bg-destructive/10 text-destructive",
};

const AuditTrailView = () => {
  const [tableFilter, setTableFilter] = useState<string>("");
  const { entries, loading } = useAuditLog(tableFilter || undefined);
  const { employees } = useApp();

  const getUserName = (id: string) => {
    if (id === "00000000-0000-0000-0000-000000000000") return "System";
    return employees.find(e => e.id === id)?.name || id.slice(0, 8) + "…";
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Audit Trail</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Full change history for medications and incidents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={tableFilter}
            onChange={e => setTableFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="">All Tables</option>
            <option value="medications">Medications</option>
            <option value="incidents">Incidents</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading audit trail…</p>
      ) : entries.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">No audit entries yet</p>
          <p className="text-sm text-muted-foreground mt-1">Changes to medications and incidents will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <AuditRow key={entry.id} entry={entry} getUserName={getUserName} />
          ))}
        </div>
      )}
    </div>
  );
};

function AuditRow({ entry, getUserName }: { entry: AuditEntry; getUserName: (id: string) => string }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(entry.created_at);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[entry.action] || "bg-muted text-muted-foreground"}`}>
              {entry.action}
            </span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {TABLE_LABELS[entry.table_name] || entry.table_name}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            by <span className="font-medium text-foreground">{getUserName(entry.performed_by)}</span>
            {" · "}
            {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {" "}
            {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border space-y-3">
          {entry.action === "UPDATE" && entry.old_data && entry.new_data && (
            <DiffView old={entry.old_data} new_={entry.new_data} />
          )}
          {entry.action === "INSERT" && entry.new_data && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">New Record</p>
              <DataDisplay data={entry.new_data} />
            </div>
          )}
          {entry.action === "DELETE" && entry.old_data && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Deleted Record</p>
              <DataDisplay data={entry.old_data} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiffView({ old, new_ }: { old: any; new_: any }) {
  const allKeys = [...new Set([...Object.keys(old || {}), ...Object.keys(new_ || {})])];
  const changed = allKeys.filter(k => JSON.stringify(old?.[k]) !== JSON.stringify(new_?.[k]));
  const SKIP = ["updated_at", "created_at"];

  const filtered = changed.filter(k => !SKIP.includes(k));

  if (filtered.length === 0) {
    return <p className="text-xs text-muted-foreground">No meaningful changes detected.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Changes</p>
      {filtered.map(key => (
        <div key={key} className="rounded-lg bg-muted/30 p-2 text-xs">
          <span className="font-medium text-foreground">{key}</span>
          <div className="flex gap-2 mt-1">
            <span className="text-destructive line-through">{JSON.stringify(old?.[key])}</span>
            <span className="text-success">{JSON.stringify(new_?.[key])}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DataDisplay({ data }: { data: any }) {
  const SKIP = ["updated_at", "created_at", "id"];
  const keys = Object.keys(data || {}).filter(k => !SKIP.includes(k));

  return (
    <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-1">
      {keys.map(k => (
        <div key={k} className="flex gap-2">
          <span className="text-muted-foreground font-medium min-w-[120px]">{k}:</span>
          <span className="text-foreground">{JSON.stringify(data[k])}</span>
        </div>
      ))}
    </div>
  );
}

export default AuditTrailView;
