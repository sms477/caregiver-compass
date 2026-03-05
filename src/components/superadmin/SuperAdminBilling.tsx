import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Sparkles, CheckCircle2, Settings, Building2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { PLAN } from "@/components/admin/SubscriptionBilling";

const SuperAdminBilling = () => {
  const { subscribed, onTrial, trialEnd, subscriptionEnd, loading, startCheckout, openPortal, checkSubscription } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  const isActive = subscribed;

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">Platform Billing</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage subscription and billing across organizations.</p>
      </div>

      {/* Platform Subscription Card */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{PLAN.name}</h3>
              <p className="text-sm text-muted-foreground">{PLAN.price}/{PLAN.interval}</p>
            </div>
          </div>
          {isActive ? (
            <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              {onTrial ? (
                <><Sparkles className="w-3 h-3 mr-1" /> Free Trial</>
              ) : (
                <><CheckCircle2 className="w-3 h-3 mr-1" /> Active</>
              )}
            </Badge>
          ) : (
            <Badge variant="secondary">No Subscription</Badge>
          )}
        </div>

        {isActive && onTrial && trialEnd && (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
            <p className="text-sm text-amber-700 font-medium">
              🎉 Free trial ends {format(new Date(trialEnd), "MMM d, yyyy")}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Add a payment method to continue after the trial.
            </p>
          </div>
        )}

        {isActive && !onTrial && subscriptionEnd && (
          <p className="text-sm text-muted-foreground">
            Next billing: {format(new Date(subscriptionEnd), "MMM d, yyyy")}
          </p>
        )}

        <div className="flex gap-2 flex-wrap">
          {isActive ? (
            <Button variant="outline" size="sm" onClick={openPortal}>
              <Settings className="w-4 h-4 mr-1" /> Manage Subscription
            </Button>
          ) : (
            <Button onClick={startCheckout} size="sm">
              <Sparkles className="w-4 h-4 mr-1" /> Start 7-Day Free Trial
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={checkSubscription}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Plan details when not subscribed */}
      {!isActive && (
        <div className="glass-card rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-foreground">EasyRCFE Pro includes</h3>
          <ul className="space-y-2">
            {PLAN.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Button onClick={startCheckout} className="w-full">
            Start Free Trial — No Card Required <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default SuperAdminBilling;
