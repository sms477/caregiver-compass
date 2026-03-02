import { useState } from "react";
import { useOrganizations, Organization } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Building2, Loader2 } from "lucide-react";

interface Props {
  onSelectOrg: (org: Organization) => void;
}

const OrganizationsManager = ({ onSelectOrg }: Props) => {
  const { organizations, loading, createOrg, updateOrg, deleteOrg } = useOrganizations();
  const [showDialog, setShowDialog] = useState(false);
  const [editOrg, setEditOrg] = useState<Organization | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openNew = () => {
    setEditOrg(null);
    setName("");
    setSlug("");
    setShowDialog(true);
  };

  const openEdit = (org: Organization) => {
    setEditOrg(org);
    setName(org.name);
    setSlug(org.slug);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) return;
    try {
      if (editOrg) {
        await updateOrg(editOrg.id, { name: name.trim(), slug: slug.trim().toLowerCase() });
        toast.success("Organization updated");
      } else {
        await createOrg(name.trim(), slug.trim().toLowerCase());
        toast.success("Organization created");
      }
      setShowDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save organization");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteOrg(deleteTarget.id);
      toast.success("Organization deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const autoSlug = (val: string) => {
    setName(val);
    if (!editOrg) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
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
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Organizations</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage RCFE operating companies and their facilities.</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> New Organization
        </Button>
      </div>

      {organizations.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center space-y-3">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No organizations yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map(org => (
            <div
              key={org.id}
              className="glass-card rounded-xl p-5 space-y-3 hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => onSelectOrg(org)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{org.name}</p>
                    <p className="text-xs text-muted-foreground">/{org.slug}</p>
                  </div>
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(org)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(org)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Created {new Date(org.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editOrg ? "Edit Organization" : "New Organization"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input value={name} onChange={e => autoSlug(e.target.value)} placeholder="e.g. Sunrise Senior Living" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Slug</label>
              <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="e.g. sunrise-senior" />
              <p className="text-xs text-muted-foreground mt-1">URL-safe identifier, auto-generated from name</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !slug.trim()}>
              {editOrg ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? 
            This will also delete all locations, memberships, and associated data. This cannot be undone.
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

export default OrganizationsManager;
