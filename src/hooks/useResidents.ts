import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DBResident {
  id: string;
  name: string;
  room: string;
  medications: DBMedication[];
}

export interface DBMedication {
  id: string;
  resident_id: string;
  name: string;
  dosage: string;
  schedule: string;
}

export function useResidents() {
  const [residents, setResidents] = useState<DBResident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResidents = useCallback(async () => {
    setLoading(true);
    const { data: resRows } = await supabase
      .from("residents")
      .select("*")
      .order("name");

    const { data: medRows } = await supabase
      .from("medications")
      .select("*")
      .order("name");

    const mapped: DBResident[] = (resRows || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      room: r.room,
      medications: (medRows || []).filter((m: any) => m.resident_id === r.id).map((m: any) => ({
        id: m.id,
        resident_id: m.resident_id,
        name: m.name,
        dosage: m.dosage,
        schedule: m.schedule,
      })),
    }));
    setResidents(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  return { residents, loading, refresh: fetchResidents };
}
