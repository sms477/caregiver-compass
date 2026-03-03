import { useState } from "react";
import { Shift } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface ShiftEditorProps {
  shift: Shift;
  onSaved: () => void;
}

export default function ShiftEditor({ shift, onSaved }: ShiftEditorProps) {
  const [open, setOpen] = useState(false);

  const toLocalDatetime = (d: Date) => {
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const [clockIn, setClockIn] = useState(toLocalDatetime(new Date(shift.clockIn)));
  const [clockOut, setClockOut] = useState(shift.clockOut ? toLocalDatetime(new Date(shift.clockOut)) : "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the edit.");
      return;
    }

    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const newClockIn = new Date(clockIn).toISOString();
      const newClockOut = clockOut ? new Date(clockOut).toISOString() : null;

      const { error } = await supabase
        .from("shifts")
        .update({
          clock_in: newClockIn,
          clock_out: newClockOut,
        } as any)
        .eq("id", shift.id);

      if (error) throw error;

      // Log audit entry
      if (userId) {
        await supabase.from("audit_log").insert({
          table_name: "shifts",
          record_id: shift.id,
          action: "ADMIN_EDIT",
          performed_by: userId,
          old_data: {
            clock_in: new Date(shift.clockIn).toISOString(),
            clock_out: shift.clockOut ? new Date(shift.clockOut).toISOString() : null,
          } as unknown as Json,
          new_data: {
            clock_in: newClockIn,
            clock_out: newClockOut,
            reason: reason.trim(),
          } as unknown as Json,
        });
      }

      toast.success("Shift updated successfully");
      setOpen(false);
      onSaved();
    } catch (err: any) {
      toast.error("Failed to update shift: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Edit shift times"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Shift — {shift.caregiverName}</DialogTitle>
            <DialogDescription>
              Adjust clock-in/out times. An audit record will be created.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clockIn">Clock In</Label>
              <Input
                id="clockIn"
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clockOut">Clock Out</Label>
              <Input
                id="clockOut"
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
              {!clockOut && (
                <p className="text-xs text-warning">Leave empty to keep shift active (no clock-out).</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for edit *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Caregiver forgot to clock out, actual end was 6:00 PM"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !reason.trim()}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
