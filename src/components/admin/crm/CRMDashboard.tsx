import { useState } from "react";
import { useCRM } from "@/hooks/useCRM";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import PipelineView from "./PipelineView";
import ProspectsList from "./ProspectsList";
import ToursView from "./ToursView";
import CRMReporting from "./CRMReporting";

const CRMDashboard = () => {
  const crm = useCRM();
  const [tab, setTab] = useState("pipeline");

  if (crm.loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">CRM</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage prospects, schedule tours, and track conversions.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
          <TabsTrigger value="tours">Tours</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineView crm={crm} />
        </TabsContent>
        <TabsContent value="prospects" className="mt-4">
          <ProspectsList crm={crm} />
        </TabsContent>
        <TabsContent value="tours" className="mt-4">
          <ToursView crm={crm} />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <CRMReporting crm={crm} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRMDashboard;
