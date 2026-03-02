import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Mail, Lock, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AuthPage = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link to verify your account.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 animate-slide-up">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">CareGuard</h1>
          <p className="text-muted-foreground text-sm">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Maria Garcia"
                  required
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Email
            </label>
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
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Password
            </label>
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
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-primary font-medium hover:underline"
          >
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
