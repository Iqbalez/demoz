import { Reveal } from "./Reveal";

const pillars = [
  {
    title: "Tax math you can defend",
    desc: "ERCA brackets, pension, and allowances run inside Demoz, not in someone's personal spreadsheet tab. Same rules every month.",
  },
  {
    title: "A paper trail when it matters",
    desc: "See who changed a salary, approved a run, or sent a payment. When someone asks questions later, you have names and timestamps.",
  },
  {
    title: "Built to grow with you",
    desc: "Start with one company. Add teams, roles, and stricter controls as you scale. Your setup today should not break you at 500 staff.",
  },
];

export function ComplianceStrip() {
  return (
    <section id="compliance" className="relative py-28 lg:py-36">
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[var(--m-border-strong)] to-transparent" />
      <div className="mx-auto max-w-[76rem] px-6 lg:px-10">
        <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <p className="m-label mb-4">Why finance sleeps better</p>
            <h2 className="m-display text-[clamp(2rem,4vw,3rem)] text-[var(--m-cream)]">
              Global tools treat Ethiopia like an add on. We started here.
            </h2>
            <p className="m-body mt-6 max-w-md">
              If your payroll tool does not understand ERCA on day one, you are still the compliance officer.
              Demoz was built for the rules you actually file under.
            </p>
          </Reveal>

          <div className="space-y-4">
            {pillars.map((p, i) => (
              <Reveal key={p.title}>
                <div className="m-card m-card-lift flex gap-6 p-6 lg:p-7">
                  <span className="m-display text-3xl text-[var(--m-terracotta)]/80">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--m-cream)]">{p.title}</h3>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--m-muted)]">{p.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
