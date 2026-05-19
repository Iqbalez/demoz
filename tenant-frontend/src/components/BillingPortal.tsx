"use client";

import React, { useState } from "react";

export interface BillingPortalProps {
  currentPlan: string;
  maxEmployees: number;
  onUpgradePlan: (plan: string, maxEmp: number) => void;
}

export default function BillingPortal({ currentPlan, maxEmployees, onUpgradePlan }: BillingPortalProps) {
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState({ name: "", price: 0, limit: 10 });
  const [checkoutStatus, setCheckoutStatus] = useState<"IDLE" | "PROCESSING" | "SUCCESS">("IDLE");

  const plans = [
    { name: "FREE", price: 0, limit: 10, features: ["Up to 10 Employees", "Standard USSD logins", "Standard attendance logs", "Local host support"] },
    { name: "GROWTH", price: 1500, limit: 50, features: ["Up to 50 Employees", "Advanced Geofencing", "AI Audit Report Access", "Simulated Chapa disbursements", "Priority email support"] },
    { name: "ENTERPRISE", price: 4000, limit: 999, features: ["Unlimited Employees", "Dedicated custom USSD Shortcode", "Bulk CSV/Excel onboarding", "Real Chapa API support", "24/7 Phone support"] },
  ];

  const handleOpenCheckout = (planName: string, price: number, limit: number) => {
    setSelectedPlan({ name: planName, price, limit });
    setCheckoutStatus("IDLE");
    setShowCheckoutModal(true);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStatus("PROCESSING");
    setTimeout(() => {
      setCheckoutStatus("SUCCESS");
      setTimeout(() => {
        onUpgradePlan(selectedPlan.name, selectedPlan.limit);
        setShowCheckoutModal(false);
      }, 1200);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header Info */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">SaaS Billing</h2>
        <p className="text-sm text-slate-400">Scale employee limits and unlock advanced geolocation auditing features.</p>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentPlan.toLowerCase() === plan.name.toLowerCase();
          
          return (
            <div 
              key={plan.name} 
              className={`p-6 rounded-3xl glass-card flex flex-col justify-between h-[380px] transition-all relative border border-slate-100 dark:border-zinc-800/80 ${
                isCurrent 
                  ? "border-emerald-500/40 ring-1 ring-emerald-500/25 bg-emerald-500/[0.02]" 
                  : "hover:scale-[1.01]"
              }`}
            >
              {isCurrent && (
                <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold text-[8px] tracking-wider uppercase">
                  ACTIVE TIER
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">{plan.price}</span>
                    <span className="text-xs text-slate-400 font-semibold font-mono">ETB / month</span>
                  </div>
                  <p className="text-[10px] text-emerald-500 font-bold mt-1">Allows {plan.limit === 999 ? "unlimited" : plan.limit} onboarded employees</p>
                </div>
                
                <ul className="space-y-2 border-t border-slate-100 dark:border-zinc-800/60 pt-3 text-xs text-slate-500 dark:text-zinc-400">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-1.5 font-medium">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-bold rounded-xl text-xs"
                  >
                    Active Package
                  </button>
                ) : plan.price === 0 ? (
                  <button
                    disabled
                    className="w-full py-2 bg-slate-100 dark:bg-zinc-800 text-slate-400 font-bold rounded-xl text-xs"
                  >
                    Unavailable
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenCheckout(plan.name, plan.price, plan.limit)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs active:scale-95 transition-all shadow-md cursor-pointer border border-emerald-500/20"
                  >
                    Upgrade Tier
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoice History Receipts */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 font-outfit">Recent Invoices</h3>
        <div className="rounded-2xl glass-card overflow-hidden shadow-sm border border-slate-100 dark:border-zinc-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-500 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800/80">
                  <th className="py-4 px-5">Invoice Reference</th>
                  <th className="py-4 px-5">Billing Period</th>
                  <th className="py-4 px-5">Amount</th>
                  <th className="py-4 px-5">Method</th>
                  <th className="py-4 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40 text-xs text-slate-700 dark:text-zinc-200">
                <tr className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/10">
                  <td className="py-4 px-5 font-mono text-[10px] font-bold text-slate-900 dark:text-zinc-50">#INV-DEMOZ-8392</td>
                  <td className="py-4 px-5 font-medium">May 01, 2026 - May 31, 2026</td>
                  <td className="py-4 px-5 font-mono font-semibold">1,500 ETB</td>
                  <td className="py-4 px-5 font-medium">Chapa (CBE Birr Wallet)</td>
                  <td className="py-4 px-5 text-right">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      PAID
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/10">
                  <td className="py-4 px-5 font-mono text-[10px] font-bold text-slate-900 dark:text-zinc-50">#INV-DEMOZ-7290</td>
                  <td className="py-4 px-5 font-medium">Apr 01, 2026 - Apr 30, 2026</td>
                  <td className="py-4 px-5 font-mono font-semibold">0 ETB</td>
                  <td className="py-4 px-5 font-medium">Standard Free Plan</td>
                  <td className="py-4 px-5 text-right">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-200/40 dark:border-zinc-800/40">
                      FREE SYSTEM
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CHAPA PAYMENT CHECKOUT SIMULATOR */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            
            {/* Chapa Checkout Header */}
            <div className="bg-[#0b5c46] p-4 text-center text-white relative">
              <span className="text-[9px] uppercase tracking-widest text-emerald-300 font-bold block">Secure Chapa Checkout</span>
              <h3 className="text-base font-bold font-outfit mt-0.5">Demoz Corporate upgrade</h3>
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="absolute top-4 right-4 text-emerald-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="p-5 space-y-4 text-xs">
              
              {checkoutStatus === "IDLE" && (
                <>
                  <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/80 text-center">
                    <span className="text-[9px] text-slate-400 font-semibold block uppercase">Upgrading to {selectedPlan.name}</span>
                    <span className="text-xl font-bold text-slate-800 dark:text-zinc-50 font-outfit mt-1 block">{selectedPlan.price.toLocaleString()} ETB</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Payment Method</label>
                      <select className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl font-semibold focus:outline-none">
                        <option>CBE Birr Wallet</option>
                        <option>Telebirr (Mobile Money)</option>
                        <option>Commercial Bank of Ethiopia (CBE) Card</option>
                        <option>Awash Bank Transfer</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Mobile Number / Wallet ID</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl font-mono focus:outline-none text-center" 
                        placeholder="0911000000"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowCheckoutModal(false)}
                      className="flex-1 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold rounded-xl active:scale-95 cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-2 bg-[#0b5c46] hover:bg-[#084534] text-white font-semibold rounded-xl active:scale-95 cursor-pointer shadow-md text-center"
                    >
                      Authorize Payment
                    </button>
                  </div>
                </>
              )}

              {checkoutStatus === "PROCESSING" && (
                <div className="py-8 text-center space-y-4">
                  <div className="w-10 h-10 border-4 border-[#0b5c46] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-zinc-50 font-outfit">Contacting Tele-wallet...</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-1">Please approve the Chapa OTP notification on your phone.</p>
                  </div>
                </div>
              )}

              {checkoutStatus === "SUCCESS" && (
                <div className="py-8 text-center space-y-4 animate-fade-in">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-xl mx-auto font-bold animate-float">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-600 dark:text-emerald-400 font-outfit">Upgrade Approved!</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-1">Subscription increased to {selectedPlan.name}. Limit expanded to {selectedPlan.limit} seats.</p>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
