import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DBHospiceAgency {
  id: string;
  name: string;
  nurse_phone_24h: string | null;
  office_phone: string | null;
}

export interface DBResident {
  id: string;
  name: string;
  room: string;
  care_level: string;
  is_hospice: boolean;
  is_non_ambulatory: boolean;
  acuity_score: number;
  restricted_conditions: string[];
  last_assessment_date: string | null;
  lic602a_expiry: string | null;
  dnr_on_file: boolean;
  hospice_agency_id: string | null;
  hospice_agency: DBHospiceAgency | null;
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
      .select("*, hospice_agencies(*)")
      .order("name");

    const { data: medRows } = await supabase
      .from("medications")
      .select("*")
      .order("name");

    const mapped: DBResident[] = (resRows || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      room: r.room,
      care_level: r.care_level || "Basic",
      is_hospice: r.is_hospice || false,
      is_non_ambulatory: r.is_non_ambulatory || false,
      acuity_score: r.acuity_score || 0,
      restricted_conditions: r.restricted_conditions || [],
      last_assessment_date: r.last_assessment_date,
      lic602a_expiry: r.lic602a_expiry,
      dnr_on_file: r.dnr_on_file || false,
      hospice_agency_id: r.hospice_agency_id,
      hospice_agency: r.hospice_agencies || null,
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
