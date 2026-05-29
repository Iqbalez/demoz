"use client";

import React from "react";
import { useDashboard } from "../context/DashboardContext";
import { apiRequest } from "@/lib/api";
import { getPlanMeta, normalizePlanTier } from "@/lib/plan-tiers";

const PLAN_FEATURES: Record<string, string[]> = {
  FREE: ["Up to 10 employees (sandbox)", "Basic payroll calculations", "Attendance logging"],
  BASIC: ["Up to 10 employees", "USSD clock-ins", "Geofenced attendance", "ERCA/POESSA CSV exports"],
  GROWTH: ["Up to 50 employees", "Advanced geofencing", "Compliance exports", "Chapa renewal billing"],
  ENTERPRISE: ["High seat allocation", "Custom support", "Full statutory export pack"],
};

export default function BillingPortal() {
  const { stats } = useDashboard();
  const [invoices, setInvoices] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const data = await apiRequest<any[]>("/subscription/invoices");
      setInvoices(data);
    } catch {
      setInvoices([]);
    }
  };

  const planKey = normalizePlanTier(stats.planTier);
  const planMeta = getPlanMeta(stats.planTier);
  const seatLimit = stats.maxEmployees || planMeta.maxEmployees;
  const features = PLAN_FEATURES[planKey] || PLAN_FEATURES.FREE;
  const companySlug = stats.companyName.toUpperCase().replace(/\s+/g, "");

  // Find unpaid renewal invoices
  let renewalUrl = "#";
  let hasUnpaidRenewal = false;
  
  const pendingInvoice = invoices.find(inv => !inv.isPaid);
  if (pendingInvoice) {
    hasUnpaidRenewal = true;
    try {
      const parsed = JSON.parse(pendingInvoice.chapaPaymentReference || "{}");
      renewalUrl = parsed.checkoutUrl || "#";
    } catch (e) {
      renewalUrl = `${window.location.origin}/dashboard/billing?payment_success=true&ref=${pendingInvoice.chapaPaymentReference}`;
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header Info */}
      <div className="border-b border-slate-200 dark:border-zinc-800/80 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">Subscription & Licensing</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">View and manage the active billing configuration for your corporate workspace.</p>
        </div>
      </div>

      {/* Unpaid Warning Banner */}
      {hasUnpaidRenewal && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">Subscription Renewal Pending</h4>
            <p className="text-xs text-amber-600 dark:text-amber-500">Your subscription is expired or expiring soon. Complete the pending invoice payment to retain write permissions.</p>
          </div>
          <a
            href={renewalUrl}
            target="_self"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition whitespace-nowrap"
          >
            Pay Renewal Invoice
          </a>
        </div>
      )}

      {/* Active Plan Detail Card */}
      <div className="p-6 md:p-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.02] shadow-md grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="space-y-2">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold text-[8px] tracking-wider uppercase">
            Active Package
          </span>
          <h3 className="text-2xl font-black text-slate-800 dark:text-zinc-50 uppercase font-outfit">
            {planKey} TIER
          </h3>
          <p className="text-xs text-slate-400">Enforced according to your workspace registration limits.</p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Monthly Subscription Fee</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-800 dark:text-zinc-50 font-outfit">
              {planMeta.monthlyPriceEtb.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-semibold font-mono">ETB / month</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
              <span>Seat Occupancy</span>
              <span>{stats.totalEmployees} / {seatLimit} Seats</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((stats.totalEmployees / seatLimit) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          <p className="text-[10px] text-emerald-500 font-bold">✓ Seat cap from your tenant record: {seatLimit} employees</p>
        </div>
      </div>

      {/* Plan Features */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-zinc-800/80 shadow-sm space-y-4">
        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Included in {planKey}</h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-zinc-300">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Invoice History Receipts */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 font-outfit">Recent Invoices</h3>
        <div className="rounded-2xl bg-white dark:bg-[#0c1424] overflow-hidden shadow-sm border border-slate-200 dark:border-zinc-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-500 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800/80">
                  <th className="py-4 px-5">Invoice Reference</th>
                  <th className="py-4 px-5">Billing Period</th>
                  <th className="py-4 px-5">Amount</th>
                  <th className="py-4 px-5">Method</th>
                  <th className="py-4 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40 text-xs text-slate-700 dark:text-zinc-200">
                {invoices.length > 0 ? (
                  invoices.map((inv) => {
                    let checkoutUrl = "#";
                    try {
                      const parsed = JSON.parse(inv.chapaPaymentReference || "{}");
                      checkoutUrl = parsed.checkoutUrl || "#";
                    } catch (e) {
                      checkoutUrl = `${window.location.origin}/dashboard/billing?payment_success=true&ref=${inv.chapaPaymentReference}`;
                    }

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/10">
                        <td className="py-4 px-5 font-mono text-[10px] font-bold text-slate-900 dark:text-zinc-50">
                          #INV-{companySlug}-{inv.id.substring(0, 4).toUpperCase()}
                        </td>
                        <td className="py-4 px-5 font-medium">
                          {new Date(inv.billingPeriodStart).toLocaleDateString("en-US", { month: 'short', day: '2-digit', year: 'numeric' })} - {new Date(inv.billingPeriodEnd).toLocaleDateString("en-US", { month: 'short', day: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="py-4 px-5 font-mono font-semibold">
                          {Number(inv.amount).toLocaleString()} ETB
                        </td>
                        <td className="py-4 px-5 font-medium">
                          {inv.isPaid ? "Chapa Gateway (Settled)" : (
                            <a
                              href={checkoutUrl}
                              target="_self"
                              className="text-amber-500 hover:underline font-bold"
                            >
                              Pay Pending Invoice
                            </a>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            inv.isPaid 
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse"
                          }`}>
                            {inv.isPaid ? "PAID" : "UNPAID"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/10">
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold italic">
                      No active invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
