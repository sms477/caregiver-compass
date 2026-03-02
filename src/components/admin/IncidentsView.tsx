import { useState } from "react";
import { useIncidents, DBIncident } from "@/hooks/useIncidents";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useResidents, DBResident } from "@/hooks/useResidents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Plus, AlertTriangle, CalendarIcon, Loader2, Eye,
  CircleAlert, Pill, Brain, Bone, HelpCircle,
} from "lucide-react";

const INCIDENT_TYPES = [
  { value: "fall", label: "Fall", icon: Bone },
  { value: "medication_error", label: "Medication Error", icon: Pill },
  { value: "behavioral", label: "Behavioral Incident", icon: Brain },
  { value: "injury", label: "Injury Event", icon: CircleAlert },
  { value: "other", label: "Other", icon: HelpCircle },
];

const statusColor = (s: string) => {
  if (s === "open") return "bg-destructive/10 text-destructive";
  if (s === "in_review") return "bg-warning/10 text-warning";
  return "bg-success/10 text-success";
};

interface IncidentsViewProps {
  /** If provided, limits to this staff member's incidents and pre-fills staff info */
  staffOnly?: { id: string; name: string };
}

const IncidentsView = ({ staffOnly }: IncidentsViewProps) => {
  const { incidents, loading, refresh } = useIncidents();
  const { residents } = useResidents();
  const { user } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [viewIncident, setViewIncident] = useState<DBIncident | null>(null);

  // Form state
  const [incType, setIncType] = useState("fall");
  const [residentId, setResidentId] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [immediateAction, setImmediateAction] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = staffOnly
    ? incidents.filter(i => i.staff_id === staffOnly.id)
    : incidents;

  const resetForm = () => {
    setIncType("fall");
    setResidentId("");
    setDate(new Date());
    setDescription("");
    setImmediateAction("");
    setFollowUp(false);
    setFollowUpNotes("");
  };

  const handleSubmit = async () => {
    if (!residentId || !description.trim()) return;
    const resident = residents.find(r => r.id === residentId);
    if (!resident) return;

    setSaving(true);
    const staffName = staffOnly?.name || user?.email || "Admin";
    const staffId = staffOnly?.id || user?.id || "";

    const { error } = await supabase.from("incidents").insert({
      incident_type: incType,
      resident_id: residentId,
      resident_name: resident.name,
      staff_id: staffId,
      staff_name: staffName,
      occurred_at: date.toISOString(),
      description: description.trim(),
      immediate_action: immediateAction.trim(),
      follow_up_required: followUp,
      follow_up_notes: followUp ? followUpNotes.trim() : null,
    });

    setSaving(false);
    if (error) {
      toast.error("Failed to log incident");
      return;
    }
    toast.success("Incident logged");
    setShowForm(false);
    resetForm();
    refresh();
  };

  // Admin can update status
  const updateStatus = async (id: string, status: string) => {
    await supabase.from("incidents").update({ status }).eq("id", id);
    refresh();
    setViewIncident(prev => prev ? { ...prev, status } : null);
    toast.success(`Status updated to ${status.replace("_", " ")}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Incident Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {staffOnly ? "Your incident reports." : "All facility incident reports."}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Log Incident
        </Button>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        {["open", "in_review", "resolved"].map(s => {
          const count = filtered.filter(i => i.status === s).length;
          return (
            <span key={s} className={`text-xs font-medium px-3 py-1.5 rounded-full ${statusColor(s)}`}>
              {s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}: {count}
            </span>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No incidents recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inc => {
            const typeInfo = INCIDENT_TYPES.find(t => t.value === inc.incident_type) || INCIDENT_TYPES[4];
            const Icon = typeInfo.icon;
            return (
              <button
                key={inc.id}
                onClick={() => setViewIncident(inc)}
                className="w-full text-left glass-card rounded-xl p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="mt-0.5 p-2 rounded-lg bg-muted">
                  <Icon className="w-4 h-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{typeInfo.label}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(inc.status)}`}>
                      {inc.status.replace("_", " ")}
                    </span>
                    {inc.follow_up_required && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning">Follow-up</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{inc.description}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{inc.resident_name}</span>
                    <span>·</span>
                    <span>{format(new Date(inc.occurred_at), "MMM d, yyyy h:mm a")}</span>
                    <span>·</span>
                    <span>{inc.staff_name}</span>
                  </div>
                </div>
                <Eye className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* New Incident Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Incident Type</label>
              <Select value={incType} onValueChange={setIncType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Resident Involved</label>
              <Select value={residentId} onValueChange={setResidentId}>
                <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
                <SelectContent>
                  {residents.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name} — {r.room}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Date & Time</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "PPP p")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={d => d && setDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what happened..."
                rows={3}
                maxLength={2000}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Immediate Action Taken</label>
              <Textarea
                value={immediateAction}
                onChange={e => setImmediateAction(e.target.value)}
                placeholder="What was done immediately..."
                rows={2}
                maxLength={1000}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="follow-up"
                checked={followUp}
                onCheckedChange={v => setFollowUp(!!v)}
              />
              <label htmlFor="follow-up" className="text-sm font-medium text-foreground cursor-pointer">
                Follow-up required
              </label>
            </div>

            {followUp && (
              <div>
                <label className="text-sm font-medium text-foreground">Follow-up Notes</label>
                <Textarea
                  value={followUpNotes}
                  onChange={e => setFollowUpNotes(e.target.value)}
                  placeholder="What follow-up is needed..."
                  rows={2}
                  maxLength={1000}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !residentId || !description.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Incident Dialog */}
      <Dialog open={!!viewIncident} onOpenChange={() => setViewIncident(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewIncident && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const t = INCIDENT_TYPES.find(t => t.value === viewIncident.incident_type) || INCIDENT_TYPES[4];
                    const Icon = t.icon;
                    return <><Icon className="w-5 h-5" /> {t.label}</>;
                  })()}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(viewIncident.status)}`}>
                    {viewIncident.status.replace("_", " ")}
                  </span>
                  {viewIncident.follow_up_required && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-warning/10 text-warning">Follow-up required</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Resident</span>
                    <p className="font-medium text-foreground">{viewIncident.resident_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Staff</span>
                    <p className="font-medium text-foreground">{viewIncident.staff_name}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Date & Time</span>
                    <p className="font-medium text-foreground">{format(new Date(viewIncident.occurred_at), "PPP p")}</p>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">Description</span>
                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{viewIncident.description}</p>
                </div>

                {viewIncident.immediate_action && (
                  <div>
                    <span className="text-sm text-muted-foreground">Immediate Action Taken</span>
                    <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{viewIncident.immediate_action}</p>
                  </div>
                )}

                {viewIncident.follow_up_notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Follow-up Notes</span>
                    <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{viewIncident.follow_up_notes}</p>
                  </div>
                )}

                {/* Admin status controls */}
                {!staffOnly && (
                  <div>
                    <span className="text-sm font-medium text-foreground">Update Status</span>
                    <div className="flex gap-2 mt-2">
                      {["open", "in_review", "resolved"].map(s => (
                        <Button
                          key={s}
                          variant={viewIncident.status === s ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateStatus(viewIncident.id, s)}
                          className="text-xs"
                        >
                          {s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncidentsView;
