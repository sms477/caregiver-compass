import {
  CalendarDays,
  DollarSign,
  ShieldCheck,
  FileText,
  Users,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: CalendarDays,
    title: "Shift Scheduling",
    description: "Clock in/out with GPS, 24-hour shifts, meal break tracking, and sleep-time logging.",
  },
  {
    icon: DollarSign,
    title: "Payroll & Tax",
    description: "Automated pay runs, W-2 generation, tax filing, and direct deposit — all California-compliant.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance & Incidents",
    description: "Incident reports, audit trails, care logs, and medication tracking to stay survey-ready.",
  },
  {
    icon: FileText,
    title: "Billing & Contracts",
    description: "Resident contracts, monthly invoicing, 90-day rate-change notices, and payment tracking.",
  },
  {
    icon: Users,
    title: "CRM & Prospects",
    description: "Pipeline management, tour scheduling, follow-ups, and one-click prospect-to-resident conversion.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Occupancy, revenue, payroll costs, and compliance dashboards at a glance.",
  },
];

const FeaturesSection = () => (
  <section className="py-20 px-6 bg-card">
    <div className="max-w-5xl mx-auto">
      <div className="text-center space-y-3 mb-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Everything You Need</p>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
          One platform, zero headaches
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Replace spreadsheets, binders, and multiple apps with a single system built for RCFE operators.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-border bg-background p-6 space-y-3 hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <f.icon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
