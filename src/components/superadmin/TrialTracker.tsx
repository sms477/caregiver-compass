import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Clock, CheckCircle2, AlertTriangle, XCircle, Mail } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";

interface OrgTrial {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  owner_email: string;
  created_at: string;
  trialEnd: Date;
  daysLeft: number;
  stripeStatus: "active" | "trialing" | "none" | "checking";
}

const TRIAL_DAYS = 7;

const TrialTracker = () => {
  const [orgs, setOrgs] = useState<OrgTrial[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);

    // Get all orgs
    const { data: orgRows } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (!orgRows) {
      setLoading(false);
      return;
    }

    // Get owner emails from profiles
    const ownerIds = [...new Set(orgRows.map(o => o.owner_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", ownerIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

    // Check Stripe status via edge function for each org owner
    const mapped: OrgTrial[] = orgRows.map(org => {
      const created = new Date(org.created_at);
      const trialEnd = addDays(created, TRIAL_DAYS);
      const daysLeft = differenceInDays(trialEnd, new Date());

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        owner_id: org.owner_id,
        owner_email: profileMap.get(org.owner_id) || "Unknown",
        created_at: org.created_at,
        trialEnd,
        daysLeft,
        stripeStatus: "checking" as const,
      };
    });

    setOrgs(mapped);
    setLoading(false);

    // Now check Stripe status in background
    const { data: stripeData } = await supabase.functions.invoke("check-all-subscriptions", {
      body: { owner_ids: ownerIds },
    });

    if (stripeData?.results) {
      const statusMap = new Map<string, string>(
        stripeData.results.map((r: any) => [r.user_id, r.status])
      );
      setOrgs(prev =>
        prev.map(o => ({
          ...o,
          stripeStatus: (statusMap.get(o.owner_id) || "none") as OrgTrial["stripeStatus"],
        }))
      );
    } else {
      // If edge function doesn't exist yet, mark all as "none"
      setOrgs(prev => prev.map(o => ({ ...o, stripeStatus: "none" as const })));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (org: OrgTrial) => {
    if (org.stripeStatus === "checking") {
      return <Badge variant="outline" className="text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin mr-1" /> Checking</Badge>;
    }
    if (org.stripeStatus === "active") {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Subscribed</Badge>;
    }
    if (org.daysLeft > 0) {
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> Trial ({org.daysLeft}d left)</Badge>;
    }
    return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" /> Expired</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const active = orgs.filter(o => o.stripeStatus === "active").length;
  const onTrial = orgs.filter(o => o.stripeStatus !== "active" && o.daysLeft > 0).length;
  const expired = orgs.filter(o => o.stripeStatus !== "active" && o.daysLeft <= 0).length;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Trial & Conversion Tracker</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor signups, trial status, and paid conversions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{orgs.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Orgs</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-display font-bold text-blue-600">{onTrial}</p>
          <p className="text-xs text-muted-foreground mt-1">On Trial</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-display font-bold text-emerald-600">{active}</p>
          <p className="text-xs text-muted-foreground mt-1">Subscribed</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-display font-bold text-destructive">{expired}</p>
          <p className="text-xs text-muted-foreground mt-1">Expired</p>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Organization</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Owner</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Signed Up</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trial Ends</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map(org => (
                <tr key={org.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{org.name}</p>
                    <p className="text-xs text-muted-foreground">/{org.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{org.owner_email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(org.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(org.trialEnd, "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(org)}</td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No organizations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrialTracker;
