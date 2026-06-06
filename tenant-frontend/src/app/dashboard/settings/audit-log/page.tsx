'use client';

import { useSettings } from '@/context/SettingsContext';

export default function AuditLogPage() {
  const { loading } = useSettings();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[var(--bg-subtle)] rounded-lg"></div>
        <div className="h-64 bg-[var(--bg-subtle)] rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Audit Log</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Review system activity, role changes, and administrative actions.</p>
      </div>
      
      <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-3">
          <svg className="w-12 h-12 mx-auto text-[var(--text-muted)] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm font-medium text-[var(--text-secondary)]">This module is under construction</p>
          <p className="text-xs text-[var(--text-muted)]">Check back in the upcoming phase.</p>
        </div>
      </div>
    </div>
  );
}
