import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Sparkles, ArrowRight, Mail, Lock, Loader2, User, Building2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PLAN } from "@/components/admin/SubscriptionBilling";

const LandingPage = () => {
  const [mode, setMode] = useState<"landing" | "signup" | "login">("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      toast({ title: "Required", description: "Please enter your organization name.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email,
            org_name: orgName.trim(),
            facility_name: facilityName.trim() || undefined,
          },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast({
        title: "Account created!",
        description: "Check your email to verify your account, then sign in.",
      });
      setMode("login");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (mode === "signup" || mode === "login") {
    const isSignUp = mode === "signup";
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8 animate-slide-up">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
              <span className="text-2xl font-display font-black tracking-tight">E</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">EasyRCFE</h1>
            <p className="text-muted-foreground text-sm">
              {isSignUp ? "Create your account to start your free trial" : "Sign in to your account"}
            </p>
          </div>

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Organization Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Sunrise Senior Care"
                      required
                      className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Facility Name</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      placeholder="e.g. Oak Street Home"
                      className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Your first RCFE location (optional, can add later)</p>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-sm shadow-md hover:shadow-lg active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? (
              <>Already have an account?{" "}
                <button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">Sign in</button>
              </>
            ) : (
              <>Don't have an account?{" "}
                <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">Start free trial</button>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-2xl space-y-6 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-primary-foreground mb-2">
            <span className="text-3xl font-display font-black tracking-tight">E</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">
            Residential Care,<br />Made Easy
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            All-in-one platform for RCFE operators — scheduling, payroll, compliance, billing, and CRM in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => setMode("signup")}
              className="rounded-xl bg-primary text-primary-foreground font-semibold px-8 py-3.5 text-sm shadow-lg hover:shadow-xl active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Start 7-Day Free Trial
            </button>
            <button
              onClick={() => setMode("login")}
              className="rounded-xl border border-border bg-background text-foreground font-semibold px-8 py-3.5 text-sm hover:bg-muted transition-all"
            >
              Sign In
            </button>
          </div>
          <p className="text-xs text-muted-foreground">No credit card required · Cancel anytime</p>
        </div>
      </div>

      {/* Pricing Card */}
      <div className="px-6 pb-16">
        <div className="max-w-md mx-auto glass-card rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-display font-bold text-foreground">{PLAN.name}</h2>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-display font-bold text-foreground">{PLAN.price}</span>
              <span className="text-muted-foreground text-sm">/{PLAN.interval}</span>
            </div>
            <p className="text-sm text-muted-foreground">per organization</p>
          </div>

          <ul className="space-y-3">
            {PLAN.features.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => setMode("signup")}
            className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-sm shadow-md hover:shadow-lg active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          >
            Start Free Trial — No Card Required <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
