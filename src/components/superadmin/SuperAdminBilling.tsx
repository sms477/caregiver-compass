import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, DollarSign, Users, TrendingUp, CreditCard } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { PLAN } from "@/components/admin/SubscriptionBilling";

interface OrgBillingInfo {
  id: string;
  name: string;
  owner_email: string;
  created_at: string;
  status: "subscribed" | "trial" | "expired";
  mrr: number;
}

const TRIAL_DAYS = 7;

const SuperAdminBilling = () => {
  const [orgs, setOrgs] = useState<OrgBillingInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);

    const { data: orgRows } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (!orgRows) { setLoading(false); return; }

    const ownerIds = [...new Set(orgRows.map(o => o.owner_id))];

    // Check Stripe status
    const { data: stripeData } = await supabase.functions.invoke("check-all-subscriptions", {
      body: { owner_ids: ownerIds },
    });

    const statusMap = new Map<string, string>(
      stripeData?.results?.map((r: any) => [r.user_id, r.status]) || []
    );

    // Get owner emails from profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", ownerIds);
    const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

    const mapped: OrgBillingInfo[] = orgRows.map(org => {
      const stripeStatus = statusMap.get(org.owner_id) || "none";
      const trialEnd = addDays(new Date(org.created_at), TRIAL_DAYS);
      const daysLeft = differenceInDays(trialEnd, new Date());

      let status: OrgBillingInfo["status"] = "expired";
      if (stripeStatus === "active") status = "subscribed";
      else if (daysLeft > 0) status = "trial";

      return {
        id: org.id,
        name: org.name,
        owner_email: nameMap.get(org.owner_id) || "Unknown",
        created_at: org.created_at,
        status,
        mrr: status === "subscribed" ? 49 : 0,
      };
    });

    setOrgs(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const subscribers = orgs.filter(o => o.status === "subscribed");
  const trialing = orgs.filter(o => o.status === "trial");
  const expired = orgs.filter(o => o.status === "expired");
  const totalMRR = subscribers.length * 49;
  const conversionRate = orgs.length > 0
    ? Math.round((subscribers.length / orgs.length) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Revenue & Billing Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Platform-wide subscription metrics at {PLAN.price}/{PLAN.interval} per org.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">MRR</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">
            ${totalMRR.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">{subscribers.length} paying org{subscribers.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="glass-card rounded-xl p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Orgs</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{orgs.length}</p>
          <p className="text-xs text-muted-foreground">{trialing.length} on trial</p>
        </div>

        <div className="glass-card rounded-xl p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Conversion</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{conversionRate}%</p>
          <p className="text-xs text-muted-foreground">trial → paid</p>
        </div>

        <div className="glass-card rounded-xl p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Churn Risk</span>
          </div>
          <p className="text-2xl font-display font-bold text-destructive">{expired.length}</p>
          <p className="text-xs text-muted-foreground">expired, not converted</p>
        </div>
      </div>

      {/* Subscriber Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-foreground text-sm">All Organizations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Organization</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Owner</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Signed Up</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">MRR</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map(org => (
                <tr key={org.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{org.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{org.owner_email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(org.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    {org.status === "subscribed" && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Subscribed</Badge>
                    )}
                    {org.status === "trial" && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">Trial</Badge>
                    )}
                    {org.status === "expired" && (
                      <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">Expired</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {org.mrr > 0 ? `$${org.mrr}` : "—"}
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No organizations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminBilling;
