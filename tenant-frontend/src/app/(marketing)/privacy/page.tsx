import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function PrivacyPolicy() {
  return (
    <>
      <LandingNav />
      <main className="min-h-screen bg-[var(--m-bg)] pt-32 pb-20 text-[var(--m-cream)]">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <h1 className="m-display text-4xl mb-8">Privacy Policy</h1>
          <div className="prose prose-invert max-w-none text-[var(--m-muted)] space-y-6">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            
            <section>
              <h2 className="text-xl text-[var(--m-cream)] font-semibold mb-3">1. Information We Collect</h2>
              <p>We collect information to provide better services to all our users. For employees of our subscribing tenants, we collect:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Personal identifiers (Name, Phone Number, National Tax ID, Fayda Number).</li>
                <li>Financial information (Bank Account details) exclusively for processing payroll.</li>
                <li>Geolocation data (exact GPS coordinates) strictly during active check-in/out via our PWA or USSD services.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl text-[var(--m-cream)] font-semibold mb-3">2. How We Protect Your Data</h2>
              <p>We employ industry-standard security measures, including:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Encryption at Rest:</strong> Highly sensitive details, including Tax ID numbers, Bank Accounts, and GPS check-in locations, are securely encrypted within our database using AES-256-GCM encryption.</li>
                <li><strong>Secure Transit:</strong> All data transferred between your device and our servers is protected using strict HTTPS/TLS protocols.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl text-[var(--m-cream)] font-semibold mb-3">3. Data Retention and Minimization</h2>
              <p>We believe in keeping your data only for as long as it is absolutely necessary:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Location Tracking Logs:</strong> Granular attendance logs and GPS tracking coordinates are automatically and permanently purged from our systems after 30 days.</li>
                <li><strong>Employee Records:</strong> Terminated employee data is retained for 7 years to comply with Ethiopian tax and labor laws, after which it is permanently deleted.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl text-[var(--m-cream)] font-semibold mb-3">4. Third-Party Sharing</h2>
              <p>We do not sell your personal data to third parties. We only share information with trusted compliance, banking, and tax authorities when strictly required by Ethiopian law to process payroll, pension, and tax obligations.</p>
            </section>

            <section>
              <h2 className="text-xl text-[var(--m-cream)] font-semibold mb-3">5. Your Rights</h2>
              <p>You have the right to request access to, correction of, or deletion of your personal data. Please contact your employer (the subscribing tenant) or reach out to our privacy team at iqbalezedin@gmail.com.</p>
            </section>
          </div>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
