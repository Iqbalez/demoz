'use client';

import React, { useState } from 'react';
import { useSettings } from '@/context/SettingsContext';

export default function BillingSubscriptionPage() {
  const { loading } = useSettings();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelText, setCancelText] = useState('');

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[var(--bg-subtle)] rounded-lg"></div>
        <div className="h-64 bg-[var(--bg-subtle)] rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Billing & Subscription</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage your Demoz plan, payment history, and usage.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-[var(--brand-primary)] bg-white shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 bg-[var(--brand-primary)] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              ACTIVE
            </div>
            <div className="p-6 border-b border-[var(--border)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Enterprise Plan</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">Full access to HR, Payroll, and Performance modules.</p>
              
              <div className="mt-6 pt-6 border-t border-[var(--border)] grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Billing Cycle</p>
                  <p className="text-sm text-[var(--text-primary)]">Annual</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Next Invoice</p>
                  <p className="text-sm text-[var(--text-primary)]">Jan 1, 2027</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-[var(--bg-subtle)]/50 text-sm flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Need to change your plan?</span>
              <button className="text-[var(--brand-primary)] font-semibold hover:underline">Contact Sales</button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Recent Invoices</h3>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-white border-b border-[var(--border)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-[var(--text-primary)]">Jan 1, 2026</td>
                    <td className="px-5 py-3 text-[var(--text-primary)]">12,500 ETB</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Paid
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button className="text-[var(--brand-primary)] hover:underline text-xs font-medium">Download PDF</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Usage Stats</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text-secondary)] font-medium">Active Employees</span>
                  <span className="text-[var(--text-primary)] font-bold">145 / 250</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-[var(--brand-primary)] h-2 rounded-full" style={{ width: '58%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text-secondary)] font-medium">Storage Used</span>
                  <span className="text-[var(--text-primary)] font-bold">12 GB / 50 GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '24%' }}></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <h4 className="font-semibold text-blue-900 mb-2">Payment Methods</h4>
            <p className="text-sm text-blue-800 mb-4">We currently accept wire transfers and direct deposits for Enterprise plans.</p>
            <div className="bg-white rounded-lg p-3 border border-blue-200 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Bank</span>
                <span className="font-medium">Commercial Bank of Ethiopia</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account Name</span>
                <span className="font-medium">Demoz Technologies PLC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account No</span>
                <span className="font-medium">1000345678901</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Comparison Table */}
      <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden mt-8">
        <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
          <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Plan Comparison</h3>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white border-b border-[var(--border)] text-[var(--text-secondary)]">
              <tr>
                <th className="px-6 py-4 font-medium w-1/3">Features</th>
                <th className="px-6 py-4 font-bold text-[var(--text-primary)] w-1/3 border-x border-[var(--border)]">
                  Pro Plan
                  <div className="text-xs font-normal text-[var(--text-muted)] mt-1">9,500 ETB / year</div>
                </th>
                <th className="px-6 py-4 font-bold text-[var(--brand-primary)] w-1/3">
                  Enterprise Plan
                  <div className="text-xs font-normal text-[var(--text-muted)] mt-1">12,500 ETB / year</div>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--brand-primary)] text-white uppercase">Current</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              <tr>
                <td className="px-6 py-4 text-[var(--text-secondary)]">Max Employees</td>
                <td className="px-6 py-4 border-x border-[var(--border)] font-medium">50</td>
                <td className="px-6 py-4 font-medium text-[var(--text-primary)]">Unlimited</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-[var(--text-secondary)]">Direct Chapa Payouts</td>
                <td className="px-6 py-4 border-x border-[var(--border)] text-gray-300">—</td>
                <td className="px-6 py-4 text-green-500">✓</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-[var(--text-secondary)]">Custom Roles (RBAC)</td>
                <td className="px-6 py-4 border-x border-[var(--border)] text-gray-300">—</td>
                <td className="px-6 py-4 text-green-500">✓</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-[var(--text-secondary)]">Support SLA</td>
                <td className="px-6 py-4 border-x border-[var(--border)]">Email Only</td>
                <td className="px-6 py-4 font-medium text-[var(--text-primary)]">24/7 Phone + Email</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-200 bg-white shadow-sm overflow-hidden mt-8">
        <div className="p-5 border-b border-red-200 bg-red-50">
          <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider">Danger Zone</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-[var(--text-primary)]">Export All Company Data</h4>
              <p className="text-sm text-[var(--text-muted)] mt-1">Download a full JSON/CSV export of all employee profiles, payroll runs, and settings.</p>
            </div>
            <button className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Data
            </button>
          </div>
          
          <div className="pt-6 border-t border-red-100 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-red-600">Cancel Subscription</h4>
              <p className="text-sm text-red-500 mt-1">Once you cancel your subscription, all employee access will be revoked immediately. Data will be retained for 30 days.</p>
            </div>
            <button 
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 shadow-sm whitespace-nowrap ml-4"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-red-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-red-700">Cancel Subscription</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-red-500 hover:text-red-700">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 text-red-800 text-sm p-4 rounded-lg border border-red-100">
                <p className="font-bold mb-2">Warning: This action is permanent.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>All employee mobile app access will be immediately revoked.</li>
                  <li>HR and Payroll admins will be locked out.</li>
                  <li>Company data will be permanently deleted after 30 days.</li>
                </ul>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Please type <strong>CANCEL</strong> to confirm:
                </label>
                <input 
                  type="text" 
                  value={cancelText}
                  onChange={(e) => setCancelText(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                  placeholder="CANCEL"
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-[var(--border)] flex justify-end gap-3">
              <button 
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelText('');
                }} 
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Keep Subscription
              </button>
              <button 
                disabled={cancelText !== 'CANCEL'}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
