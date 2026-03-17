import { Sparkles } from "lucide-react";

interface HeroSectionProps {
  onStartTrial: () => void;
  onSignIn: () => void;
}

const HeroSection = ({ onStartTrial, onSignIn }: HeroSectionProps) => (
  <section className="relative overflow-hidden pt-20 pb-24 px-6">
    {/* Decorative gradient blob */}
    <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
    <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

    <div className="relative max-w-3xl mx-auto text-center space-y-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        7-day free trial · No credit card required
      </div>

      <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground tracking-tight leading-[1.1]">
        Residential Care,
        <br />
        <span className="text-primary">Made Easy</span>
      </h1>

      <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
        All-in-one platform for RCFE operators — scheduling, payroll, compliance, billing, and CRM in one place.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2">
        <button
          onClick={onStartTrial}
          className="rounded-xl bg-primary text-primary-foreground font-semibold px-8 py-3.5 text-sm shadow-lg hover:shadow-xl active:scale-[0.97] transition-all flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Start Free — 7-Day Trial
        </button>
        <button
          onClick={onSignIn}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors py-3.5"
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  </section>
);

export default HeroSection;
