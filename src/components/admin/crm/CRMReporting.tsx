import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGES, STAGE_CONFIG } from "@/hooks/useCRM";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const STAGE_COLORS = ["#3B82F6", "#EAB308", "#F97316", "#8B5CF6", "#22C55E"];

interface Props {
  crm: ReturnType<typeof import("@/hooks/useCRM").useCRM>;
}

const CRMReporting = ({ crm }: Props) => {
  const pipelineData = useMemo(() =>
    STAGES.map((s, i) => ({
      name: STAGE_CONFIG[s].label,
      count: crm.prospects.filter(p => p.stage === s).length,
      color: STAGE_COLORS[i],
    })), [crm.prospects]);

  const totalProspects = crm.prospects.length;
  const converted = crm.prospects.filter(p => p.stage === "converted").length;
  const conversionRate = totalProspects > 0 ? Math.round((converted / totalProspects) * 100) : 0;

  const upcomingTours = crm.tours.filter(t =>
    new Date(t.scheduled_at) >= new Date() && t.status === "scheduled"
  ).length;

  const thisMonth = crm.prospects.filter(p => {
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalProspects}</p>
            <p className="text-xs text-muted-foreground">Total Prospects</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{upcomingTours}</p>
            <p className="text-xs text-muted-foreground">Upcoming Tours</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{thisMonth}</p>
            <p className="text-xs text-muted-foreground">New This Month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {pipelineData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMReporting;
