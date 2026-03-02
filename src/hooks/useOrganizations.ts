import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  license_number: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMembership {
  id: string;
  user_id: string;
  org_id: string;
  location_id: string | null;
  role: string;
  created_at: string;
  // joined from profiles
  user_name?: string;
}

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });
    if (data && !error) setOrganizations(data as Organization[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createOrg = async (name: string, slug: string) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from("organizations")
      .insert({ name, slug, owner_id: userId } as any)
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data as Organization;
  };

  const updateOrg = async (id: string, updates: Partial<Pick<Organization, "name" | "slug">>) => {
    const { error } = await supabase
      .from("organizations")
      .update(updates as any)
      .eq("id", id);
    if (error) throw error;
    await refresh();
  };

  const deleteOrg = async (id: string) => {
    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await refresh();
  };

  return { organizations, loading, refresh, createOrg, updateOrg, deleteOrg };
}

export function useLocations(orgId: string | null) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!orgId) { setLocations([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("org_id", orgId)
      .order("name");
    if (data && !error) setLocations(data as Location[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createLocation = async (loc: { name: string; address?: string; license_number?: string; phone?: string }) => {
    if (!orgId) return null;
    const { data, error } = await supabase
      .from("locations")
      .insert({ ...loc, org_id: orgId } as any)
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data as Location;
  };

  const updateLocation = async (id: string, updates: Partial<Pick<Location, "name" | "address" | "license_number" | "phone">>) => {
    const { error } = await supabase
      .from("locations")
      .update(updates as any)
      .eq("id", id);
    if (error) throw error;
    await refresh();
  };

  const deleteLocation = async (id: string) => {
    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await refresh();
  };

  return { locations, loading, refresh, createLocation, updateLocation, deleteLocation };
}

export function useOrgMembers(orgId: string | null) {
  const [members, setMembers] = useState<OrgMembership[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!orgId) { setMembers([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("org_memberships")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (data && !error) {
      // Fetch display names for members
      const userIds = [...new Set((data as any[]).map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));
      
      setMembers((data as any[]).map(m => ({
        ...m,
        user_name: nameMap.get(m.user_id) || m.user_id.slice(0, 8) + "…",
      })));
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);

  const addMember = async (userId: string, role: string, locationId?: string | null) => {
    if (!orgId) return;
    const { error } = await supabase
      .from("org_memberships")
      .insert({
        user_id: userId,
        org_id: orgId,
        location_id: locationId || null,
        role,
      } as any);
    if (error) throw error;
    await refresh();
  };

  const removeMember = async (membershipId: string) => {
    const { error } = await supabase
      .from("org_memberships")
      .delete()
      .eq("id", membershipId);
    if (error) throw error;
    await refresh();
  };

  const updateMemberRole = async (membershipId: string, role: string) => {
    const { error } = await supabase
      .from("org_memberships")
      .update({ role } as any)
      .eq("id", membershipId);
    if (error) throw error;
    await refresh();
  };

  return { members, loading, refresh, addMember, removeMember, updateMemberRole };
}
