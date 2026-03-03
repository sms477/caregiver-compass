import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Organization } from "@/hooks/useOrganizations";
import { ArrowLeft, Building2, MapPin, Users, LayoutDashboard } from "lucide-react";
import OrganizationsManager from "@/components/superadmin/OrganizationsManager";
import LocationsManager from "@/components/superadmin/LocationsManager";
import MembersManager from "@/components/superadmin/MembersManager";

type SuperTab = "orgs" | "locations" | "members";

const SuperAdminDashboard = () => {
  const { setRole } = useApp();
  const [tab, setTab] = useState<SuperTab>("orgs");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    setTab("locations");
  };

  const handleBackToOrgs = () => {
    setSelectedOrg(null);
    setTab("orgs");
  };

  const NAV_ITEMS: { key: SuperTab; label: string; icon: React.ElementType; requiresOrg?: boolean }[] = [
    { key: "orgs", label: "Organizations", icon: Building2 },
    { key: "locations", label: "Locations", icon: MapPin, requiresOrg: true },
    { key: "members", label: "Members", icon: Users, requiresOrg: true },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-card border-r border-border hidden lg:flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <span className="text-sm font-display font-black">E</span>
            </div>
            <span className="font-display font-bold text-foreground text-lg tracking-tight">EasyRCFE</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Super Admin</p>
        </div>

        {selectedOrg && (
          <div className="px-3 pt-3 pb-1">
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Organization</p>
              <p className="text-sm font-semibold text-foreground truncate">{selectedOrg.name}</p>
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = tab === item.key;
            const disabled = item.requiresOrg && !selectedOrg;
            return (
              <button
                key={item.key}
                onClick={() => {
                  if (disabled) return;
                  if (item.key === "orgs") handleBackToOrgs();
                  else setTab(item.key);
                }}
                disabled={disabled}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : disabled
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={() => setRole(null)}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-10 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setRole(null)} className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-display font-bold text-foreground tracking-tight">EasyRCFE</span>
          <div className="w-5" />
        </div>
        <div className="flex overflow-x-auto px-2 pb-2 gap-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = tab === item.key;
            const disabled = item.requiresOrg && !selectedOrg;
            return (
              <button
                key={item.key}
                onClick={() => {
                  if (disabled) return;
                  if (item.key === "orgs") handleBackToOrgs();
                  else setTab(item.key);
                }}
                disabled={disabled}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : disabled
                    ? "bg-muted/50 text-muted-foreground/40"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 lg:overflow-y-auto">
        <div className="p-4 lg:p-8 max-w-5xl mx-auto lg:mt-0 mt-24">
          {tab === "orgs" && (
            <OrganizationsManager onSelectOrg={handleSelectOrg} />
          )}
          {tab === "locations" && selectedOrg && (
            <LocationsManager org={selectedOrg} onBack={handleBackToOrgs} />
          )}
          {tab === "members" && selectedOrg && (
            <MembersManager org={selectedOrg} onBack={handleBackToOrgs} />
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
