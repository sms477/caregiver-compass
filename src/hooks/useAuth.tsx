import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "caregiver" | "reviewer";

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  profile: { display_name: string; job_title: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ display_name: string; job_title: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch roles and profile with setTimeout to avoid deadlock
          setTimeout(async () => {
            const [rolesRes, profileRes] = await Promise.all([
              supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", session.user.id),
              supabase
                .from("profiles")
                .select("display_name, job_title")
                .eq("user_id", session.user.id)
                .single(),
            ]);

            if (rolesRes.data) {
              setRoles(rolesRes.data.map((r: any) => r.role as AppRole));
            }
            if (profileRes.data) {
              setProfile(profileRes.data);
            }
            setLoading(false);
          }, 0);
        } else {
          setRoles([]);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
      // The onAuthStateChange will handle the rest
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, roles, profile, loading, signOut };
}
