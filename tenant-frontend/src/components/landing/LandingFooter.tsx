import Link from "next/link";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--m-border)] bg-[var(--m-bg)]/80">
      <div className="mx-auto flex max-w-[76rem] flex-col gap-10 px-6 py-14 lg:flex-row lg:items-start lg:justify-between lg:px-10">
        <div>
          <Link href="/" className="m-display text-2xl text-[var(--m-cream)]">
            Demoz
          </Link>
          <p className="mt-3 max-w-xs text-[0.875rem] leading-relaxed text-[var(--m-muted)]">
            HR and payroll software for Ethiopian businesses. Built in Addis for teams who are done
            apologizing after month end.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <div>
            <p className="m-label mb-4 text-[var(--m-muted)]">Product</p>
            <ul className="space-y-2 text-[0.8125rem] text-[var(--m-muted)]">
              <li>
                <a href="#capabilities" className="hover:text-[var(--m-cream)]">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-[var(--m-cream)]">
                  Pricing
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-[var(--m-cream)]">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="m-label mb-4 text-[var(--m-muted)]">Company</p>
            <ul className="space-y-2 text-[0.8125rem] text-[var(--m-muted)]">
              <li>
                <a
                  href="mailto:iqbalezedin@gmail.com?subject=Demoz%20inquiry"
                  className="hover:text-[var(--m-cream)]"
                >
                  Contact
                </a>
              </li>
              <li><span>Privacy</span></li>
              <li><span>Terms</span></li>
            </ul>
          </div>
          <div>
            <p className="m-label mb-4 text-[var(--m-muted)]">Locale</p>
            <p className="text-[0.8125rem] text-[var(--m-muted)]">English (Amharic coming)</p>
            <p className="mt-2 text-[0.8125rem] text-[var(--m-muted)]">Addis Ababa, Ethiopia</p>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--m-border)] py-6 text-center text-[0.75rem] text-[var(--m-faint)]">
        © {year} Demoz. All rights reserved.
      </div>
    </footer>
  );
}
