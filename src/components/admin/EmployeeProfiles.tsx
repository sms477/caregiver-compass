import { useApp } from "@/contexts/AppContext";
import { Employee } from "@/types";
import { useState } from "react";
import { User, Mail, Phone, DollarSign, Edit2, Check, X, UserPlus, Loader2, Copy } from "lucide-react";
import { formatCurrency } from "@/lib/payroll";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EmployeeProfiles = () => {
  const { employees, updateEmployee, refreshEmployees } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Employee | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", hourlyRate: "17.00", jobTitle: "Caregiver" });
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const { toast } = useToast();

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditForm({ ...emp });
  };

  const saveEdit = () => {
    if (editForm) {
      updateEmployee(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleInvite = async () => {
    if (!inviteForm.name || !inviteForm.email) return;
    setInviting(true);
    setInviteLink(null);

    try {
      const { data, error } = await supabase.functions.invoke("invite-team-member", {
        body: {
          email: inviteForm.email,
          display_name: inviteForm.name,
          hourly_rate: parseFloat(inviteForm.hourlyRate) || 0,
          job_title: inviteForm.jobTitle || "Caregiver",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Team member invited!",
        description: `${inviteForm.name} has been added. Share the password reset link so they can set their password.`,
      });

      if (data?.invite_link) {
        setInviteLink(data.invite_link);
      }

      setInviteForm({ name: "", email: "", hourlyRate: "17.00", jobTitle: "Caregiver" });
      await refreshEmployees();
    } catch (err: any) {
      toast({
        title: "Invite failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast({ title: "Copied!", description: "Invite link copied to clipboard." });
    }
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Team Members</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage employee profiles, pay rates, and tax information.</p>
        </div>
        <button
          onClick={() => { setShowInvite(!showInvite); setInviteLink(null); }}
          className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.97] transition-all"
        >
          <UserPlus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="glass-card rounded-xl p-5 space-y-4 border-2 border-primary/20">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Invite Team Member
          </h3>
          <p className="text-sm text-muted-foreground">
            Add a new caregiver. They'll receive a link to set their password and log in.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</label>
              <input
                value={inviteForm.name}
                onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Maria Garcia"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                placeholder="maria@example.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hourly Rate ($)</label>
              <input
                type="number"
                step="0.50"
                value={inviteForm.hourlyRate}
                onChange={e => setInviteForm(f => ({ ...f, hourlyRate: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Job Title</label>
              <input
                value={inviteForm.jobTitle}
                onChange={e => setInviteForm(f => ({ ...f, jobTitle: e.target.value }))}
                placeholder="Caregiver"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteForm.name || !inviteForm.email}
              className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {inviting && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Invite
            </button>
            <button
              onClick={() => { setShowInvite(false); setInviteLink(null); }}
              className="rounded-lg border border-border text-muted-foreground px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Invite Link */}
          {inviteLink && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-success">✓ Team member created! Share this password reset link:</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground"
                />
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-xs font-medium"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Employee Cards */}
      {employees.length === 0 && !showInvite ? (
        <div className="glass-card rounded-xl p-12 text-center space-y-3">
          <UserPlus className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No team members yet. Add your first team member above.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {employees.map(emp => {
            const isEditing = editingId === emp.id;
            const data = isEditing && editForm ? editForm : emp;

            return (
              <div key={emp.id} className="glass-card rounded-xl p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.role} · Since {new Date(emp.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                    </div>
                  </div>
                  {!isEditing ? (
                    <button
                      onClick={() => startEdit(emp)}
                      className="text-muted-foreground hover:text-primary transition-colors p-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="p-1 text-success hover:bg-success/10 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEdit} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Pay Rate
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.50"
                        value={editForm?.hourlyRate}
                        onChange={e => setEditForm(prev => prev ? { ...prev, hourlyRate: parseFloat(e.target.value) || 0 } : null)}
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    ) : (
                      <p className="font-semibold text-foreground">{formatCurrency(data.hourlyRate)}/hr</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Filing Status</label>
                    {isEditing ? (
                      <select
                        value={editForm?.filingStatus}
                        onChange={e => setEditForm(prev => prev ? { ...prev, filingStatus: e.target.value as Employee["filingStatus"] } : null)}
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="head_of_household">Head of Household</option>
                      </select>
                    ) : (
                      <p className="font-medium text-foreground capitalize">{data.filingStatus.replace("_", " ")}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Phone
                    </label>
                    {isEditing ? (
                      <input
                        value={editForm?.phone}
                        onChange={e => setEditForm(prev => prev ? { ...prev, phone: e.target.value } : null)}
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    ) : (
                      <p className="text-foreground">{data.phone || "—"}</p>
                    )}
                  </div>
                </div>

                {/* Tax Info */}
                <div className="border-t border-border pt-3 flex gap-4 text-xs text-muted-foreground">
                  <span>Federal Allowances: <span className="text-foreground font-medium">{data.federalAllowances}</span></span>
                  <span>State Allowances: <span className="text-foreground font-medium">{data.stateAllowances}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeeProfiles;
