import { useState } from "react";
import { useResidents, DBResident, DBMedication } from "@/hooks/useResidents";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Pill, Users, Loader2 } from "lucide-react";

const ResidentsManager = () => {
  const { residents, loading, refresh } = useResidents();
  const [showResidentDialog, setShowResidentDialog] = useState(false);
  const [editResident, setEditResident] = useState<DBResident | null>(null);
  const [resName, setResName] = useState("");
  const [resRoom, setResRoom] = useState("");

  const [showMedDialog, setShowMedDialog] = useState(false);
  const [medResident, setMedResident] = useState<DBResident | null>(null);
  const [editMed, setEditMed] = useState<DBMedication | null>(null);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medSchedule, setMedSchedule] = useState("Morning");

  const [deleting, setDeleting] = useState<string | null>(null);

  // Resident CRUD
  const openNewResident = () => {
    setEditResident(null);
    setResName("");
    setResRoom("");
    setShowResidentDialog(true);
  };

  const openEditResident = (r: DBResident) => {
    setEditResident(r);
    setResName(r.name);
    setResRoom(r.room);
    setShowResidentDialog(true);
  };

  const saveResident = async () => {
    if (!resName.trim() || !resRoom.trim()) return;
    if (editResident) {
      const { error } = await supabase.from("residents").update({ name: resName.trim(), room: resRoom.trim() }).eq("id", editResident.id);
      if (error) { toast.error("Failed to update resident"); return; }
      toast.success("Resident updated");
    } else {
      const { error } = await supabase.from("residents").insert({ name: resName.trim(), room: resRoom.trim() });
      if (error) { toast.error("Failed to add resident"); return; }
      toast.success("Resident added");
    }
    setShowResidentDialog(false);
    refresh();
  };

  const deleteResident = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("residents").delete().eq("id", id);
    if (error) { toast.error("Failed to delete resident"); }
    else { toast.success("Resident removed"); }
    setDeleting(null);
    refresh();
  };

  // Medication CRUD
  const openNewMed = (r: DBResident) => {
    setMedResident(r);
    setEditMed(null);
    setMedName("");
    setMedDosage("");
    setMedSchedule("Morning");
    setShowMedDialog(true);
  };

  const openEditMed = (r: DBResident, m: DBMedication) => {
    setMedResident(r);
    setEditMed(m);
    setMedName(m.name);
    setMedDosage(m.dosage);
    setMedSchedule(m.schedule);
    setShowMedDialog(true);
  };

  const saveMed = async () => {
    if (!medName.trim() || !medDosage.trim() || !medResident) return;
    if (editMed) {
      const { error } = await supabase.from("medications").update({ name: medName.trim(), dosage: medDosage.trim(), schedule: medSchedule }).eq("id", editMed.id);
      if (error) { toast.error("Failed to update medication"); return; }
      toast.success("Medication updated");
    } else {
      const { error } = await supabase.from("medications").insert({ resident_id: medResident.id, name: medName.trim(), dosage: medDosage.trim(), schedule: medSchedule });
      if (error) { toast.error("Failed to add medication"); return; }
      toast.success("Medication added");
    }
    setShowMedDialog(false);
    refresh();
  };

  const deleteMed = async (id: string) => {
    const { error } = await supabase.from("medications").delete().eq("id", id);
    if (error) { toast.error("Failed to delete medication"); }
    else { toast.success("Medication removed"); }
    refresh();
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
          <h2 className="text-xl font-display font-bold text-foreground">Residents & Medications</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage facility residents and their medication schedules.</p>
        </div>
        <Button onClick={openNewResident} className="gap-2">
          <Plus className="w-4 h-4" /> Add Resident
        </Button>
      </div>

      {residents.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No residents yet. Add your first resident to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {residents.map(r => (
            <div key={r.id} className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{r.name}</h3>
                  <p className="text-xs text-muted-foreground">{r.room}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditResident(r)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteResident(r.id)} disabled={deleting === r.id}>
                    {deleting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                  </Button>
                </div>
              </div>

              {/* Medications */}
              <div className="pl-2 border-l-2 border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Pill className="w-3 h-3" /> Medications ({r.medications.length})
                  </span>
                  <Button variant="outline" size="sm" onClick={() => openNewMed(r)} className="h-7 text-xs gap-1">
                    <Plus className="w-3 h-3" /> Add Med
                  </Button>
                </div>
                {r.medications.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No medications assigned.</p>
                )}
                {r.medications.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name} — {m.dosage}</p>
                      <p className="text-xs text-muted-foreground">{m.schedule}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMed(r, m)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMed(m.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resident Dialog */}
      <Dialog open={showResidentDialog} onOpenChange={setShowResidentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editResident ? "Edit Resident" : "Add Resident"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input value={resName} onChange={e => setResName(e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Room</label>
              <Input value={resRoom} onChange={e => setResRoom(e.target.value)} placeholder="e.g. Room 1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResidentDialog(false)}>Cancel</Button>
            <Button onClick={saveResident} disabled={!resName.trim() || !resRoom.trim()}>
              {editResident ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Medication Dialog */}
      <Dialog open={showMedDialog} onOpenChange={setShowMedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMed ? "Edit Medication" : `Add Medication for ${medResident?.name}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Medication Name</label>
              <Input value={medName} onChange={e => setMedName(e.target.value)} placeholder="e.g. Lisinopril" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Dosage</label>
              <Input value={medDosage} onChange={e => setMedDosage(e.target.value)} placeholder="e.g. 10mg" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Schedule</label>
              <Select value={medSchedule} onValueChange={setMedSchedule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Afternoon">Afternoon</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                  <SelectItem value="Bedtime">Bedtime</SelectItem>
                  <SelectItem value="As Needed">As Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMedDialog(false)}>Cancel</Button>
            <Button onClick={saveMed} disabled={!medName.trim() || !medDosage.trim()}>
              {editMed ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResidentsManager;
