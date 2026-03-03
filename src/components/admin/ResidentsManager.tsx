import { useState, useEffect } from "react";
import { useResidents, DBResident, DBMedication } from "@/hooks/useResidents";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Pill, Users, Loader2, Receipt, ChevronDown, ChevronUp } from "lucide-react";
import { ResidentBadges, AcuityTag, HospiceEmergencyCard, ComplianceCountdown } from "./ResidentBadges";
import { differenceInDays } from "date-fns";

interface ResidentInvoice {
  id: string;
  billing_period: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface ProspectConversionData {
  prospectId: string;
  name: string;
  locationId: string | null;
  phone?: string | null;
  email?: string | null;
}

interface Props {
  conversionData?: ProspectConversionData | null;
  onConversionComplete?: () => void;
}

const ResidentsManager = ({ conversionData, onConversionComplete }: Props) => {
  const { residents, loading, refresh } = useResidents();
  const [showResidentDialog, setShowResidentDialog] = useState(false);
  const [editResident, setEditResident] = useState<DBResident | null>(null);
  const [resName, setResName] = useState("");
  const [resRoom, setResRoom] = useState("");
  const [resCareLevel, setResCareLevel] = useState("Basic");
  const [resIsHospice, setResIsHospice] = useState(false);
  const [resIsNonAmbulatory, setResIsNonAmbulatory] = useState(false);
  const [resDnr, setResDnr] = useState(false);
  const [resLic602a, setResLic602a] = useState("");
  const [resBaseRent, setResBaseRent] = useState("");
  const [resSecurityDeposit, setResSecurityDeposit] = useState("");
  const [savingResident, setSavingResident] = useState(false);

  // Track the prospect being converted (set from conversionData)
  const [pendingProspectId, setPendingProspectId] = useState<string | null>(null);
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(null);

  const [showMedDialog, setShowMedDialog] = useState(false);
  const [medResident, setMedResident] = useState<DBResident | null>(null);
  const [editMed, setEditMed] = useState<DBMedication | null>(null);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medSchedule, setMedSchedule] = useState("Morning");

  const [deleting, setDeleting] = useState<string | null>(null);
  const [billingHistory, setBillingHistory] = useState<Record<string, ResidentInvoice[]>>({});
  const [expandedBilling, setExpandedBilling] = useState<string | null>(null);
  const [loadingBilling, setLoadingBilling] = useState<string | null>(null);

