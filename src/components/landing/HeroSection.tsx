import { Sparkles } from "lucide-react";
import heroCareImg from "@/assets/hero-care.jpg";

interface HeroSectionProps {
  onStartTrial: () => void;
  onSignIn: () => void;
}

const HeroSection = ({ onStartTrial, onSignIn }: HeroSectionProps) => (
  <section className="relative overflow-hidden pt-16 pb-20 px-6">
    {/* Decorative gradient blobs */}
    <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
    <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

    <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
      {/* Left — Copy */}
      <div className="space-y-7 text-center md:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          7-day free trial · No credit card required
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground tracking-tight leading-[1.1]">
          Residential Care,
          <br />
          <span className="text-primary">Made Easy</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
          All-in-one platform for RCFE operators — scheduling, payroll, compliance, billing, and CRM in one place.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-center md:items-start pt-2">
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

      {/* Right — Hero image */}
      <div className="relative flex justify-center">
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-border/50 max-w-md w-full">
          <img
            src={heroCareImg}
            alt="Caregiver warmly holding hands with an elderly resident in a sunlit care home"
            className="w-full h-auto object-cover"
            loading="eager"
          />
        </div>
        {/* Floating stat badge */}
        <div className="absolute -bottom-4 -left-4 md:-left-8 bg-card border border-border rounded-2xl px-5 py-3 shadow-lg">
          <p className="text-2xl font-display font-bold text-primary">3×</p>
          <p className="text-xs text-muted-foreground">faster admin tasks</p>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
