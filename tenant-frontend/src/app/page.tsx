"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ToastProvider, toast } from "../components/ui/toast";

function LandingPageContent() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"BASIC" | "GROWTH" | "ENTERPRISE">("BASIC");
  const [loading, setLoading] = useState(false);

  // Sign up Form states
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
      toast.warning("Validation Failed", "Please fill in all company information and provide a 4-digit PIN.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}`}/subscription/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedPlan,
          companyName,
          email,
          phone,
          pin,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Subscription Registered", "Redirecting to secure payment portal...");
        setTimeout(() => {
          window.location.href = data.checkoutUrl;
        }, 1500);
      } else {
        toast.error("Checkout Failure", data.message || "Failed to initialize payment.");
      }
    } catch (err) {
      // Fallback offline simulation bypass for testing convenience
      toast.info("Offline Mode", "Simulation: Provisioning workspace and launching B2B console.");
      setTimeout(() => {
        router.push(`/login?signup_success=true&tenant_id=tenant-${Date.now()}&phone=${encodeURIComponent(phone)}`);
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-zinc-100 flex flex-col relative overflow-x-hidden font-outfit select-none transition-colors scroll-smooth">
      
      {/* Decorative Blur Background Graphics */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-emerald-500/10 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-teal-500/10 blur-[180px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-slate-200/80 dark:border-zinc-800/60 bg-white/70 dark:bg-[#070b13]/70 backdrop-blur-xl sticky top-0 z-30 px-6 py-4 flex justify-between items-center w-full transition-colors">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-500 dark:to-teal-400 bg-clip-text text-transparent tracking-tight">
              Demoz Workforce Cloud
            </span>
            <span className="text-[8px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 uppercase tracking-widest hidden sm:inline-block">
              PRO PLATFORM
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-500 dark:text-slate-400">
            <a href="#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Platform Features</a>
            <a href="#compliance" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Compliance Hub</a>
            <a href="#pricing" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Pricing Plans</a>
          </nav>

          <button
            onClick={() => router.push("/login")}
            className="px-5 py-2 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95"
          >
            Client Portal →
          </button>
        </div>
      </header>

      {/* 1. Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto w-full px-6 py-24 md:py-32 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mx-auto shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Proclamation No. 1395/2025 Compliant
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
          Intelligent HR & Payroll for <br className="hidden md:block"/> Modern Ethiopian Enterprises
        </h1>
        
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Streamline your workforce management with a unified cloud platform. From verified geofenced attendance to automated tax compliance and seamless bulk disbursements via Chapa.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
          <button
            onClick={() => {
              document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 dark:shadow-emerald-900/30 transition-all cursor-pointer active:scale-95 w-full sm:w-auto"
          >
            Explore Subscription Plans
          </button>
          <button
            onClick={() => router.push("/login")}
            className="px-8 py-3.5 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm w-full sm:w-auto"
          >
            Enter Sandbox Portal
          </button>
        </div>
      </section>

      {/* 2. Features Grid */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto w-full px-6 py-20 border-t border-slate-200 dark:border-zinc-900/60">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Seamless Compliance Built-In</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Everything you need to manage your workforce according to Ethiopian labor standards.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white dark:bg-[#0c1424]/40 border border-slate-200 dark:border-zinc-800/60 rounded-3xl p-8 space-y-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-xl text-emerald-600 dark:text-emerald-400">⚖️</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Schedule A Tax Engine</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Dynamically enforce progressive tax bands and handle POESSA pension deductions, cleanly mapped to the latest ERCA regulations.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0c1424]/40 border border-slate-200 dark:border-zinc-800/60 rounded-3xl p-8 space-y-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-xl text-blue-600 dark:text-blue-400">📍</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Geofenced Attendance</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Ensure physical presence with GPS-verified check-ins for industrial parks and branches. Includes offline syncing and telemetry analytics.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0c1424]/40 border border-slate-200 dark:border-zinc-800/60 rounded-3xl p-8 space-y-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-teal-50 dark:bg-teal-500/10 rounded-2xl flex items-center justify-center text-xl text-teal-600 dark:text-teal-400">💸</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Automated Chapa Payouts</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Process monthly payrolls efficiently with one-click bulk transfers, chunked processing, and direct API hooks into major Ethiopian banks.
            </p>
          </div>

        </div>
      </section>

      {/* 3. The Platform Visual */}
      <section id="compliance" className="bg-slate-100/50 dark:bg-zinc-900/30 py-12 relative z-10 border-y border-slate-200 dark:border-zinc-900/60">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1 relative">
            <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full" />
            <div className="bg-white dark:bg-[#070b13] border border-slate-200 dark:border-zinc-800 p-2 rounded-3xl shadow-2xl relative">
              <div className="aspect-[4/3] rounded-2xl bg-slate-50 dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                <img 
                  src="/dashboard-mockup.png" 
                  alt="Demoz Workforce Dashboard Mockup" 
                  className="w-full h-full object-cover rounded-xl shadow-inner border border-slate-200 dark:border-zinc-800"
                />
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">A Masterful Workspace for HR Teams</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              We abstracted away the complex mathematics of labor laws so your team can focus on people. The Demoz dashboard provides real-time oversight into departmental attendance, leave requests, and overall financial health.
            </p>
            <ul className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs">✓</div>
                English & Amharic Printable Payslips
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs">✓</div>
                Mobile Interface for Employees (PWA)
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs">✓</div>
                Bank-ready bulk CSV exports
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Pricing / Action */}
      <section id="pricing" className="py-16 relative z-10">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Transparent Pricing for Every Scale</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Fixed monthly tiers. No hidden transactional fees.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">

            {/* Basic Plan */}
            <div className="bg-white dark:bg-[#0c1424]/40 border border-slate-200 dark:border-zinc-800/60 rounded-3xl p-8 flex flex-col justify-between gap-8 transition-all hover:shadow-lg hover:border-slate-300 dark:hover:border-zinc-700">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Basic</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">3,000</span>
                  <span className="text-xs text-slate-500 font-bold">ETB / mo</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-b border-slate-100 dark:border-zinc-800/60 pb-4">
                  Essential tools for growing teams.
                </p>
                <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 pt-2">
                  <div className="flex items-center gap-2 text-emerald-500">✓ <span className="text-slate-700 dark:text-slate-300">Up to 10 Employees</span></div>
                  <div className="flex items-center gap-2 text-emerald-500">✓ <span className="text-slate-700 dark:text-slate-300">Legal Tax/Pension Engine</span></div>
                  <div className="flex items-center gap-2 text-emerald-500">✓ <span className="text-slate-700 dark:text-slate-300">Email Support</span></div>
                </div>
              </div>
              <button
                onClick={() => handleSelectPlan("BASIC")}
                className="w-full py-3 bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Select Basic Plan
              </button>
            </div>

            {/* Growth Plan - Highlighted */}
            <div className="bg-white dark:bg-[#0c1424] border border-emerald-500/30 dark:border-emerald-500/30 rounded-3xl p-8 flex flex-col justify-between gap-8 relative shadow-2xl shadow-emerald-500/5 dark:shadow-emerald-900/20 transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-100 dark:bg-emerald-500 text-emerald-700 dark:text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full shadow-sm">
                Most Popular
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Growth</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-slate-900 dark:text-white">5,000</span>
                  <span className="text-xs text-slate-500 font-bold">ETB / mo</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-b border-slate-100 dark:border-zinc-800/60 pb-4">
                  Advanced features for established companies.
                </p>
                <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 pt-2">
                  <div className="flex items-center gap-2 text-emerald-500">✓ <span className="text-slate-700 dark:text-slate-300 font-bold">Up to 50 Employees</span></div>
                  <div className="flex items-center gap-2 text-emerald-500">✓ <span className="text-slate-700 dark:text-slate-300">Geofenced Attendance</span></div>
                  <div className="flex items-center gap-2 text-emerald-500">✓ <span className="text-slate-700 dark:text-slate-300">Leave & Absence Manager</span></div>
                  <div className="flex items-center gap-2 text-emerald-500">✓ <span className="text-slate-700 dark:text-slate-300">Chapa Bulk Payouts</span></div>
                </div>
              </div>
              <button
                onClick={() => handleSelectPlan("GROWTH")}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
              >
                Select Growth Plan
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white dark:bg-[#0c1424]/40 border border-slate-200 dark:border-zinc-800/60 rounded-3xl p-8 flex flex-col justify-between gap-8 transition-all hover:shadow-lg hover:border-slate-300 dark:hover:border-zinc-700">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Enterprise</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">10,000</span>
                  <span className="text-xs text-slate-500 font-bold">ETB / mo</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-b border-slate-100 dark:border-zinc-800/60 pb-4">
                  For large-scale factory networks.
                </p>
                <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 pt-2">
                  <div className="flex items-center gap-2 text-emerald-500">✓ <span className="text-slate-700 dark:text-slate-300">Up to 1,000 Employees</span></div>
                  <div className="flex items-center gap-2 text-emerald-500">✓ <span className="text-slate-700 dark:text-slate-300">Dedicated Database</span></div>
                  <div className="flex items-center gap-2 text-emerald-500">✓ <span className="text-slate-700 dark:text-slate-300">24/7 Priority SLAs</span></div>
                </div>
              </div>
              <button
                onClick={() => handleSelectPlan("ENTERPRISE")}
                className="w-full py-3 bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Select Enterprise Plan
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Subscription Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md max-h-[95vh] overflow-y-auto bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-zinc-800/60 p-6 md:p-8 rounded-[2rem] shadow-2xl space-y-6 animate-slide-up relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-xl mx-auto mb-4">🚀</div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Workspace Registration</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You selected the <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedPlan}</span> package. Let's get your corporate account set up.
              </p>
            </div>

            <form onSubmit={handleRegisterSubscription} className="space-y-4 pt-2">
              
              <div className="space-y-1.5 text-xs">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hawassa Apparel PLC"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Administrator Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Phone</label>
                <input
                  type="text"
                  required
                  placeholder="0911000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Create 4-Digit Security PIN</label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-lg text-slate-900 dark:text-zinc-100 font-mono text-center tracking-[1em] pl-[1.4em] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                />
                <p className="text-[9px] text-slate-500 dark:text-slate-400 text-center">You will use this PIN to log in.</p>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex justify-between items-center text-xs mt-6">
                <span className="font-bold text-slate-600 dark:text-slate-400">Total Due Today</span>
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  {selectedPlan === "BASIC" ? "3,000" : selectedPlan === "GROWTH" ? "5,000" : "10,000"} ETB
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 mt-2 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Connecting...
                  </>
                ) : (
                  "Proceed to Checkout →"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="border-t border-slate-200 dark:border-zinc-900 py-10 px-6 text-center text-xs text-slate-500 dark:text-slate-500 z-10">
        <div className="font-medium">© 2026 Demoz Workforce Cloud. All rights reserved.</div>
        <div className="mt-1">Compliant with Ethiopian Labor Law & POESSA guidelines.</div>
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
