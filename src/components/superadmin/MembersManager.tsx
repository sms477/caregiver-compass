import { useState, useEffect } from "react";
import { useOrgMembers, useLocations, Organization } from "@/hooks/useOrganizations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Users, Loader2, ArrowLeft, UserCircle } from "lucide-react";

interface Props {
  org: Organization;
  onBack: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  caregiver: "Caregiver",
  reviewer: "Reviewer",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-accent/10 text-accent",
  caregiver: "bg-primary/10 text-primary",
  reviewer: "bg-secondary text-secondary-foreground",
};

const MembersManager = ({ org, onBack }: Props) => {
  const { members, loading, addMember, removeMember, updateMemberRole } = useOrgMembers(org.id);
  const { locations } = useLocations(org.id);

  const [showDialog, setShowDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("caregiver");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [allProfiles, setAllProfiles] = useState<{ user_id: string; display_name: string }[]>([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name");
      if (data) setAllProfiles(data);
    };
    fetchProfiles();
  }, []);

  // Find users not yet in this org
  const existingUserIds = new Set(members.map(m => m.user_id));
  const availableUsers = allProfiles.filter(p => !existingUserIds.has(p.user_id));

  const handleAdd = async () => {
    if (!selectedUserId) return;
    try {
      await addMember(
        selectedUserId,
        selectedRole,
        selectedLocationId === "all" ? null : selectedLocationId
      );
      toast.success("Member added to organization");
      setShowDialog(false);
      setSelectedUserId("");
      setSelectedRole("caregiver");
      setSelectedLocationId("all");
    } catch (err: any) {
      toast.error(err.message || "Failed to add member");
    }
  };

  const handleRemove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeMember(deleteTarget);
      toast.success("Member removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleRoleChange = async (membershipId: string, newRole: string) => {
    try {
      await updateMemberRole(membershipId, newRole);
      toast.success("Role updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    }
  };

  const getLocationName = (locId: string | null) => {
    if (!locId) return "All Locations";
    return locations.find(l => l.id === locId)?.name || "Unknown";
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
            <h2 className="text-xl font-display font-bold text-foreground">{org.name} — Members</h2>
            <p className="text-sm text-muted-foreground mt-1">Assign staff to this organization and set their roles.</p>
          </div>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Member
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No members assigned. Add team members to this organization.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map(m => (
            <div key={m.id} className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <UserCircle className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{m.user_name}</p>
                  <p className="text-xs text-muted-foreground">{getLocationName(m.location_id)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select value={m.role} onValueChange={val => handleRoleChange(m.id, val)}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="caregiver">Caregiver</SelectItem>
                    <SelectItem value="reviewer">Reviewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(m.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member to {org.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Team Member</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <SelectItem value="_none" disabled>No available users</SelectItem>
                  ) : (
                    availableUsers.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>{u.display_name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full facility management</SelectItem>
                  <SelectItem value="caregiver">Caregiver — Clock in, log tasks</SelectItem>
                  <SelectItem value="reviewer">Reviewer — Read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Location Access</label>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations (org-wide)</SelectItem>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                "All Locations" gives access to every facility in this organization.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!selectedUserId}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove this member from the organization? They will lose access to all locations.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembersManager;
