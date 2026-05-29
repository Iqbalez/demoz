import { Reveal } from "./Reveal";

const steps = [
  {
    step: "01",
    title: "Bring your people in",
    desc: "Upload the staff list or add them one by one. Banks, departments, and tax IDs in one sitting, not three afternoons.",
  },
  {
    step: "02",
    title: "Set how you pay",
    desc: "Salaries, allowances, overtime rules. Tell Demoz how your company pays and it remembers next month.",
  },
  {
    step: "03",
    title: "Preview before you commit",
    desc: "See gross to net for every person. Catch mistakes while they are cheap, not after money left the account.",
  },
  {
    step: "04",
    title: "Hit send with confidence",
    desc: "Disburse through Chapa. HR and finance watch the same status. No more parallel phone trees.",
  },
];

export function ProcessTimeline() {
  return (
    <section id="process" className="border-t border-[var(--m-border)] bg-[var(--m-bg-elevated)]/50 py-28 lg:py-36">
      <div className="mx-auto max-w-[76rem] px-6 lg:px-10">
        <Reveal className="text-center">
          <p className="m-label mb-4">How it works</p>
          <h2 className="m-display mx-auto max-w-[20ch] text-[clamp(2rem,4vw,3rem)] text-[var(--m-cream)]">
            Four steps from messy sheets to a payroll you will actually rerun.
          </h2>
        </Reveal>

        <div className="relative mt-20 space-y-14 lg:space-y-16">
          {steps.map((s, i) => (
            <Reveal key={s.step}>
              <div
                className={`flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-16 ${
                  i % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className={`lg:w-1/2 ${i % 2 === 0 ? "lg:text-right" : ""}`}>
                  <span className="m-display text-5xl text-[var(--m-gold)]/25">{s.step}</span>
                  <h3 className="m-display mt-2 text-2xl text-[var(--m-cream)]">{s.title}</h3>
                  <p className="m-body mt-3 text-[0.9375rem]">{s.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
