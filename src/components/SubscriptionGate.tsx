import { useSubscription } from "@/hooks/useSubscription";
import { Loader2, CheckCircle2, ArrowRight, LogOut, AlertTriangle, CreditCard, Settings } from "lucide-react";
import { PLAN } from "@/components/admin/SubscriptionBilling";
import { format } from "date-fns";

interface SubscriptionGateProps {
  children: React.ReactNode;
  signOut?: () => Promise<void>;
}

const SubscriptionGate = ({ children, signOut }: SubscriptionGateProps) => {
  const { subscribed, loading, trialEnd, startCheckout, openPortal, checkSubscription } = useSubscription();

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

  // Trial expired paywall
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 text-destructive mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Trial Expired</h1>
          <p className="text-muted-foreground text-sm">
            Your 7-day free trial ended{trialEnd ? ` on ${format(new Date(trialEnd), "MMM d, yyyy")}` : ""}. Subscribe to continue using EasyRCFE.
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
            <CreditCard className="w-4 h-4" />
            Subscribe Now <ArrowRight className="w-4 h-4" />
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
