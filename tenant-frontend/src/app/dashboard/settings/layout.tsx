'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';

import { SettingsProvider } from '@/context/SettingsContext';

const navItems = [
  { name: 'Company Profile', href: '/dashboard/settings/company', permission: 'manage_settings' },
  { name: 'Roles & Permissions', href: '/dashboard/settings/roles', permission: 'manage_roles' },
  { name: 'Team Management', href: '/dashboard/settings/team', permission: 'manage_roles' },
  { name: 'Departments & Branches', href: '/dashboard/settings/departments', permission: 'manage_settings' },
  { name: 'Payroll Configuration', href: '/dashboard/settings/payroll', permission: 'manage_settings' },
  { name: 'Leave Policies', href: '/dashboard/settings/leave', permission: 'manage_settings' },
  { name: 'Attendance Configuration', href: '/dashboard/settings/attendance', permission: 'manage_settings' },
  { name: 'Notifications', href: '/dashboard/settings/notifications', permission: 'manage_settings' },
  { name: 'Integrations', href: '/dashboard/settings/integrations', permission: 'manage_settings' },
  { name: 'Security', href: '/dashboard/settings/security', permission: 'manage_settings' },
  { name: 'Audit Log', href: '/dashboard/settings/audit-log', permission: 'view_audit_log' },
  { name: 'Billing & Subscription', href: '/dashboard/settings/billing', permission: 'manage_billing' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hasPermission } = usePermission();

  return (
    <SettingsProvider>
      <div className="flex h-full w-full flex-col lg:flex-row gap-6 p-6">
        <aside className="w-full lg:w-64 flex-shrink-0">
          <nav className="flex flex-col gap-1.5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] px-2">
              Settings Menu
            </h2>
            {navItems.map((item) => {
              // The isActive check will be a 'startsWith' or exact match
              const isActive = pathname === item.href;
              
              const linkContent = (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[var(--brand-primary)] text-white shadow-md'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.name}
                </Link>
              );

              if (item.permission && !hasPermission(item.permission)) {
                return null;
              }

              return linkContent;
            })}
          </nav>
        </aside>

        <main className="flex-1 rounded-2xl border border-[var(--border)] bg-white p-6 md:p-8 shadow-sm overflow-y-auto">
          {children}
        </main>
      </div>
    </SettingsProvider>
  );
}
