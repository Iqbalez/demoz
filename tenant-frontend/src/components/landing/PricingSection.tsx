import Link from "next/link";
import { Reveal } from "./Reveal";

const plans = [
  {
    name: "Starter",
    price: "2,500",
    period: "ETB per employee, monthly",
    desc: "You are outgrowing Excel and need payroll that does not embarrass you in front of staff.",
    features: ["Up to 50 employees", "ERCA ready payroll", "Payslips and attendance", "Email support"],
    cta: "Try it free",
    highlight: false,
  },
  {
    name: "Growth",
    price: "1,900",
    period: "ETB per employee, monthly",
    desc: "Monthly pay at scale, Chapa disbursements, and a team that actually picks up the phone.",
    features: [
      "Unlimited employees",
      "Chapa bulk salary send",
      "Live disbursement tracking",
      "Priority support",
      "Custom roles",
    ],
    cta: "Try it free",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Let's talk",
    period: "tailored annual plan",
    desc: "Multiple entities, strict controls, and onboarding that does not dump docs on your IT guy.",
    features: [
      "Dedicated success contact",
      "SLA and audit exports",
      "Custom integrations",
      "Deployment options",
    ],
    cta: "Let's connect",
    highlight: false,
  },
];

const ENTERPRISE_MAIL =
  "mailto:iqbalezedin@gmail.com?subject=Demoz%20Enterprise%20plan&body=Hi%20Iqbal%2C%0A%0AWe%27re%20interested%20in%20the%20Enterprise%20plan.%0A%0ACompany%20name%3A%20%0AExpected%20employees%3A%20%0A";

export function PricingSection() {
  return (
    <section id="pricing" className="py-28 lg:py-36">
      <div className="mx-auto max-w-[76rem] px-6 lg:px-10">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="m-label mb-4">Pricing</p>
          <h2 className="m-display text-[clamp(2rem,4vw,3rem)] text-[var(--m-cream)]">
            Simple per head pricing. No surprise modules later.
          </h2>
          <p className="m-body mt-5">
            Every plan ships with ERCA tax, audit history, and secure separation between companies.
            Pick where you are today. Upgrade when payroll stops being your side job.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => (
            <Reveal key={plan.name} className="h-full">
              <div
                className={`m-card m-card-lift relative flex h-full flex-col p-8 ${
                  plan.highlight ? "border-[var(--m-gold)]/40 shadow-[0_0_48px_-12px_var(--m-glow)]" : ""
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[var(--m-terracotta)] to-[var(--m-gold)] px-4 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-[var(--m-bg)]">
                    Most chosen
                  </span>
                )}
                <p className="text-sm font-semibold text-[var(--m-cream)]">{plan.name}</p>
                <p className="m-display mt-4 text-4xl text-[var(--m-gold)]">{plan.price}</p>
                <p className="text-[0.75rem] text-[var(--m-muted)]">{plan.period}</p>
                <p className="mt-4 text-[0.875rem] leading-relaxed text-[var(--m-muted)]">{plan.desc}</p>
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[0.875rem] text-[var(--m-cream)]/90">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--m-teal)]" />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.name === "Enterprise" ? (
                  <a
                    href={ENTERPRISE_MAIL}
                    className={`mt-8 w-full text-center ${plan.highlight ? "m-btn-primary" : "m-btn-ghost"}`}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Link
                    href="/login"
                    className={`mt-8 w-full text-center ${plan.highlight ? "m-btn-primary" : "m-btn-ghost"}`}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
