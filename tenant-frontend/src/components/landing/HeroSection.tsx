import Link from "next/link";

const rows = [
  { name: "Hanna T.", net: "42,180", status: "Paid" },
  { name: "Samuel K.", net: "38,940", status: "Paid" },
  { name: "Meron A.", net: "51,200", status: "Sending" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-[7.5rem] pb-24 lg:pb-32">
      <div className="m-grid-bg pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative mx-auto max-w-[76rem] px-6 lg:px-10">
        <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div className="m-hero-in">
            <p className="m-label mb-6">Built for Ethiopian companies</p>

            <h1 className="m-display text-[clamp(2.75rem,6vw,4.25rem)] text-[var(--m-cream)]">
              Payday should feel boring.
              <br />
              <span className="text-[var(--m-gold)] italic">In a good way.</span>
            </h1>

            <p className="m-body mt-7 max-w-[34rem]">
              Your team wants salaries on time. Finance wants clean numbers. ERCA wants it done right.
              Demoz ties people, tax, attendance, and Chapa payouts together so you stop playing messenger
              between Excel, WhatsApp, and the bank.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/login" className="m-btn-primary">
                Run your next payroll here
              </Link>
              <a href="#capabilities" className="m-btn-ghost">
                Show me what I get
              </a>
            </div>

            <div className="mt-14 flex flex-wrap gap-10 border-t border-[var(--m-border)] pt-10">
              <div>
                <p className="m-display text-3xl text-[var(--m-gold)]">One</p>
                <p className="mt-1 max-w-[9rem] text-[0.75rem] leading-snug text-[var(--m-muted)]">
                  workspace for HR, finance, and owners
                </p>
              </div>
              <div>
                <p className="m-display text-3xl text-[var(--m-gold)]">ERCA</p>
                <p className="mt-1 max-w-[9rem] text-[0.75rem] leading-snug text-[var(--m-muted)]">
                  tax and pension calculated for you
                </p>
              </div>
              <div>
                <p className="m-display text-3xl text-[var(--m-gold)]">Chapa</p>
                <p className="mt-1 max-w-[9rem] text-[0.75rem] leading-snug text-[var(--m-muted)]">
                  bulk salary send with live status
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div
              className="m-card m-float relative w-full max-w-[26rem] p-5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]"
              aria-hidden
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="m-label mb-1">This month&apos;s run</p>
                  <p className="text-sm font-semibold text-[var(--m-cream)]">248 people · May 2026</p>
                </div>
                <span className="rounded-full bg-[var(--m-teal)]/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--m-teal)]">
                  Live
                </span>
              </div>
              <div className="space-y-2">
                {rows.map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between rounded-xl border border-[var(--m-border)] bg-[var(--m-bg)]/60 px-4 py-3"
                  >
                    <span className="text-sm text-[var(--m-cream)]">{r.name}</span>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums text-[var(--m-gold)]">{r.net} ETB</p>
                      <p className="text-[0.65rem] text-[var(--m-muted)]">{r.status}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--m-surface)]">
                  <div className="m-progress-bar h-full rounded-full bg-gradient-to-r from-[var(--m-terracotta)] to-[var(--m-gold)]" />
                </div>
                <span className="text-[0.65rem] font-medium text-[var(--m-muted)]">94%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
