const fs = require('fs');
const path = require('path');

const pages = [
  { path: 'company', title: 'Company Profile', desc: 'Manage your organization\'s core details, logo, and registration information.' },
  { path: 'roles', title: 'Roles & Permissions', desc: 'Configure custom roles and manage access controls.' },
  { path: 'payroll', title: 'Payroll Configuration', desc: 'Set up tax brackets, pension rates, allowances, and payslip templates.' },
  { path: 'leave', title: 'Leave Policies', desc: 'Configure leave types, accrual rules, and public holidays.' },
  { path: 'attendance', title: 'Attendance Configuration', desc: 'Manage work hours, shifts, overtime rules, and tracking methods.' },
  { path: 'notifications', title: 'Notifications', desc: 'Configure system-wide alerts and personal notification preferences.' },
  { path: 'integrations', title: 'Integrations', desc: 'Connect payment gateways, bank exports, and external systems.' },
  { path: 'security', title: 'Security', desc: 'Enforce password policies, 2FA, and session management.' },
  { path: 'audit-log', title: 'Audit Log', desc: 'Review system activity, role changes, and administrative actions.' },
  { path: 'billing', title: 'Billing & Subscription', desc: 'Manage your Demoz plan, payment history, and usage.' }
];

const baseDir = 'tenant-frontend/src/app/dashboard/settings';

pages.forEach(p => {
  const dir = path.join(baseDir, p.path);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const content = `'use client';

import { useSettings } from '@/context/SettingsContext';

export default function ${p.title.replace(/[^a-zA-Z]/g, '')}Page() {
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
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">${p.title}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">${p.desc}</p>
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
`;
  
  fs.writeFileSync(path.join(dir, 'page.tsx'), content);
});
console.log('Pages created successfully.');
