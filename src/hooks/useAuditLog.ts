import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  performed_by: string;
  old_data: any;
  new_data: any;
  created_at: string;
}

export function useAuditLog(tableName?: string) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("audit_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (tableName) {
      query = query.eq("table_name", tableName);
    }

    const { data } = await query;
    setEntries((data as unknown as AuditEntry[]) || []);
    setLoading(false);
  }, [tableName]);

  useEffect(() => { fetch(); }, [fetch]);

  return { entries, loading, refresh: fetch };
}
