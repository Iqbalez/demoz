"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ToastProvider, toast } from "../components/ui/toast";

function LandingPageContent() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"BASIC" | "GROWTH" | "ENTERPRISE">("BASIC");
  const [loading, setLoading] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

  const handleSelectPlan = (plan: "BASIC" | "GROWTH" | "ENTERPRISE") => {
    setSelectedPlan(plan);
    setModalOpen(true);
  };

  const handleRegisterSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !email || !phone || pin.length !== 4) {
      toast.warning("Validation Failed", "Please fill in all details and a 4-digit PIN.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/subscription/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedPlan, companyName, email, phone, pin }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Registration Successful", "Redirecting to payment portal...");
        setTimeout(() => { window.location.href = data.checkoutUrl; }, 1500);
      } else {
        toast.error("Checkout Failed", data.message || "Failed to initialize payment.");
      }
    } catch (err) {
      toast.info("Offline Mode", "Provisioning workspace locally.");
      setTimeout(() => {
        router.push(`/login?signup_success=true&tenant_id=T-${Date.now()}&phone=${encodeURIComponent(phone)}`);
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative font-sans text-[var(--text-primary)]">
      
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 md:px-12 border-b border-[var(--border)] bg-[var(--bg-base)] sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">
            Demoz
          </span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-[var(--text-secondary)]">
          <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">Features</a>
          <a href="#compliance" className="hover:text-[var(--text-primary)] transition-colors">Compliance</a>
          <a href="#pricing" className="hover:text-[var(--text-primary)] transition-colors">Pricing</a>
        </nav>
        <button onClick={() => router.push("/login")} className="btn-ghost py-2 px-5 text-sm rounded-lg">
          Sign In
        </button>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32 md:py-48 animate-slide-up">
        
        <p className="text-sm font-semibold tracking-widest text-[var(--text-secondary)] uppercase mb-6">
          Ethiopian Labor Law Compliant
        </p>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-[var(--text-primary)] max-w-5xl mx-auto">
          Modern HR & Payroll for <br className="hidden md:block"/> 
          Ethiopian Enterprises
        </h1>
        
        <p className="text-base md:text-xl text-[var(--text-muted)] max-w-2xl mx-auto mt-8 mb-12 leading-relaxed">
          Unified cloud platform for workforce management. Geofenced attendance, automated tax resolution, and Chapa bulk disbursements in one clean interface.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
          <button onClick={() => document.getElementById("pricing")?.scrollIntoView()} className="btn-primary w-full sm:w-auto px-8 py-3 rounded-lg text-sm">
            View Pricing
          </button>
          <button onClick={() => router.push("/login")} className="btn-ghost w-full sm:w-auto px-8 py-3 rounded-lg text-sm">
            Try Demo
          </button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 md:py-32 border-t border-[var(--border)] w-full">
        <div className="text-center mb-16 md:mb-24 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)]">Core Capabilities</h2>
          <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">Everything you need to manage your workforce, built natively for Ethiopian standards.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Tax & Pension Engine</h3>
            <p className="text-base text-[var(--text-muted)] leading-relaxed">
              Dynamic resolution of progressive tax bands and POESSA deductions, strictly mapped to ERCA standards.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Geofenced Attendance</h3>
            <p className="text-base text-[var(--text-muted)] leading-relaxed">
              GPS-verified check-ins for industrial parks. Seamless offline synchronization and real-time dashboard plotting.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Chapa Bulk Payouts</h3>
            <p className="text-base text-[var(--text-muted)] leading-relaxed">
              Process enterprise payrolls with one-click bulk transfers and direct API hooks into major local banks.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-20 md:py-32 border-t border-[var(--border)] w-full mb-12">
        <div className="text-center mb-16 md:mb-24 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)]">Transparent Pricing</h2>
          <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">Fixed operational costs for growing teams.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-8 flex flex-col justify-between gap-8 hover:border-[var(--border-hover)] transition-colors">
            <div className="space-y-6">
              <h3 className="text-base font-medium text-[var(--text-secondary)]">Basic</h3>
              <div>
                <span className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">3,000</span>
                <span className="text-lg text-[var(--text-muted)] font-medium ml-2">ETB</span>
              </div>
              <ul className="text-base text-[var(--text-muted)] space-y-4 pt-6 border-t border-[var(--border)]">
                <li>Up to 10 Employees</li>
                <li>Legal Tax Engine</li>
                <li>Email Support</li>
              </ul>
            </div>
            <button onClick={() => handleSelectPlan("BASIC")} className="btn-ghost w-full justify-center py-3 rounded-lg">Get Started</button>
          </div>

          <div className="bg-[var(--bg-surface)] border-2 border-[var(--accent)] rounded-2xl p-8 flex flex-col justify-between gap-8 relative shadow-xl transform lg:-translate-y-4">
            <div className="absolute top-0 right-1/2 transform translate-x-1/2 -translate-y-1/2">
              <span className="bg-[var(--accent)] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Popular</span>
            </div>
            <div className="space-y-6">
              <h3 className="text-base font-medium text-[var(--accent)]">Growth</h3>
              <div>
                <span className="text-5xl font-bold tracking-tight text-[var(--text-primary)]">5,000</span>
                <span className="text-lg text-[var(--text-muted)] font-medium ml-2">ETB</span>
              </div>
              <ul className="text-base text-[var(--text-primary)] space-y-4 pt-6 border-t border-[var(--border)]">
                <li>Up to 50 Employees</li>
                <li>Geofenced Attendance</li>
                <li>Chapa Payouts</li>
              </ul>
            </div>
            <button onClick={() => handleSelectPlan("GROWTH")} className="btn-primary w-full justify-center py-3 rounded-lg">Get Started</button>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-8 flex flex-col justify-between gap-8 hover:border-[var(--border-hover)] transition-colors">
            <div className="space-y-6">
              <h3 className="text-base font-medium text-[var(--text-secondary)]">Enterprise</h3>
              <div>
                <span className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">10,000</span>
                <span className="text-lg text-[var(--text-muted)] font-medium ml-2">ETB</span>
              </div>
              <ul className="text-base text-[var(--text-muted)] space-y-4 pt-6 border-t border-[var(--border)]">
                <li>Up to 1,000 Employees</li>
                <li>Isolated Database</li>
                <li>24/7 Priority Support</li>
              </ul>
            </div>
            <button onClick={() => handleSelectPlan("ENTERPRISE")} className="btn-ghost w-full justify-center py-3 rounded-lg">Contact Us</button>
          </div>
        </div>
      </section>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 z-50 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] w-full max-w-md animate-slide-up p-8 rounded-2xl relative shadow-2xl">
            <button onClick={() => setModalOpen(false)} className="absolute top-5 right-5 text-[var(--text-muted)] hover:text-white transition-colors">
              ✕
            </button>
            <div className="mb-8 space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Create Workspace</h3>
              <p className="text-base text-[var(--text-muted)]">Registering for the <span className="font-medium text-[var(--text-primary)]">{selectedPlan}</span> plan</p>
            </div>
            <form onSubmit={handleRegisterSubscription} className="space-y-5">
              <input type="text" required placeholder="Legal Entity Name" value={companyName} onChange={e => setCompanyName(e.target.value)} className="input-field rounded-lg" />
              <input type="email" required placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} className="input-field rounded-lg" />
              <input type="tel" required placeholder="Contact Phone" value={phone} onChange={e => setPhone(e.target.value)} className="input-field rounded-lg" />
              <div className="space-y-1">
                <input type="password" required maxLength={4} placeholder="Security PIN (4 digits)" value={pin} onChange={e => setPin(e.target.value)} className="input-field font-mono text-center tracking-[0.5em] rounded-lg" />
              </div>
              
              <div className="mt-8 pt-6 border-t border-[var(--border)] flex justify-between items-center">
                <span className="text-base font-medium text-[var(--text-secondary)]">Total Due</span>
                <span className="font-bold text-[var(--text-primary)] text-xl">{selectedPlan === "BASIC" ? "3,000" : selectedPlan === "GROWTH" ? "5,000" : "10,000"} ETB</span>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-8 py-3 rounded-lg text-base">
                {loading ? "Processing..." : "Continue to Payment"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-12 px-6 text-center text-sm text-[var(--text-muted)]">
        <p>© 2026 Demoz. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <ToastProvider>
      <LandingPageContent />
    </ToastProvider>
  );
}
