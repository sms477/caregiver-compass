import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Do I need a credit card to start?",
    a: "No. Your 7-day trial starts immediately when you create an account — no payment info required.",
  },
  {
    q: "What happens after the trial?",
    a: "After 7 days, you'll be prompted to subscribe at $49/month to keep using EasyRCFE. Your data is preserved.",
  },
  {
    q: "Can I add multiple facilities?",
    a: "Yes. You can manage multiple RCFE locations under a single organization with location-level permissions.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. We use enterprise-grade encryption, row-level security, and SOC 2 compliant infrastructure.",
  },
  {
    q: "Can caregivers clock in from their phones?",
    a: "Yes. Caregivers use a mobile-friendly interface to clock in/out with GPS verification and complete ADL reports.",
  },
  {
    q: "Do you handle California payroll compliance?",
    a: "Yes — meal break tracking, overtime rules, W-2 generation, and quarterly tax filings are all built in.",
  },
];

const FAQSection = () => {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center space-y-3 mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
            Common questions
          </h2>
        </div>

        <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
          {faqs.map((faq, i) => (
            <button
              key={i}
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full text-left px-5 py-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-foreground">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </div>
              {open === i && (
                <p className="text-sm text-muted-foreground mt-2 pr-8 leading-relaxed">{faq.a}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
