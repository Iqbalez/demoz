"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getBillingGateState } from "@/lib/subscription-billing";

function BillingLockedContent() {
  const params = useSearchParams();
  const reason = params.get("reason");
  const { user, logout } = useAuth();

  const billing = getBillingGateState(user);
  const isSuspended = reason === "suspended" || billing.isSuspended;
  const isPastDue = reason === "past_due" || billing.isPastDue;

  return (
    <div className="workspace-theme flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div className="max-w-md space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
          {isSuspended ? "Workspace suspended" : "Payment required"}
        </p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {isSuspended
            ? "Your company workspace is paused"
            : "Your subscription needs attention"}
        </h1>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          {isSuspended
            ? "Payroll and HR actions are blocked until your account is reactivated. Renew your subscription to restore access."
            : "You can review billing and export data, but creating or changing records is locked until payment is cleared."}
        </p>
        {isPastDue && !isSuspended && billing.graceDaysRemaining != null && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Grace period</p>
            <p className="text-sm font-bold text-amber-900 mt-1">
              {billing.graceDaysRemaining > 0
                ? `${billing.graceDaysRemaining} day${billing.graceDaysRemaining === 1 ? "" : "s"} until suspension`
                : "Suspension imminent — pay now"}
            </p>
            {billing.gracePeriodEndsAt && (
              <p className="text-xs text-amber-700 mt-1">
                Deadline: {billing.gracePeriodEndsAt.toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
            )}
          </div>
        )}
        {!isSuspended && (
          <Link href="/dashboard/settings/billing" className="btn-primary inline-flex px-5 py-2.5 rounded-xl text-sm font-semibold">
            {isPastDue ? "Pay Now" : "Go to billing"}
          </Link>
        )}
        {isSuspended && (
          <Link href="/dashboard/settings/billing" className="btn-primary inline-flex px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700">
            Renew Subscription
          </Link>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <a
            href="mailto:iqbalezedin@gmail.com?subject=Demoz%20billing%20support"
            className="text-sm text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]"
          >
            Email support
          </a>
          <button
            type="button"
            onClick={() => logout().then(() => (window.location.href = "/login"))}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BillingLockedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] text-sm text-[var(--text-muted)]">
          Loading…
        </div>
      }
    >
      <BillingLockedContent />
    </Suspense>
  );
}
