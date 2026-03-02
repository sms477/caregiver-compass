import { useState } from "react";
import { useLocations, Location, Organization } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, Loader2, ArrowLeft } from "lucide-react";

interface Props {
  org: Organization;
  onBack: () => void;
}

const LocationsManager = ({ org, onBack }: Props) => {
  const { locations, loading, createLocation, updateLocation, deleteLocation } = useLocations(org.id);
  const [showDialog, setShowDialog] = useState(false);
  const [editLoc, setEditLoc] = useState<Location | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [license, setLicense] = useState("");
  const [phone, setPhone] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openNew = () => {
    setEditLoc(null);
    setName(""); setAddress(""); setLicense(""); setPhone("");
    setShowDialog(true);
  };

  const openEdit = (loc: Location) => {
    setEditLoc(loc);
    setName(loc.name);
    setAddress(loc.address || "");
    setLicense(loc.license_number || "");
    setPhone(loc.phone || "");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      const payload = {
        name: name.trim(),
        address: address.trim() || undefined,
        license_number: license.trim() || undefined,
        phone: phone.trim() || undefined,
      };
      if (editLoc) {
        await updateLocation(editLoc.id, payload);
        toast.success("Location updated");
      } else {
        await createLocation(payload);
        toast.success("Location added");
      }
      setShowDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save location");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLocation(deleteTarget.id);
      toast.success("Location deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">{org.name} — Locations</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage RCFE facilities for this organization.</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Add Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center space-y-3">
          <MapPin className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No locations yet. Add the first RCFE facility.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {locations.map(loc => (
            <div key={loc.id} className="glass-card rounded-xl p-5 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{loc.name}</p>
                    {loc.address && <p className="text-xs text-muted-foreground">{loc.address}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(loc)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(loc)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                {loc.license_number && <span>License: {loc.license_number}</span>}
                {loc.phone && <span>Phone: {loc.phone}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editLoc ? "Edit Location" : "Add Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Facility Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sunrise Home — Oak Street" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Address</label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Oak St, Sacramento, CA 95814" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">License Number</label>
                <Input value={license} onChange={e => setLicense(e.target.value)} placeholder="RCFE-XXXXXX" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Phone</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(916) 555-0100" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {editLoc ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? 
            All residents, shifts, and data at this location will be lost.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationsManager;
