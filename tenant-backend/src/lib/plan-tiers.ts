/** Single source of truth for subscription tiers (DB planTier field). */
export const PLAN_TIERS = {
  FREE: { label: 'Free', maxEmployees: 10, monthlyPriceEtb: 0 },
  BASIC: { label: 'Basic', maxEmployees: 10, monthlyPriceEtb: 3000 },
  GROWTH: { label: 'Growth', maxEmployees: 50, monthlyPriceEtb: 5000 },
  ENTERPRISE: { label: 'Enterprise', maxEmployees: 1000, monthlyPriceEtb: 10000 },
} as const;

export type PlanTierKey = keyof typeof PLAN_TIERS;

export function normalizePlanTier(tier: string | null | undefined): PlanTierKey {
  const key = (tier || 'FREE').toUpperCase() as PlanTierKey;
  return key in PLAN_TIERS ? key : 'FREE';
}

export function getPlanMeta(tier: string | null | undefined) {
  return PLAN_TIERS[normalizePlanTier(tier)];
}
