import { useApp } from "@/contexts/AppContext";
import { Employee, US_STATES } from "@/types";
import { useState } from "react";
import { User, Mail, Phone, DollarSign, Edit2, Check, X, UserPlus, Loader2, Copy, Building2, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/payroll";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const EmployeeProfiles = () => {
  const { employees, updateEmployee, refreshEmployees } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Employee | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", hourlyRate: "17.00", jobTitle: "Caregiver" });
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Delete user roles first, then profile
      await supabase.from("user_roles").delete().eq("user_id", deleteTarget.id);
      const { error } = await supabase.from("profiles").delete().eq("user_id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Team member removed", description: `${deleteTarget.name} has been deleted.` });
      await refreshEmployees();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

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
      // Get caller's org and location
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      let org_id: string | null = null;
      let location_id: string | null = null;
      if (userId) {
        const { data: membership } = await supabase
          .from("org_memberships")
          .select("org_id, location_id")
          .eq("user_id", userId)
          .limit(1)
          .single();
        if (membership) {
          org_id = membership.org_id;
          // If admin has no specific location, get the first location in the org
          if (!membership.location_id) {
            const { data: loc } = await supabase
              .from("locations")
              .select("id")
              .eq("org_id", membership.org_id)
              .limit(1)
              .single();
            location_id = loc?.id || null;
          } else {
            location_id = membership.location_id;
          }
        }
      }

      const { data, error } = await supabase.functions.invoke("invite-team-member", {
        body: {
          email: inviteForm.email,
          display_name: inviteForm.name,
          hourly_rate: parseFloat(inviteForm.hourlyRate) || 0,
          job_title: inviteForm.jobTitle || "Caregiver",
          org_id,
          location_id,
          site_url: window.location.origin,
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
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(emp)}
                        className="text-muted-foreground hover:text-primary transition-colors p-1"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(emp)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
                    <label className="text-xs text-muted-foreground">Worker Type</label>
                    {isEditing ? (
                      <select
                        value={editForm?.workerType || "employee"}
                        onChange={e => setEditForm(prev => prev ? { ...prev, workerType: e.target.value as Employee["workerType"] } : null)}
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="employee">W-2 Employee</option>
                        <option value="contractor">1099 Contractor</option>
                      </select>
                    ) : (
                      <p className="font-medium text-foreground">
                        {data.workerType === "contractor" ? "1099 Contractor" : "W-2 Employee"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Work State</label>
                    {isEditing ? (
                      <select
                        value={editForm?.workState || "CA"}
                        onChange={e => setEditForm(prev => prev ? { ...prev, workState: e.target.value as Employee["workState"] } : null)}
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <p className="font-medium text-foreground">{data.workState || "CA"}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Pay Type</label>
                    {isEditing ? (
                      <select
                        value={editForm?.payType || "hourly"}
                        onChange={e => setEditForm(prev => prev ? { ...prev, payType: e.target.value as Employee["payType"] } : null)}
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="salaried">Salaried</option>
                      </select>
                    ) : (
                      <p className="font-medium text-foreground capitalize">{data.payType || "hourly"}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> {data.payType === "salaried" ? "Annual Salary" : "Hourly Rate"}
                    </label>
                    {isEditing ? (
                      data.payType === "salaried" ? (
                        <input
                          type="number"
                          step="1000"
                          value={editForm?.annualSalary}
                          onChange={e => setEditForm(prev => prev ? { ...prev, annualSalary: parseFloat(e.target.value) || 0 } : null)}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.50"
                          value={editForm?.hourlyRate}
                          onChange={e => setEditForm(prev => prev ? { ...prev, hourlyRate: parseFloat(e.target.value) || 0 } : null)}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      )
                    ) : (
                      <p className="font-semibold text-foreground">
                        {data.payType === "salaried" ? formatCurrency(data.annualSalary) + "/yr" : formatCurrency(data.hourlyRate) + "/hr"}
                      </p>
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

                {/* Shift Differentials */}
                <div className="border-t border-border pt-3 space-y-2">
                  <label className="text-xs text-muted-foreground font-medium">Shift Differentials</label>
                  {(data.shiftDifferentials || []).length === 0 && !isEditing && (
                    <p className="text-xs text-muted-foreground italic">None configured</p>
                  )}
                  {(data.shiftDifferentials || []).map((diff, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {isEditing ? (
                        <>
                          <input
                            value={diff.label}
                            onChange={e => {
                              const diffs = [...(editForm?.shiftDifferentials || [])];
                              diffs[idx] = { ...diffs[idx], label: e.target.value };
                              setEditForm(prev => prev ? { ...prev, shiftDifferentials: diffs } : null);
                            }}
                            placeholder="Label"
                            className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={diff.multiplier}
                            onChange={e => {
                              const diffs = [...(editForm?.shiftDifferentials || [])];
                              diffs[idx] = { ...diffs[idx], multiplier: parseFloat(e.target.value) || 1 };
                              setEditForm(prev => prev ? { ...prev, shiftDifferentials: diffs } : null);
                            }}
                            className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const diffs = (editForm?.shiftDifferentials || []).filter((_, i) => i !== idx);
                              setEditForm(prev => prev ? { ...prev, shiftDifferentials: diffs } : null);
                            }}
                            className="text-destructive text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <span className="text-foreground">{diff.label}: <span className="font-medium">{((diff.multiplier - 1) * 100).toFixed(0)}% extra</span></span>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button
                      onClick={() => {
                        const diffs = [...(editForm?.shiftDifferentials || []), { label: "", multiplier: 1.10 }];
                        setEditForm(prev => prev ? { ...prev, shiftDifferentials: diffs } : null);
                      }}
                      className="text-xs text-primary font-medium"
                    >
                      + Add Differential
                    </button>
                  )}
                </div>

                {/* W-4 & Tax Config */}
                <div className="border-t border-border pt-3 space-y-2">
                  <label className="text-xs text-muted-foreground font-medium">W-4 / Tax Configuration</label>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Fed. Allowances</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm?.federalAllowances}
                          onChange={e => setEditForm(prev => prev ? { ...prev, federalAllowances: parseInt(e.target.value) || 0 } : null)}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      ) : (
                        <p className="text-foreground font-medium">{data.federalAllowances}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">State Allowances</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm?.stateAllowances}
                          onChange={e => setEditForm(prev => prev ? { ...prev, stateAllowances: parseInt(e.target.value) || 0 } : null)}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      ) : (
                        <p className="text-foreground font-medium">{data.stateAllowances}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Addl. Withholding (W-4 4c)</label>
                      {isEditing ? (
                        <input
                          type="number"
                          step="1"
                          value={editForm?.w4?.additionalWithholding || 0}
                          onChange={e => setEditForm(prev => prev ? { ...prev, w4: { ...prev.w4, additionalWithholding: parseFloat(e.target.value) || 0 } } : null)}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      ) : (
                        <p className="text-foreground font-medium">{formatCurrency(data.w4?.additionalWithholding || 0)}</p>
                      )}
                    </div>
                    <div className="space-y-1 flex items-end gap-2">
                      <label className="text-xs text-muted-foreground">Exempt</label>
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={editForm?.w4?.isExempt || false}
                          onChange={e => setEditForm(prev => prev ? { ...prev, w4: { ...prev.w4, isExempt: e.target.checked } } : null)}
                          className="w-5 h-5 accent-primary"
                        />
                      ) : (
                        <p className="text-foreground font-medium">{data.w4?.isExempt ? "Yes" : "No"}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border-t border-border pt-3 space-y-2">
                  <label className="text-xs text-muted-foreground font-medium">Deductions (per pay period)</label>
                  {(data.deductions || []).length === 0 && !isEditing && (
                    <p className="text-xs text-muted-foreground italic">None configured</p>
                  )}
                  {(data.deductions || []).map((ded, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {isEditing ? (
                        <>
                          <input
                            value={ded.label}
                            onChange={e => {
                              const deds = [...(editForm?.deductions || [])];
                              deds[idx] = { ...deds[idx], label: e.target.value };
                              setEditForm(prev => prev ? { ...prev, deductions: deds } : null);
                            }}
                            placeholder="Label"
                            className="w-28 rounded-md border border-border bg-background px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                          <select
                            value={ded.type}
                            onChange={e => {
                              const deds = [...(editForm?.deductions || [])];
                              deds[idx] = { ...deds[idx], type: e.target.value as "pre_tax" | "post_tax" };
                              setEditForm(prev => prev ? { ...prev, deductions: deds } : null);
                            }}
                            className="w-24 rounded-md border border-border bg-background px-1 py-1 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                          >
                            <option value="pre_tax">Pre-tax</option>
                            <option value="post_tax">Post-tax</option>
                          </select>
                          <input
                            type="number"
                            step="1"
                            value={ded.amount}
                            onChange={e => {
                              const deds = [...(editForm?.deductions || [])];
                              deds[idx] = { ...deds[idx], amount: parseFloat(e.target.value) || 0 };
                              setEditForm(prev => prev ? { ...prev, deductions: deds } : null);
                            }}
                            className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const deds = (editForm?.deductions || []).filter((_, i) => i !== idx);
                              setEditForm(prev => prev ? { ...prev, deductions: deds } : null);
                            }}
                            className="text-destructive text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <span className="text-foreground">
                          {ded.label}: <span className="font-medium">{formatCurrency(ded.amount)}</span>
                          <span className="text-muted-foreground ml-1">({ded.type === "pre_tax" ? "pre-tax" : "post-tax"})</span>
                        </span>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button
                      onClick={() => {
                        const deds = [...(editForm?.deductions || []), { label: "", type: "pre_tax" as const, amount: 0 }];
                        setEditForm(prev => prev ? { ...prev, deductions: deds } : null);
                      }}
                      className="text-xs text-primary font-medium"
                    >
                      + Add Deduction
                    </button>
                  )}
                </div>

                {/* Bank / Direct Deposit Info */}
                <div className="border-t border-border pt-3 space-y-2">
                  <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Direct Deposit
                  </label>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Bank Name</label>
                        <input
                          value={editForm?.bankInfo?.bankName || ""}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            bankInfo: { ...(prev.bankInfo || { bankName: "", routingNumber: "", accountNumber: "", accountType: "checking" as const }), bankName: e.target.value }
                          } : null)}
                          placeholder="Chase, Wells Fargo..."
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Account Type</label>
                        <select
                          value={editForm?.bankInfo?.accountType || "checking"}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            bankInfo: { ...(prev.bankInfo || { bankName: "", routingNumber: "", accountNumber: "", accountType: "checking" as const }), accountType: e.target.value as "checking" | "savings" }
                          } : null)}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                          <option value="checking">Checking</option>
                          <option value="savings">Savings</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Routing Number</label>
                        <input
                          value={editForm?.bankInfo?.routingNumber || ""}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            bankInfo: { ...(prev.bankInfo || { bankName: "", routingNumber: "", accountNumber: "", accountType: "checking" as const }), routingNumber: e.target.value }
                          } : null)}
                          placeholder="9 digits"
                          maxLength={9}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Account Number</label>
                        <input
                          value={editForm?.bankInfo?.accountNumber || ""}
                          onChange={e => setEditForm(prev => prev ? {
                            ...prev,
                            bankInfo: { ...(prev.bankInfo || { bankName: "", routingNumber: "", accountNumber: "", accountType: "checking" as const }), accountNumber: e.target.value }
                          } : null)}
                          placeholder="Account number"
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : data.bankInfo ? (
                    <div className="text-sm text-foreground space-y-1">
                      <p>{data.bankInfo.bankName} · <span className="capitalize">{data.bankInfo.accountType}</span></p>
                      <p className="text-muted-foreground">Account ending in {data.bankInfo.accountNumber?.slice(-4) || "****"}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Not configured — direct deposit unavailable</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This will delete their profile and role assignments. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeProfiles;
