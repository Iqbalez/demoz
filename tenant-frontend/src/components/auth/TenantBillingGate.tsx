"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getBillingGateState, isBillingRoute } from "@/lib/subscription-billing";

/** Redirects tenant users with billing issues to /billing-locked */
export function TenantBillingGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "SUPER_ADMIN") return;

    const billing = getBillingGateState(user);
    const onBillingPage = pathname === "/billing-locked" || isBillingRoute(pathname);

    if (billing.isSuspended && pathname !== "/billing-locked") {
      router.replace("/billing-locked?reason=suspended");
      return;
    }

    if (billing.isPastDue && !onBillingPage) {
      router.replace("/billing-locked?reason=past_due");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-muted)]">
        Loading workspace…
      </div>
    );
  }

  return <>{children}</>;
}
