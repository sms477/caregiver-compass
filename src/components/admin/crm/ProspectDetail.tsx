import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, Calendar, Trash2, UserCheck, MessageSquare, Plus, Clock } from "lucide-react";
import { STAGES, STAGE_CONFIG, type Prospect, type ProspectNote, type ProspectStage } from "@/hooks/useCRM";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Props {
  prospect: Prospect;
  crm: ReturnType<typeof import("@/hooks/useCRM").useCRM>;
  onClose: () => void;
}

const ProspectDetail = ({ prospect, crm, onClose }: Props) => {
  const [notes, setNotes] = useState<ProspectNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [stage, setStage] = useState<ProspectStage>(prospect.stage);
  const [showConvert, setShowConvert] = useState(false);
  const [room, setRoom] = useState("");
  const [careLevel, setCareLevel] = useState("Basic");
  const [showTour, setShowTour] = useState(false);
  const [tourDate, setTourDate] = useState("");
  const [tourStaff, setTourStaff] = useState("");
  const [showFamily, setShowFamily] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [familyRelation, setFamilyRelation] = useState("");
  const [familyPhone, setFamilyPhone] = useState("");

  const families = crm.familyContacts.filter(f => f.prospect_id === prospect.id);
  const prospectTours = crm.tours.filter(t => t.prospect_id === prospect.id);

  useEffect(() => {
    crm.getNotes(prospect.id).then(setNotes);
  }, [prospect.id]);

  const handleStageChange = async (s: ProspectStage) => {
    setStage(s);
    await crm.updateStage(prospect.id, s);
    toast({ title: "Stage updated", description: `Moved to ${STAGE_CONFIG[s].label}` });
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await crm.addNote(prospect.id, newNote.trim());
    setNewNote("");
    const updated = await crm.getNotes(prospect.id);
    setNotes(updated);
  };

  const handleConvert = async () => {
    if (!room.trim()) return;
    const err = await crm.convertProspect(prospect, room.trim(), careLevel);
    if (!err) {
      toast({ title: "🎉 Prospect Converted!", description: `${prospect.name} is now a resident.` });
      onClose();
    }
  };

  const handleScheduleTour = async () => {
    if (!tourDate) return;
    await crm.addTour({
      prospect_id: prospect.id,
      scheduled_at: new Date(tourDate).toISOString(),
      assigned_staff_name: tourStaff || null,
      location_id: prospect.location_id,
      status: "scheduled",
    });
    setShowTour(false);
    setTourDate("");
    setTourStaff("");
    toast({ title: "Tour scheduled", description: `Tour for ${prospect.name} has been scheduled.` });
  };

  const handleAddFamily = async () => {
    if (!familyName.trim()) return;
    await crm.addFamilyContact({
      name: familyName.trim(),
      relationship: familyRelation || null,
      phone: familyPhone || null,
      prospect_id: prospect.id,
      location_id: prospect.location_id,
    });
    setShowFamily(false);
    setFamilyName("");
    setFamilyRelation("");
    setFamilyPhone("");
    toast({ title: "Contact added" });
  };

  const handleDelete = async () => {
    await crm.deleteProspect(prospect.id);
    toast({ title: "Prospect removed" });
    onClose();
  };

  const stageConf = STAGE_CONFIG[stage];

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {prospect.name}
            <Badge className={`${stageConf.bg} ${stageConf.color} border-0 text-xs`}>{stageConf.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact Info */}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {prospect.phone && (
              <a href={`tel:${prospect.phone}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                <Phone className="w-3.5 h-3.5" /> {prospect.phone}
              </a>
            )}
            {prospect.email && (
              <a href={`mailto:${prospect.email}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                <Mail className="w-3.5 h-3.5" /> {prospect.email}
              </a>
            )}
            {prospect.preferred_move_in_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Move-in: {prospect.preferred_move_in_date}
              </span>
            )}
          </div>

          {/* Stage Selector */}
          <div className="space-y-1">
            <Label className="text-xs">Pipeline Stage</Label>
            <Select value={stage} onValueChange={v => handleStageChange(v as ProspectStage)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map(s => (
                  <SelectItem key={s} value={s}>{STAGE_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Family Contacts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold">Family Contacts</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowFamily(true)}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            {families.length === 0 && <p className="text-xs text-muted-foreground">No family contacts yet.</p>}
            {families.map(f => (
              <div key={f.id} className="text-sm flex items-center gap-2 py-1">
                <span className="font-medium text-foreground">{f.name}</span>
                {f.relationship && <span className="text-muted-foreground">({f.relationship})</span>}
                {f.phone && <span className="text-muted-foreground text-xs">{f.phone}</span>}
              </div>
            ))}
            {showFamily && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Input value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="Name" className="h-8 text-xs" />
                <Input value={familyRelation} onChange={e => setFamilyRelation(e.target.value)} placeholder="Relationship" className="h-8 text-xs" />
                <div className="flex gap-1">
                  <Input value={familyPhone} onChange={e => setFamilyPhone(e.target.value)} placeholder="Phone" className="h-8 text-xs" />
                  <Button size="sm" className="h-8 text-xs px-2" onClick={handleAddFamily}>Add</Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Tours */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold">Tours</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowTour(true)}>
                <Calendar className="w-3 h-3" /> Schedule
              </Button>
            </div>
            {prospectTours.length === 0 && <p className="text-xs text-muted-foreground">No tours scheduled.</p>}
            {prospectTours.map(t => (
              <div key={t.id} className="text-sm flex items-center gap-2 py-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{format(new Date(t.scheduled_at), "MMM d, h:mm a")}</span>
                {t.assigned_staff_name && <span className="text-muted-foreground text-xs">w/ {t.assigned_staff_name}</span>}
                <Badge variant={t.status === "completed" ? "default" : "outline"} className="text-xs">{t.status}</Badge>
              </div>
            ))}
            {showTour && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input type="datetime-local" value={tourDate} onChange={e => setTourDate(e.target.value)} className="h-8 text-xs" />
                <div className="flex gap-1">
                  <Input value={tourStaff} onChange={e => setTourStaff(e.target.value)} placeholder="Staff name" className="h-8 text-xs" />
                  <Button size="sm" className="h-8 text-xs px-2" onClick={handleScheduleTour}>Add</Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> Notes & Activity
            </Label>
            <div className="flex gap-2 mb-2">
              <Textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note…"
                className="min-h-[60px] text-sm"
              />
              <Button size="sm" className="shrink-0 self-end" onClick={handleAddNote} disabled={!newNote.trim()}>
                Add
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {notes.map(n => (
                <div key={n.id} className="bg-muted/30 rounded-lg px-3 py-2">
                  <p className="text-sm text-foreground">{n.note}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), "MMM d, h:mm a")}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>

            {stage !== "converted" ? (
              <Button size="sm" className="gap-1" onClick={() => setShowConvert(true)}>
                <UserCheck className="w-3.5 h-3.5" /> Convert to Resident
              </Button>
            ) : (
              <Badge className="bg-green-100 text-green-700 border-0">Converted ✓</Badge>
            )}
          </div>

          {/* Convert Form */}
          {showConvert && (
            <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 space-y-3 border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-foreground">Convert {prospect.name} to Resident</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Room Number *</Label>
                  <Input value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. 101A" className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Care Level</Label>
                  <Select value={careLevel} onValueChange={setCareLevel}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Basic">Basic</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="Enhanced">Enhanced</SelectItem>
                      <SelectItem value="Full">Full</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowConvert(false)}>Cancel</Button>
                <Button size="sm" onClick={handleConvert} disabled={!room.trim()} className="bg-green-600 hover:bg-green-700">
                  Confirm Conversion
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProspectDetail;
