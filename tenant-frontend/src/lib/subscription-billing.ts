import type { TenantStatus, UserPayload } from '@/context/AuthContext';

/** Matches tenant-backend subscription.service grace period (7 days after expiry). */
export const BILLING_GRACE_PERIOD_DAYS = 7;

export interface BillingGateState {
  status: TenantStatus | null;
  isPastDue: boolean;
  isSuspended: boolean;
  isBillingBlocked: boolean;
  gracePeriodEndsAt: Date | null;
  graceDaysRemaining: number | null;
  graceHoursRemaining: number | null;
}

export function resolveSubscriptionStatus(user: UserPayload | null): TenantStatus | null {
  if (!user) return null;
  return user.subscription_status ?? user.workspaces?.[0]?.status ?? null;
}

export function getBillingGateState(user: UserPayload | null): BillingGateState {
  const status = resolveSubscriptionStatus(user);
  const isPastDue = status === 'PAST_DUE';
  const isSuspended = status === 'SUSPENDED';
  const isBillingBlocked = isPastDue || isSuspended;

  const expiresAt = user?.subscription_expires_at
    ? new Date(user.subscription_expires_at)
    : null;

  let gracePeriodEndsAt: Date | null = null;
  let graceDaysRemaining: number | null = null;
  let graceHoursRemaining: number | null = null;

  if (isPastDue && expiresAt && !Number.isNaN(expiresAt.getTime())) {
    gracePeriodEndsAt = new Date(
      expiresAt.getTime() + BILLING_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );
    const msRemaining = gracePeriodEndsAt.getTime() - Date.now();
    if (msRemaining > 0) {
      graceDaysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
      graceHoursRemaining = Math.ceil(msRemaining / (60 * 60 * 1000));
    } else {
      graceDaysRemaining = 0;
      graceHoursRemaining = 0;
    }
  }

  return {
    status,
    isPastDue,
    isSuspended,
    isBillingBlocked,
    gracePeriodEndsAt,
    graceDaysRemaining,
    graceHoursRemaining,
  };
}

export function isBillingRoute(pathname: string): boolean {
  return (
    pathname === '/dashboard/billing' ||
    pathname === '/dashboard/settings/billing' ||
    pathname.startsWith('/dashboard/billing/') ||
    pathname.startsWith('/dashboard/settings/billing/')
  );
}
