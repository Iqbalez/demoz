'use client';

import { RequireRole } from '@/components/auth/RequireRole';

export default function ComplianceSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--m-cream)]">Compliance & Payroll</h1>
        <p className="text-sm text-[var(--m-muted)] mt-1">Configure standard deductions and regional tax rates.</p>
      </div>

      <form className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--m-cream)]">Employee Pension Deduction (%)</label>
            <input 
              type="number" 
              defaultValue={7}
              step="0.1"
              className="w-full rounded-md border border-[var(--m-border)] bg-[var(--m-bg)] px-3 py-2 text-sm text-[var(--m-cream)] focus:border-[var(--m-primary)] focus:outline-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--m-cream)]">Employer Pension Contribution (%)</label>
            <input 
              type="number" 
              defaultValue={11}
              step="0.1"
              className="w-full rounded-md border border-[var(--m-border)] bg-[var(--m-bg)] px-3 py-2 text-sm text-[var(--m-cream)] focus:border-[var(--m-primary)] focus:outline-none" 
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--m-cream)]">Default Currency</label>
          <select className="w-full rounded-md border border-[var(--m-border)] bg-[var(--m-bg)] px-3 py-2 text-sm text-[var(--m-cream)] focus:border-[var(--m-primary)] focus:outline-none">
            <option value="ETB">Ethiopian Birr (ETB)</option>
            <option value="USD">US Dollar (USD)</option>
          </select>
        </div>

        <RequireRole allowedRoles={['SUPER_ADMIN', 'OWNER']}>
          <div className="pt-6">
            <button type="submit" className="px-4 py-2 bg-[var(--m-primary)] text-white rounded-md text-sm font-medium hover:bg-indigo-600 transition-colors">
              Save Compliance Settings
            </button>
          </div>
        </RequireRole>
      </form>
    </div>
  );
}
