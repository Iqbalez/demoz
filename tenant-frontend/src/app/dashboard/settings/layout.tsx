'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RequireRole } from '@/components/auth/RequireRole';

const navItems = [
  { name: 'Organization', href: '/dashboard/settings' },
  { name: 'Team & Roles', href: '/dashboard/settings/team' },
  { name: 'Compliance', href: '/dashboard/settings/compliance' },
  { name: 'Audit Logs', href: '/dashboard/settings/audit', roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col lg:flex-row gap-6 p-6">
      <aside className="w-full lg:w-64 flex-shrink-0">
        <nav className="flex flex-col gap-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--m-muted)]">
            Settings Menu
          </h2>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            const linkContent = (
              <Link
                key={item.name}
                href={item.href}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--m-card)] text-[var(--m-cream)] border border-[var(--m-border)]'
                    : 'text-[var(--m-muted)] hover:bg-[var(--m-card)]/50 hover:text-[var(--m-cream)]'
                }`}
              >
                {item.name}
              </Link>
            );

            if (item.roles) {
              return (
                <RequireRole key={item.name} allowedRoles={item.roles}>
                  {linkContent}
                </RequireRole>
              );
            }

            return linkContent;
          })}
        </nav>
      </aside>

      <main className="flex-1 rounded-xl border border-[var(--m-border)] bg-[var(--m-card)] p-6 shadow-sm">
        {children}
      </main>
    </div>
  );
}
