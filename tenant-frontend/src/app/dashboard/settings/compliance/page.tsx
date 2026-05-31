'use client';

import React from 'react';

export default function ComplianceSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Compliance &amp; Payroll</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Ethiopian labor law statutory deduction rates (read-only).</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Read-only Ethiopian statutory rates */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-6 space-y-5">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Ethiopian Labor Law — Statutory Rates
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">Employee Pension Deduction</label>
              <div className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)]">
                7.0%
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Per Proclamation No. 715/2011 — Private Organizations Employees&apos; Pension.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">Employer Pension Contribution</label>
              <div className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)]">
                11.0%
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Employer share per POESSA (Private Organizations Employees Social Security Agency).
              </p>
            </div>
          </div>
        </div>

        {/* Income Tax Brackets */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            ERCA Income Tax Brackets (Proclamation 979/2016)
          </h2>
          <div className="rounded-lg border border-[var(--border)] overflow-hidden">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-white">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Income Range (ETB)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Tax Rate</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Deduction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-white">
                {[
                  { range: "0 — 600", rate: "0%", deduction: "0" },
                  { range: "601 — 1,650", rate: "10%", deduction: "60" },
                  { range: "1,651 — 3,200", rate: "15%", deduction: "142.50" },
                  { range: "3,201 — 5,250", rate: "20%", deduction: "302.50" },
                  { range: "5,251 — 7,800", rate: "25%", deduction: "565" },
                  { range: "7,801 — 10,900", rate: "30%", deduction: "955" },
                  { range: "Over 10,900", rate: "35%", deduction: "1,500" },
                ].map(row => (
                  <tr key={row.range}>
                    <td className="px-4 py-2 text-sm text-[var(--text-primary)]">{row.range}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">{row.rate}</td>
                    <td className="px-4 py-2 text-sm text-[var(--text-secondary)]">{row.deduction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            These rates are applied automatically by the Demoz payroll engine during each payroll run.
          </p>
        </div>

        {/* Currency */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-6">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Default Currency</h2>
          <div className="w-full max-w-xs rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)]">
            🇪🇹 Ethiopian Birr (ETB)
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
            All payroll calculations are performed in ETB. Multi-currency support is on the product roadmap.
          </p>
        </div>
      </div>
    </div>
  );
}
