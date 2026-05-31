import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function TermsOfService() {
  return (
    <>
      <LandingNav />
      <main className="min-h-screen bg-[var(--m-bg)] pt-32 pb-20 text-[var(--m-cream)]">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <h1 className="m-display text-4xl mb-8">Terms of Service</h1>
          <div className="prose prose-invert max-w-none text-[var(--m-muted)] space-y-6">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            
            <section>
              <h2 className="text-xl text-[var(--m-cream)] font-semibold mb-3">1. Acceptance of Terms</h2>
              <p>By accessing or using the Demoz platform, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions, you must not use our services.</p>
            </section>

            <section>
              <h2 className="text-xl text-[var(--m-cream)] font-semibold mb-3">2. Service Description</h2>
              <p>Demoz provides human resources, attendance tracking, and payroll management software strictly for Ethiopian businesses ("Tenants") and their employees. We act as a data processor on behalf of the Tenants, who are the data controllers.</p>
            </section>

            <section>
              <h2 className="text-xl text-[var(--m-cream)] font-semibold mb-3">3. Data Privacy and Security</h2>
              <p>Your privacy is important to us. Demoz securely encrypts highly sensitive information at rest, including taxpayer identification numbers, bank accounts, and exact GPS coordinates collected during attendance. Please refer to our <a href="/privacy" className="text-[var(--m-cream)] underline">Privacy Policy</a> for detailed information on how we collect, use, and protect your data.</p>
            </section>

            <section>
              <h2 className="text-xl text-[var(--m-cream)] font-semibold mb-3">4. Appropriate Use</h2>
              <p>You agree not to misuse the Demoz platform. This includes, but is not limited to, attempting to compromise our security, reverse-engineering our services, or using the platform for any illegal or unauthorized purpose.</p>
            </section>

            <section>
              <h2 className="text-xl text-[var(--m-cream)] font-semibold mb-3">5. Limitation of Liability</h2>
              <p>Demoz is provided "as is". While we strive for 100% uptime and complete data accuracy, we shall not be held liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our services, including payroll miscalculations or data loss due to unforeseen circumstances.</p>
            </section>

            <section>
              <h2 className="text-xl text-[var(--m-cream)] font-semibold mb-3">6. Modifications to Service</h2>
              <p>We reserve the right to modify or discontinue, temporarily or permanently, the Demoz platform (or any part thereof) with or without notice. We will communicate significant changes to our Tenants.</p>
            </section>
          </div>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
