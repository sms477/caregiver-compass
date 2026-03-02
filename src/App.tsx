import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import CaregiverView from "./pages/CaregiverView";
import AdminDashboard from "./pages/AdminDashboard";
import AuthPage from "./pages/AuthPage";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const AppRouter = () => {
  const { role } = useApp();
  const { user, roles, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  // Determine available views based on role
  const isAdmin = roles.includes("admin");

  if (role === "caregiver") return <CaregiverView />;
  if (role === "admin" && isAdmin) return <AdminDashboard />;

  return <Index isAdmin={isAdmin} signOut={signOut} />;
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
