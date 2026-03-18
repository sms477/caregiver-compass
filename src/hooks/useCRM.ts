import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProspectStage = "new" | "contacted" | "tour_scheduled" | "follow_up" | "converted";
export type ProspectSource = "referral" | "website" | "walk_in" | "phone" | "other";
export type ProspectPriority = "low" | "medium" | "high";

export interface Prospect {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: ProspectSource;
  preferred_move_in_date: string | null;
  stage: ProspectStage;
  priority: ProspectPriority;
  tags: string[];
  notes: string | null;
  assigned_staff_id: string | null;
  location_id: string | null;
  converted_resident_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyContact {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  prospect_id: string | null;
  resident_id: string | null;
  location_id: string | null;
  created_at: string;
}

export interface Tour {
  id: string;
  prospect_id: string;
  scheduled_at: string;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  status: string;
  notes: string | null;
  location_id: string | null;
  created_at: string;
  prospect_name?: string;
}

export interface ProspectNote {
  id: string;
  prospect_id: string;
  note: string;
  note_type: string;
  created_by: string;
  created_at: string;
}

export const STAGE_CONFIG: Record<ProspectStage, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "text-blue-700", bg: "bg-blue-100" },
  contacted: { label: "Contacted", color: "text-yellow-700", bg: "bg-yellow-100" },
  tour_scheduled: { label: "Tour Scheduled", color: "text-orange-700", bg: "bg-orange-100" },
  follow_up: { label: "Follow-Up", color: "text-purple-700", bg: "bg-purple-100" },
  converted: { label: "Converted", color: "text-green-700", bg: "bg-green-100" },
};

export const STAGES: ProspectStage[] = ["new", "contacted", "tour_scheduled", "follow_up", "converted"];

export function useCRM() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [familyContacts, setFamilyContacts] = useState<FamilyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocationId, setUserLocationId] = useState<string | null>(null);

  // Fetch user's first accessible location for auto-setting on inserts
  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from("org_memberships")
        .select("org_id")
        .eq("user_id", userId)
        .limit(1)
        .single();
      if (data) {
        const { data: loc } = await supabase
          .from("locations")
          .select("id")
          .eq("org_id", data.org_id)
          .limit(1)
          .single();
        if (loc) setUserLocationId(loc.id);
      }
    })();
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [pRes, tRes, fRes] = await Promise.all([
      supabase.from("prospects").select("*").order("created_at", { ascending: false }),
      supabase.from("tours").select("*").order("scheduled_at", { ascending: true }),
      supabase.from("family_contacts").select("*").order("created_at", { ascending: false }),
    ]);
    if (pRes.data) setProspects(pRes.data as unknown as Prospect[]);
    if (tRes.data) {
      const toursWithNames = (tRes.data as unknown as Tour[]).map(t => ({
        ...t,
        prospect_name: pRes.data?.find((p: any) => p.id === t.prospect_id)?.name || "Unknown",
      }));
      setTours(toursWithNames);
    }
    if (fRes.data) setFamilyContacts(fRes.data as unknown as FamilyContact[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addProspect = async (data: Partial<Prospect>) => {
    const insertData = { ...data, location_id: data.location_id || userLocationId };
    const { error } = await supabase.from("prospects").insert(insertData as any);
    if (!error) await refresh();
    return error;
  };

  const updateProspect = async (id: string, data: Partial<Prospect>) => {
    const { error } = await supabase.from("prospects").update(data as any).eq("id", id);
    if (!error) await refresh();
    return error;
  };

  const deleteProspect = async (id: string) => {
    const { error } = await supabase.from("prospects").delete().eq("id", id);
    if (!error) await refresh();
    return error;
  };

  const updateStage = async (id: string, stage: ProspectStage) => {
    return updateProspect(id, { stage });
  };

  const addTour = async (data: Partial<Tour>) => {
    const { error } = await supabase.from("tours").insert(data as any);
    if (!error) await refresh();
    return error;
  };

  const updateTour = async (id: string, data: Partial<Tour>) => {
    const { error } = await supabase.from("tours").update(data as any).eq("id", id);
    if (!error) await refresh();
    return error;
  };

  const addFamilyContact = async (data: Partial<FamilyContact>) => {
    const { error } = await supabase.from("family_contacts").insert(data as any);
    if (!error) await refresh();
    return error;
  };

  const addNote = async (prospectId: string, note: string, noteType = "note") => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return;
    await supabase.from("prospect_notes").insert({
      prospect_id: prospectId,
      note,
      note_type: noteType,
      created_by: userId,
    } as any);
  };

  const getNotes = async (prospectId: string): Promise<ProspectNote[]> => {
    const { data } = await supabase
      .from("prospect_notes")
      .select("*")
      .eq("prospect_id", prospectId)
      .order("created_at", { ascending: false });
    return (data as unknown as ProspectNote[]) || [];
  };

  // Convert prospect to resident
  const convertProspect = async (prospect: Prospect, roomNumber: string, careLevel = "Basic") => {
    // Create resident
    const { data: resident, error: resError } = await supabase
      .from("residents")
      .insert({
        name: prospect.name,
        room: roomNumber,
        care_level: careLevel,
        location_id: prospect.location_id,
      } as any)
      .select()
      .single();
    if (resError || !resident) return resError;

    // Update prospect
    await supabase.from("prospects").update({
      stage: "converted",
      converted_resident_id: (resident as any).id,
      converted_at: new Date().toISOString(),
    } as any).eq("id", prospect.id);

    // Link family contacts to resident
    await supabase.from("family_contacts").update({
      resident_id: (resident as any).id,
    } as any).eq("prospect_id", prospect.id);

    await refresh();
    return null;
  };

  return {
    prospects, tours, familyContacts, loading,
    refresh, addProspect, updateProspect, deleteProspect,
    updateStage, addTour, updateTour,
    addFamilyContact, addNote, getNotes, convertProspect,
  };
}
