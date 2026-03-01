import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider, useApp } from "@/contexts/AppContext";
import Index from "./pages/Index";
import CaregiverView from "./pages/CaregiverView";
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

const AppRouter = () => {
  const { role } = useApp();

  if (role === "caregiver") return <CaregiverView />;
  if (role === "admin") return <AdminDashboard />;
  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