  // Family contact fields
  const [contactName, setContactName] = useState("");
  const [contactRelationship, setContactRelationship] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Auto-open the Add Resident dialog when conversionData is provided
  useEffect(() => {
    if (conversionData) {
      setEditResident(null);
      setResName(conversionData.name);
      setResRoom("");
      setResCareLevel("Basic");
      setResIsHospice(false);
      setResIsNonAmbulatory(false);
      setResDnr(false);
      setResLic602a("");
      setResBaseRent("");
      setResSecurityDeposit("");
      setPendingProspectId(conversionData.prospectId);
      setPendingLocationId(conversionData.locationId);
      // Pre-fill family contact from prospect data
      setContactName("");
      setContactRelationship("Responsible Party");
      setContactPhone(conversionData.phone || "");
      setContactEmail(conversionData.email || "");
      // Also try to load existing family contacts for this prospect
      supabase
        .from("family_contacts")
        .select("*")
        .eq("prospect_id", conversionData.prospectId)
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const fc = data[0];
            setContactName(fc.name || "");
            setContactRelationship(fc.relationship || "Responsible Party");
            setContactPhone(fc.phone || conversionData.phone || "");
            setContactEmail(fc.email || conversionData.email || "");
          }
        });
      setShowResidentDialog(true);
    }
  }, [conversionData]);

  const loadBillingHistory = async (residentId: string) => {
    if (expandedBilling === residentId) {
      setExpandedBilling(null);
      return;
    }
    setLoadingBilling(residentId);
    const { data } = await supabase
      .from("invoices")
      .select("id, billing_period, total_amount, status, created_at")
      .eq("resident_id", residentId)
      .order("created_at", { ascending: false });
    setBillingHistory(prev => ({ ...prev, [residentId]: (data as ResidentInvoice[]) || [] }));
    setExpandedBilling(residentId);
    setLoadingBilling(null);
  };

  // Resident CRUD
  const openNewResident = () => {
    setEditResident(null);
    setResName("");
    setResRoom("");
    setResCareLevel("Basic");
    setResIsHospice(false);
    setResIsNonAmbulatory(false);
    setResDnr(false);
    setResLic602a("");
    setResBaseRent("");
    setResSecurityDeposit("");
    setPendingProspectId(null);
    setPendingLocationId(null);
    setContactName("");
    setContactRelationship("");
    setContactPhone("");
    setContactEmail("");
    setShowResidentDialog(true);
  };

  const openEditResident = (r: DBResident) => {
    setEditResident(r);
    setResName(r.name);
    setResRoom(r.room);
    setResCareLevel(r.care_level);
    setResIsHospice(r.is_hospice);
    setResIsNonAmbulatory(r.is_non_ambulatory);
    setResDnr(r.dnr_on_file);
    setResLic602a(r.lic602a_expiry || "");
    setResBaseRent("");
    setResSecurityDeposit("");
    setPendingProspectId(null);
    setPendingLocationId(null);
    setShowResidentDialog(true);
  };

  const saveResident = async () => {
    if (!resName.trim() || !resRoom.trim()) return;
    setSavingResident(true);

    const payload = {
      name: resName.trim(),
      room: resRoom.trim(),
      care_level: resCareLevel,
      is_hospice: resIsHospice,
      is_non_ambulatory: resIsNonAmbulatory,
      dnr_on_file: resDnr,
      lic602a_expiry: resLic602a || null,
      ...(pendingLocationId ? { location_id: pendingLocationId } : {}),
    };

    if (editResident) {
      const { error } = await supabase.from("residents").update(payload).eq("id", editResident.id);
      if (error) { toast.error("Failed to update resident"); setSavingResident(false); return; }
      toast.success("Resident updated");
    } else {
      // Create resident
      const { data: newResident, error } = await supabase
        .from("residents")
        .insert(payload)
        .select()
        .single();
      if (error || !newResident) { toast.error("Failed to add resident"); setSavingResident(false); return; }

      const residentId = (newResident as any).id;

      // Auto-create contract if rent or deposit provided
      const baseRent = parseFloat(resBaseRent) || 0;
      const securityDeposit = parseFloat(resSecurityDeposit) || 0;
      if (baseRent > 0 || securityDeposit > 0) {
        const { error: contractErr } = await supabase.from("contracts").insert({
          resident_id: residentId,
          base_rent: baseRent,
          security_deposit: securityDeposit,
          ...(pendingLocationId ? { location_id: pendingLocationId } : {}),
        });
        if (contractErr) {
          toast.error("Resident created but contract failed: " + contractErr.message);
        }
      }

      // Create primary family contact if name provided
      if (contactName.trim()) {
        await supabase.from("family_contacts").insert({
          resident_id: residentId,
          name: contactName.trim(),
          relationship: contactRelationship.trim() || "Responsible Party",
          phone: contactPhone.trim() || null,
          email: contactEmail.trim() || null,
          notes: "Primary / Responsible Party",
          ...(pendingLocationId ? { location_id: pendingLocationId } : {}),
          ...(pendingProspectId ? { prospect_id: pendingProspectId } : {}),
        });
      }

      // Update prospect status if this came from CRM conversion
      if (pendingProspectId) {
        await supabase.from("prospects").update({
          stage: "converted" as any,
          converted_resident_id: residentId,
          converted_at: new Date().toISOString(),
        }).eq("id", pendingProspectId);

        // Link family contacts
        await supabase.from("family_contacts").update({
          resident_id: residentId,
        } as any).eq("prospect_id", pendingProspectId);
      }

      toast.success("🎉 Resident added" + (baseRent > 0 ? " with contract!" : "!"));
    }

    setShowResidentDialog(false);
    setSavingResident(false);
    refresh();

    // If this was a CRM conversion, notify parent to redirect to billing
    if (pendingProspectId && onConversionComplete) {
      onConversionComplete();
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setShowResidentDialog(false);
      setPendingProspectId(null);
      setPendingLocationId(null);
    }
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
              <HospiceEmergencyCard resident={r} />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{r.name}</h3>
                    <ResidentBadges resident={r} />
                  </div>
                  <p className="text-xs text-muted-foreground">{r.room}</p>
                  <AcuityTag resident={r} />
                  <ComplianceCountdown resident={r} />
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

              {/* Billing History */}
              <div className="pl-2 border-l-2 border-accent/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Receipt className="w-3 h-3" /> Billing History
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => loadBillingHistory(r.id)}
                    disabled={loadingBilling === r.id}
                  >
                    {loadingBilling === r.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : expandedBilling === r.id ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    {expandedBilling === r.id ? "Hide" : "Show"}
                  </Button>
                </div>
                {expandedBilling === r.id && (
                  <div className="space-y-1">
                    {(billingHistory[r.id] || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No invoices found.</p>
                    ) : (
                      (billingHistory[r.id] || []).map(inv => {
                        const isOverdue = inv.status === "unpaid" && differenceInDays(new Date(), new Date(inv.created_at)) > 10;
                        return (
                          <div
                            key={inv.id}
                            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                              isOverdue
                                ? "bg-destructive/10 border border-destructive/30"
                                : "bg-muted/30"
                            }`}
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">{inv.billing_period}</p>
                              <p className="text-xs text-muted-foreground">
                                ${Number(inv.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              inv.status === "paid"
                                ? "bg-primary/10 text-primary"
                                : isOverdue
                                  ? "bg-destructive/20 text-destructive"
                                  : "bg-accent/10 text-accent"
                            }`}>
                              {inv.status === "paid" ? "Paid" : isOverdue ? "Overdue" : "Unpaid"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resident Dialog */}
      <Dialog open={showResidentDialog} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editResident ? "Edit Resident" : pendingProspectId ? "Convert Prospect to Resident" : "Add Resident"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {pendingProspectId && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs text-primary font-medium">🎉 Converting from CRM — a contract will be created automatically.</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input value={resName} onChange={e => setResName(e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Room</label>
              <Input value={resRoom} onChange={e => setResRoom(e.target.value)} placeholder="e.g. Room 1" />
            </div>

            {/* Care Level */}
            <div>
              <label className="text-sm font-medium text-foreground">Care Level</label>
              <Select value={resCareLevel} onValueChange={setResCareLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Level 1">Level 1</SelectItem>
                  <SelectItem value="Level 2">Level 2</SelectItem>
                  <SelectItem value="High Acuity">High Acuity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Checkboxes row */}
            <div className="grid grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <Checkbox checked={resIsHospice} onCheckedChange={(v) => setResIsHospice(!!v)} />
                Hospice
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <Checkbox checked={resIsNonAmbulatory} onCheckedChange={(v) => setResIsNonAmbulatory(!!v)} />
                Non-Ambulatory
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <Checkbox checked={resDnr} onCheckedChange={(v) => setResDnr(!!v)} />
                DNR on File
              </label>
            </div>

            {/* LIC 602A Expiry */}
            <div>
              <label className="text-sm font-medium text-foreground">LIC 602A Expiry</label>
              <Input type="date" value={resLic602a} onChange={e => setResLic602a(e.target.value)} />
            </div>

            {/* Primary Family Contact */}
            {!editResident && (
              <>
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">👨‍👩‍👧 Primary Family Contact</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Contact Name</label>
                    <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="e.g. Jane Doe" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Relationship</label>
                    <Input value={contactRelationship} onChange={e => setContactRelationship(e.target.value)} placeholder="e.g. Daughter" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Phone</label>
                    <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="e.g. (555) 123-4567" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="e.g. jane@email.com" />
                  </div>
                </div>
              </>
            )}

            {/* Billing fields */}
            {!editResident && (
              <>
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Billing / Contract</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Base Monthly Rent</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={resBaseRent}
                      onChange={e => setResBaseRent(e.target.value)}
                      placeholder="e.g. 4500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Security Deposit</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={resSecurityDeposit}
                      onChange={e => setResSecurityDeposit(e.target.value)}
                      placeholder="e.g. 2000"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)}>Cancel</Button>
            <Button onClick={saveResident} disabled={!resName.trim() || !resRoom.trim() || savingResident}>
              {savingResident ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
