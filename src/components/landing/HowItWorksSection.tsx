const steps = [
  {
    number: "01",
    title: "Create your account",
    description: "Sign up with your organization name and first facility. No credit card needed.",
  },
  {
    number: "02",
    title: "Set up your facility",
    description: "Add residents, staff, and schedules. Import existing data or start fresh.",
  },
  {
    number: "03",
    title: "Run your operation",
    description: "Manage shifts, process payroll, track compliance, and bill residents — all from one dashboard.",
  },
];

const HowItWorksSection = () => (
  <section className="py-20 px-6">
    <div className="max-w-3xl mx-auto">
      <div className="text-center space-y-3 mb-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Getting Started</p>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
          Up and running in minutes
        </h2>
      </div>

      <div className="space-y-8">
        {steps.map((step, i) => (
          <div key={step.number} className="flex gap-5 items-start">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-sm">
              {step.number}
            </div>
            <div className="space-y-1 pt-1">
              <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
