export interface PayrollScheduleConfig {
  cutoffDay?: number;
  payDate?: number;
  payFrequency?: string;
}

/** Derive the current payroll period from tenant schedule settings. */
export function getCurrentPayPeriod(config: PayrollScheduleConfig = {}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const cutoff = Math.min(config.cutoffDay ?? 25, lastDayOfMonth);

  const periodStart = new Date(year, month, 1);
  const periodEnd = new Date(year, month, cutoff);
  const payDay = Math.min(config.payDate ?? 28, lastDayOfMonth);
  const payDate = new Date(year, month, payDay);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  return {
    periodStart: fmt(periodStart),
    periodEnd: fmt(periodEnd),
    payDate: fmt(payDate),
    payFrequency: config.payFrequency ?? 'MONTHLY',
    label: `${periodStart.toLocaleString('en-US', { month: 'short' })} 1 – ${cutoff}, ${year}`,
  };
}
