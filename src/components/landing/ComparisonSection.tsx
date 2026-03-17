import { Check, X, ArrowRight, LogIn, Shield, FileText, Calculator } from "lucide-react";

const comparisonRows = [
  { feature: "Payroll & Tax", oldWay: "Gusto/ADP ($40–$100+/mo)", newWay: "Included (Pay stubs & tax forms)" },
  { feature: "Accounting", oldWay: "QuickBooks ($30–$90/mo)", newWay: "Included (Automated P&L & Billing)" },
  { feature: "Clinical / eMAR", oldWay: "Standalone eMAR ($100–$300/mo)", newWay: "Included (eMAR, ADL, Acuity reviews)" },
  { feature: "Ops & Logs", oldWay: "Paper / Spreadsheets (Manual)", newWay: "Included (Shift logs & Audit trails)" },
  { feature: "Data Flow", oldWay: "Manual entry in 3+ different apps", newWay: "Single source of truth" },
];

const benefits = [
  { icon: LogIn, title: "One Login", description: "Manage your residents, staff, and finances in one tab." },
  { icon: Shield, title: "Audit-Ready Records", description: "Every ADL, medication pass, and shift note is timestamped and linked for Title 22 compliance." },
  { icon: FileText, title: 'Zero "Double Entry"', description: "When you update a resident's acuity, your billing and care plans update automatically." },
  { icon: Calculator, title: "Clean Financials", description: "No more exporting CSVs from three places to see if you're actually profitable this month." },
];

interface ComparisonSectionProps {
  onStartTrial: () => void;
}

const ComparisonSection = ({ onStartTrial }: ComparisonSectionProps) => (
  <section className="py-20 px-6">
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-destructive mb-3">
          Stop overpaying for fragmented software
        </p>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight mb-4">
          Fragmented Software vs.{" "}
          <span className="text-primary">The EasyRCFE Way</span>
        </h2>
        <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
          RCFE owners are stuck overpaying — both in money and in manual data entry. See how much you could save.
        </p>
      </div>

      {/* Comparison Table — Desktop */}
      <div className="hidden md:block mb-16">
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-3 bg-muted/50">
            <div className="p-5 font-medium text-sm text-muted-foreground">Feature</div>
            <div className="p-5 font-medium text-sm text-destructive text-center">The "Old" Way</div>
            <div className="p-5 font-medium text-sm text-primary text-center bg-primary/5">EasyRCFE</div>
          </div>
          {comparisonRows.map((row, i) => (
            <div key={row.feature} className={`grid grid-cols-3 ${i < comparisonRows.length - 1 ? "border-b border-border" : ""}`}>
              <div className="p-5 font-medium text-foreground text-sm">{row.feature}</div>
              <div className="p-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <X className="w-4 h-4 text-destructive shrink-0" />
                <span>{row.oldWay}</span>
              </div>
              <div className="p-5 flex items-center justify-center gap-2 text-sm text-foreground bg-primary/5">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span>{row.newWay}</span>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-3 border-t-2 border-border bg-muted/30">
            <div className="p-5 font-display text-lg font-bold text-foreground">Total Monthly Cost</div>
            <div className="p-5 text-center">
              <span className="font-display text-xl text-destructive line-through">$170–$500+</span>
              <span className="block text-xs text-muted-foreground mt-1">/month</span>
            </div>
            <div className="p-5 text-center bg-primary/5">
              <span className="font-display text-2xl font-bold text-primary">$49</span>
              <span className="block text-xs text-muted-foreground mt-1">flat /month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Cards — Mobile */}
      <div className="md:hidden space-y-3 mb-14">
        {comparisonRows.map((row) => (
          <div key={row.feature} className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <h3 className="font-medium text-foreground text-sm">{row.feature}</h3>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span>{row.oldWay}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-primary">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{row.newWay}</span>
            </div>
          </div>
        ))}
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 text-center">
          <p className="text-sm text-muted-foreground mb-1">Save up to</p>
          <p className="font-display text-3xl font-bold text-primary">$450+/mo</p>
          <p className="text-xs text-muted-foreground mt-1">
            From <span className="line-through text-destructive">$500+</span> → <span className="text-primary font-medium">$49 flat</span>
          </p>
        </div>
      </div>

      {/* Why All-in-One */}
      <div className="mb-16">
        <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3 text-center">
          Why "All-in-One" Matters for California RCFEs
        </h3>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
          Running a facility on 5 different platforms isn't just expensive — it's a compliance risk.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {benefits.map((b) => (
            <div key={b.title} className="flex gap-4 p-5 rounded-xl bg-card border border-border">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <b.icon className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">{b.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-2xl border border-border bg-card p-8 md:p-12 text-center">
        <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
          "But is it hard to switch?"
        </h3>
        <p className="text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
          We handle the heavy lifting. Sign up for a trial and we'll migrate your resident records, staff data, and billing history — <strong className="text-foreground">for free</strong>.
        </p>
        <button
          onClick={onStartTrial}
          className="rounded-xl bg-primary text-primary-foreground font-semibold px-8 py-3.5 text-sm shadow-md hover:shadow-lg active:scale-[0.97] transition-all inline-flex items-center gap-2"
        >
          Start Your Free Trial <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  </section>
);

export default ComparisonSection;
