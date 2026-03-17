import { CheckCircle2, ArrowRight } from "lucide-react";
import { PLAN } from "@/components/admin/SubscriptionBilling";

interface PricingSectionProps {
  onStartTrial: () => void;
}

const PricingSection = ({ onStartTrial }: PricingSectionProps) => (
  <section className="py-20 px-6 bg-card">
    <div className="max-w-md mx-auto">
      <div className="text-center space-y-3 mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Simple Pricing</p>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
          One plan, everything included
        </h2>
      </div>

      <div className="rounded-2xl border border-border bg-background p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-1">
          <h3 className="text-xl font-display font-bold text-foreground">{PLAN.name}</h3>
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
          onClick={onStartTrial}
          className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-sm shadow-md hover:shadow-lg active:scale-[0.97] transition-all flex items-center justify-center gap-2"
        >
          Start Free — 7 Days Free <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-xs text-center text-muted-foreground">No credit card required · Cancel anytime</p>
      </div>
    </div>
  </section>
);

export default PricingSection;
