import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Pill, DollarSign, AlertTriangle, TrendingUp,
  Clock, Shield, Activity, Loader2, ChevronRight, BedDouble
} from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";

interface DashboardData {
  residents: { id: string; name: string; room: string; care_level: string; acuity_score: number; lic602a_expiry: string | null }[];
  totalResidents: number;
  maxCapacity: number;
  shiftsOnDuty: number;
  monthlyRevenue: number;
  medPassProgress: { done: number; total: number };
  openIncidents: { id: string; resident_name: string; incident_type: string; occurred_at: string; description: string }[];
  acuityTrends: { resident_id: string; resident_name: string; room: string; current_score: number; calculated_score: number; current_level: string; calculated_level: string }[];
  pendingIncreases: { resident_name: string; current_care_surcharge: number; pending_care_surcharge: number; increase_effective_date: string; daysLeft: number }[];
  complianceDeadlines: { type: string; name: string; expiry: string; daysLeft: number }[];
}

const AdminDashboardHome = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Parallel fetches
      const [
        { data: residents },
        { data: shifts },
        { data: contracts },
        { data: incidents },
        { data: acuitySummary },
        { data: dailyLogs },
      ] = await Promise.all([
        supabase.from("residents").select("id, name, room, care_level, acuity_score, lic602a_expiry").order("name"),
        supabase.from("shifts").select("id, caregiver_id, clock_in, clock_out").is("clock_out", null),
        supabase.from("contracts").select("resident_id, base_rent, current_care_surcharge, pending_care_surcharge, increase_effective_date, residents(name)"),
        supabase.from("incidents").select("id, resident_name, incident_type, occurred_at, description, status").eq("status", "open").order("occurred_at", { ascending: false }).limit(10),
        supabase.from("resident_acuity_summary").select("*"),
        supabase.from("daily_care_logs").select("id, resident_id").gte("log_date", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
      ]);

      const resList = residents || [];
      const contractList = (contracts as any[]) || [];
      const today = new Date();

      // Monthly revenue
      const monthlyRevenue = contractList.reduce(
        (sum, c) => sum + Number(c.base_rent) + Number(c.current_care_surcharge), 0
      );

      // Med-pass: count today's care logs vs total residents
      const medPassDone = new Set((dailyLogs || []).map((l: any) => l.resident_id)).size;

      // Acuity trends: calculated_score > current_score by 20%+
      const acuityTrends = ((acuitySummary as any[]) || [])
        .filter(a => a.calculated_score && a.current_score && a.calculated_score > a.current_score * 1.2)
        .map(a => ({
          resident_id: a.resident_id,
          resident_name: a.resident_name,
          room: a.room,
          current_score: a.current_score,
          calculated_score: a.calculated_score,
          current_level: a.current_level,
          calculated_level: a.calculated_level,
        }));

      // Pending rate increases
      const pendingIncreases = contractList
        .filter(c => c.increase_effective_date && c.pending_care_surcharge > 0)
        .map(c => ({
          resident_name: (c as any).residents?.name || "Unknown",
          current_care_surcharge: Number(c.current_care_surcharge),
          pending_care_surcharge: Number(c.pending_care_surcharge),
          increase_effective_date: c.increase_effective_date!,
          daysLeft: differenceInDays(parseISO(c.increase_effective_date!), today),
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft);

      // Compliance deadlines
      const complianceDeadlines: DashboardData["complianceDeadlines"] = [];
      resList.forEach((r: any) => {
        if (r.lic602a_expiry) {
          const dl = differenceInDays(parseISO(r.lic602a_expiry), today);
          if (dl <= 90) {
            complianceDeadlines.push({ type: "LIC 602A", name: r.name, expiry: r.lic602a_expiry, daysLeft: dl });
          }
        }
      });
      complianceDeadlines.sort((a, b) => a.daysLeft - b.daysLeft);

      setData({
        residents: resList as any,
        totalResidents: resList.length,
        maxCapacity: 6,
        shiftsOnDuty: (shifts || []).length,
        monthlyRevenue,
        medPassProgress: { done: medPassDone, total: resList.length },
        openIncidents: (incidents || []).map((i: any) => ({
          id: i.id,
          resident_name: i.resident_name,
          incident_type: i.incident_type,
          occurred_at: i.occurred_at,
          description: i.description,
        })),
        acuityTrends,
        pendingIncreases,
        complianceDeadlines,
      });
      setLoading(false);
    };
    load();
  }, []);

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const medPct = data.medPassProgress.total > 0
    ? Math.round((data.medPassProgress.done / data.medPassProgress.total) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* ── 4 Header Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Occupancy */}
        <div className="glass-card rounded-xl p-4 space-y-1 border-2 border-primary/20">
          <div className="flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Occupancy</span>
          </div>
          <p className="text-2xl font-display font-bold text-primary">
            {data.totalResidents}/{data.maxCapacity}
          </p>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(100, (data.totalResidents / data.maxCapacity) * 100)}%` }}
            />
          </div>
        </div>

        {/* Med-Pass Progress */}
        <div className="glass-card rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground font-medium">Med-Pass Today</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{medPct}%</p>
          <p className="text-xs text-muted-foreground">
            {data.medPassProgress.done}/{data.medPassProgress.total} residents logged
          </p>
        </div>

        {/* Staff On-Duty */}
        <div className="glass-card rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Staff On-Duty</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{data.shiftsOnDuty}</p>
          <p className="text-xs text-muted-foreground">active shift(s)</p>
        </div>

        {/* Monthly Revenue */}
        <div className="glass-card rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Monthly Revenue</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{fmt(data.monthlyRevenue)}</p>
          <p className="text-xs text-muted-foreground">{data.pendingIncreases.length} pending increases</p>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left 70% — Main Feed */}
        <div className="lg:col-span-7 space-y-5">
          {/* Incident Alerts */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Incident Alerts
              </h3>
              <button
                onClick={() => onNavigate("incidents")}
                className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
              >
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {data.openIncidents.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <Shield className="w-8 h-8 mx-auto mb-2 text-primary/40" />
                No open incidents. All clear!
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.openIncidents.map(inc => (
                  <div key={inc.id} className="p-4 flex items-start gap-3">
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm">{inc.resident_name}</p>
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                          {inc.incident_type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{inc.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(inc.occurred_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acuity Trends */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" /> Acuity Trends — Revenue Opportunities
              </h3>
              <button
                onClick={() => onNavigate("acuity-review")}
                className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
              >
                Review <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {data.acuityTrends.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No acuity mismatches detected.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.acuityTrends.map(t => (
                  <div key={t.resident_id} className="p-4 flex items-center justify-between bg-accent/5">
                    <div>
                      <p className="font-medium text-foreground text-sm">{t.resident_name}</p>
                      <p className="text-xs text-muted-foreground">{t.room}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t.current_level}</span>
                        <TrendingUp className="w-3.5 h-3.5 text-accent" />
                        <span className="text-xs font-semibold text-accent">{t.calculated_level}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Score: {t.current_score} → {t.calculated_score}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 30% — Sidebar */}
        <div className="lg:col-span-3 space-y-5">
          {/* Compliance Deadlines */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Compliance Deadlines
              </h3>
            </div>
            {data.complianceDeadlines.length === 0 ? (
              <div className="p-5 text-center text-muted-foreground text-sm">
                All certifications current.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.complianceDeadlines.map((d, i) => (
                  <div key={i} className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground text-sm">{d.name}</p>
                      {d.daysLeft <= 0 ? (
                        <span className="text-xs font-bold text-destructive">Expired</span>
                      ) : d.daysLeft <= 30 ? (
                        <span className="text-xs font-bold text-destructive">{d.daysLeft}d</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{d.daysLeft}d</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{d.type} · Expires {d.expiry}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revenue Watch */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-accent" /> Revenue Watch
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pending 90-day rate increases</p>
            </div>
            {data.pendingIncreases.length === 0 ? (
              <div className="p-5 text-center text-muted-foreground text-sm">
                No pending increases.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.pendingIncreases.map((p, i) => (
                  <div key={i} className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground text-sm">{p.resident_name}</p>
                      {p.daysLeft <= 0 ? (
                        <span className="text-xs font-bold text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Due now
                        </span>
                      ) : p.daysLeft <= 30 ? (
                        <span className="text-xs font-bold text-accent">{p.daysLeft}d left</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{p.daysLeft}d left</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ${Number(p.current_care_surcharge).toFixed(0)} → ${Number(p.pending_care_surcharge).toFixed(0)}
                    </p>
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          p.daysLeft <= 0 ? "bg-destructive" : p.daysLeft <= 30 ? "bg-accent" : "bg-primary"
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, ((90 - p.daysLeft) / 90) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardHome;
