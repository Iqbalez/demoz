import Link from "next/link";
import { Reveal } from "./Reveal";

export function CTASection() {
  return (
    <section className="pb-28 lg:pb-36">
      <div className="mx-auto max-w-[76rem] px-6 lg:px-10">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-[var(--m-border-strong)] px-8 py-16 text-center lg:px-20 lg:py-24">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--m-terracotta)]/15 via-transparent to-[var(--m-gold)]/10" />

            <p className="m-label relative mb-4">Still doing payroll the hard way?</p>
            <h2 className="m-display relative mx-auto max-w-[20ch] text-[clamp(2rem,4vw,3.25rem)] text-[var(--m-cream)]">
              Give your team a payday they trust. Give yourself the weekend back.
            </h2>
            <p className="m-body relative mx-auto mt-5 max-w-lg">
              Start a workspace in minutes. Run one payroll cycle and you will know if Demoz earns a seat
              at your table. No deck required.
            </p>
            <div className="relative mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/login" className="m-btn-primary">
                Start free trial
              </Link>
              <a
                href="mailto:iqbalezedin@gmail.com?subject=Demoz%20demo%20request&body=Hi%20Iqbal%2C%0A%0AI%27d%20like%20to%20learn%20more%20about%20Demoz%20for%20my%20company.%0A%0ACompany%20name%3A%20%0AHeadcount%3A%20%0A"
                className="m-btn-ghost"
              >
                Let&apos;s connect
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
