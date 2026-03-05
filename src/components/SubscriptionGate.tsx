import { useSubscription } from "@/hooks/useSubscription";
import { Loader2, Sparkles, CheckCircle2, ArrowRight, LogOut } from "lucide-react";
import { PLAN } from "@/components/admin/SubscriptionBilling";

interface SubscriptionGateProps {
  children: React.ReactNode;
  signOut?: () => Promise<void>;
}

const SubscriptionGate = ({ children, signOut }: SubscriptionGateProps) => {
  const { subscribed, loading, startCheckout, checkSubscription } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (subscribed) {
    return <>{children}</>;
  }

  // Paywall
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <span className="text-2xl font-display font-black tracking-tight">E</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Start Your Free Trial</h1>
          <p className="text-muted-foreground text-sm">
            Activate your 7-day free trial to access EasyRCFE. No credit card required.
          </p>
        </div>

        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-foreground text-lg">{PLAN.name}</h3>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-display font-bold text-foreground">{PLAN.price}</span>
              <span className="text-muted-foreground text-sm">/{PLAN.interval}</span>
            </div>
          </div>

          <ul className="space-y-2">
            {PLAN.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={startCheckout}
            className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-sm shadow-md hover:shadow-lg active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Start 7-Day Free Trial <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={checkSubscription}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Already subscribed? Refresh status
          </button>
        </div>

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

export default SubscriptionGate;
