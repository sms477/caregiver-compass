import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DBIncident {
  id: string;
  incident_type: string;
  resident_id: string | null;
  resident_name: string;
  staff_id: string;
  staff_name: string;
  occurred_at: string;
  description: string;
  immediate_action: string;
  follow_up_required: boolean;
  follow_up_notes: string | null;
  status: string;
  created_at: string;
}

export function useIncidents() {
  const [incidents, setIncidents] = useState<DBIncident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("incidents")
      .select("*")
      .order("occurred_at", { ascending: false });
    setIncidents((data as DBIncident[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  return { incidents, loading, refresh: fetchIncidents };
}
