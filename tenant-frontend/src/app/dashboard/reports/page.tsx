'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

interface PayrollRun {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  grossTotal: number;
  netTotal: number;
  taxTotal: number;
  sampleLineItemId: string | null;
}

export default function ReportsPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<PayrollRun[]>('/payroll/reports/runs');
        setRuns(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const downloadReport = (runId: string, type: 'erca' | 'psssa') => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('demoz_session='))
      ?.split('=')[1];
      
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/payroll/reports/${type}/${runId}`;
    
    // Create an invisible iframe/form or just open in new tab (since we rely on HttpOnly cookie mostly, 
    // but if we need a token we pass it. Assuming cookie is sent by browser)
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-r-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Reports & Analytics</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Export statutory compliance sheets and payroll summaries.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      {runs.length === 0 && !error ? (
        <div className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl p-12 text-center">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">No Reports Available</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)] max-w-md mx-auto">
            You need to complete at least one payroll run before statutory reports can be generated.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {runs.map(run => {
            const periodStr = new Date(run.periodStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            
            return (
              <div key={run.id} className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
                
                {/* Summary Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">{periodStr} Payroll</h2>
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200 uppercase tracking-wider">
                      {run.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[var(--bg-subtle)] p-4 rounded-xl border border-[var(--border)]">
                      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase">Gross Payroll</p>
                      <p className="text-lg font-bold text-[var(--text-primary)] mt-1">{run.grossTotal.toLocaleString()} ETB</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <p className="text-xs font-semibold text-red-700 uppercase">Income Tax</p>
                      <p className="text-lg font-bold text-red-800 mt-1">{run.taxTotal.toLocaleString()} ETB</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <p className="text-xs font-semibold text-green-700 uppercase">Net Payout</p>
                      <p className="text-lg font-bold text-green-800 mt-1">{run.netTotal.toLocaleString()} ETB</p>
                    </div>
                  </div>
                </div>

                {/* Export Actions */}
                <div className="w-full md:w-64 shrink-0 flex flex-col gap-3 justify-center pl-6 border-l border-[var(--border)]">
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Downloads</h3>
                  
                  <button 
                    onClick={() => downloadReport(run.id, 'erca')}
                    className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-[var(--border)] hover:bg-[var(--bg-subtle)] hover:border-[var(--brand-primary)] transition-colors rounded-lg text-sm font-medium text-[var(--text-primary)] text-left"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    ERCA Schedule A (Tax)
                  </button>

                  <button 
                    onClick={() => downloadReport(run.id, 'psssa')}
                    className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-[var(--border)] hover:bg-[var(--bg-subtle)] hover:border-[var(--brand-primary)] transition-colors rounded-lg text-sm font-medium text-[var(--text-primary)] text-left"
                  >
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    POESSA (Pension 18%)
                  </button>

                  {run.sampleLineItemId && (
                    <a 
                      href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/payroll/reports/payslip/${run.sampleLineItemId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 w-full px-4 py-2 bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition-colors rounded-lg text-sm font-semibold text-left"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Sample Payslip
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
