import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify the calling user is an admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const billingPeriod = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // 1. Apply pending surcharges where effective date has passed
    const { data: pendingContracts } = await adminClient
      .from("contracts")
      .select("*, residents(name)")
      .not("increase_effective_date", "is", null)
      .lte("increase_effective_date", today)
      .gt("pending_care_surcharge", 0);

    let appliedCount = 0;
    for (const contract of pendingContracts || []) {
      await adminClient
        .from("contracts")
        .update({
          current_care_surcharge: contract.pending_care_surcharge,
          pending_care_surcharge: 0,
          increase_effective_date: null,
        })
        .eq("id", contract.id);
      appliedCount++;
    }

    // 2. Generate invoices for all contracts
    const { data: allContracts } = await adminClient
      .from("contracts")
      .select("*, residents(name)");

    // Check for existing invoices this period to avoid duplicates
    const { data: existingInvoices } = await adminClient
      .from("invoices")
      .select("contract_id")
      .eq("billing_period", billingPeriod);

    const existingSet = new Set((existingInvoices || []).map((i: any) => i.contract_id));

    const newInvoices: any[] = [];
    for (const c of allContracts || []) {
      if (existingSet.has(c.id)) continue;
      const total = Number(c.base_rent) + Number(c.current_care_surcharge);
      if (total <= 0) continue;
      newInvoices.push({
        resident_id: c.resident_id,
        contract_id: c.id,
        resident_name: (c as any).residents?.name || "Unknown",
        base_rent: c.base_rent,
        care_surcharge: c.current_care_surcharge,
        total_amount: total,
        billing_period: billingPeriod,
        status: "unpaid",
        location_id: c.location_id,
      });
    }

    let invoiceCount = 0;
    if (newInvoices.length > 0) {
      const { error } = await adminClient.from("invoices").insert(newInvoices);
      if (error) throw error;
      invoiceCount = newInvoices.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        applied_increases: appliedCount,
        invoices_generated: invoiceCount,
        billing_period: billingPeriod,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Billing error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
