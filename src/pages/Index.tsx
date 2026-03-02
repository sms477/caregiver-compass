import { useApp } from "@/contexts/AppContext";
import { Heart, ArrowRight, LogOut } from "lucide-react";

interface IndexProps {
  isAdmin?: boolean;
  isReviewer?: boolean;
  isSuperAdmin?: boolean;
  signOut?: () => Promise<void>;
}

const Index = ({ isAdmin, isReviewer, isSuperAdmin, signOut }: IndexProps) => {
  const { setRole, setCurrentCaregiverId } = useApp();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        {/* Logo / Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <span className="text-2xl font-display font-black tracking-tight">K</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">kova</h1>
          <p className="text-muted-foreground text-sm">
            Care Operations & Compliance
          </p>
        </div>

        {/* Role Selection */}
        <div className="space-y-4">
          {/* Caregiver Card */}
          <button
            onClick={() => setRole("caregiver")}
            className="w-full glass-card rounded-xl p-6 text-left transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Caregiver</h2>
                  <p className="text-sm text-muted-foreground">Clock in, log tasks & meds</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>

          {/* Admin Card */}
          {isAdmin && (
            <button
              onClick={() => setRole("admin")}
              className="w-full glass-card rounded-xl p-6 text-left transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                     <span className="text-lg font-display font-black text-accent">K</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Administrator</h2>
                    <p className="text-sm text-muted-foreground">Dashboard, payroll & compliance</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
            </button>
          )}

          {/* Reviewer Card */}
          {isReviewer && !isAdmin && (
            <button
              onClick={() => setRole("admin")}
              className="w-full glass-card rounded-xl p-6 text-left transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                     <span className="text-lg font-display font-black text-primary">K</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Reviewer</h2>
                    <p className="text-sm text-muted-foreground">Read-only reports & audit trail</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>
          )}

          {/* Super Admin Card */}
          {isSuperAdmin && (
            <button
              onClick={() => setRole("super_admin")}
              className="w-full glass-card rounded-xl p-6 text-left transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] group border-2 border-primary/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <span className="text-lg font-display font-black">K</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Super Admin</h2>
                    <p className="text-sm text-muted-foreground">Organizations, locations & billing</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>
          )}
        </div>

        {/* Sign Out */}
        {signOut && (
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        )}
      </div>
    </div>
  );
};

export default Index;
