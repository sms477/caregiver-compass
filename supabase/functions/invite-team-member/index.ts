import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller identity
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check caller is admin or super_admin
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const isAdmin = callerRoles?.some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const { email, display_name, hourly_rate, job_title, role, org_id, location_id } = await req.json();
    if (!email || !display_name) {
      return new Response(JSON.stringify({ error: "Email and display name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user via admin API (auto-confirms email)
    const tempPassword = crypto.randomUUID().slice(0, 16) + "A1!";
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { display_name },
    });

    if (createError) {
      // If user already exists, try to look them up and still add membership
      if (createError.message.toLowerCase().includes("already been registered")) {
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
        
        if (existingUser && org_id) {
          // Add org membership for existing user
          const memberRole = role || "caregiver";
          await adminClient.from("org_memberships").insert({
            user_id: existingUser.id,
            org_id,
            location_id: location_id || null,
            role: memberRole,
          });

          // Also ensure user_roles has this role
          const { data: existingRole } = await adminClient
            .from("user_roles")
            .select("id")
            .eq("user_id", existingUser.id)
            .eq("role", memberRole)
            .maybeSingle();
          if (!existingRole) {
            await adminClient.from("user_roles").insert({
              user_id: existingUser.id,
              role: memberRole,
            });
          }

          return new Response(
            JSON.stringify({
              success: true,
              user_id: existingUser.id,
              existing_user: true,
              message: `Existing user ${email} added to organization as ${memberRole}.`,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ error: `A user with email "${email}" already exists.` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user?.id;

    // Update profile
    if (userId) {
      await adminClient
        .from("profiles")
        .update({
          hourly_rate: hourly_rate || 0,
          job_title: job_title || "Caregiver",
          org_id: org_id || null,
        })
        .eq("user_id", userId);

      // Add the specified role to user_roles (handle_new_user trigger adds 'caregiver' by default)
      const memberRole = role || "caregiver";
      if (memberRole !== "caregiver") {
        await adminClient.from("user_roles").insert({
          user_id: userId,
          role: memberRole,
        });
      }

      // Create org membership if org_id provided
      if (org_id) {
        await adminClient.from("org_memberships").insert({
          user_id: userId,
          org_id,
          location_id: location_id || null,
          role: memberRole,
        });
      }
    }

    // Generate password reset link
    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || "";
    const { data: resetData } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        invite_link: resetData?.properties?.action_link || null,
        message: `Team member ${display_name} created as ${role || "caregiver"}. They can reset their password to log in.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
