import residentsGardenImg from "@/assets/residents-garden.jpg";

const testimonials = [
  {
    quote: "EasyRCFE replaced three different tools we were using. Payroll alone saves us hours every week.",
    name: "Maria G.",
    role: "RCFE Owner, San Diego",
  },
  {
    quote: "The compliance tracking gives me peace of mind before every licensing visit. Everything is documented.",
    name: "James T.",
    role: "Administrator, Sacramento",
  },
  {
    quote: "Setting it up took 20 minutes. My caregivers clock in from their phones and I can see everything in real time.",
    name: "Linda P.",
    role: "RCFE Operator, Los Angeles",
  },
];

const TestimonialsSection = () => (
  <section className="py-20 px-6 bg-card">
    <div className="max-w-5xl mx-auto">
      <div className="text-center space-y-3 mb-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Trusted by Operators</p>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
          What our customers say
        </h2>
      </div>

      {/* Banner image */}
      <div className="rounded-3xl overflow-hidden mb-12 shadow-lg border border-border/50">
        <img
          src={residentsGardenImg}
          alt="Happy elderly residents enjoying tea together in a sunlit garden"
          className="w-full h-48 md:h-64 object-cover"
          loading="lazy"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="rounded-2xl border border-border bg-background p-6 space-y-4"
          >
            <p className="text-sm text-foreground leading-relaxed italic">"{t.quote}"</p>
            <div>
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
