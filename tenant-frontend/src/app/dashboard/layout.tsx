"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ToastProvider } from "../../components/ui/toast";
import { DashboardProvider, useDashboard } from "../../context/DashboardContext";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { DemozLogo } from "../../components/brand/DemozLogo";

const NAV_GROUPS = [
  { path: "/dashboard", label: "Home", icon: "home" },
  {
    label: "Employees",
    icon: "users",
    subItems: [
      { path: "/dashboard/employees/onboarding", label: "Onboarding" },
      { path: "/dashboard/employees", label: "Directory" },
      { path: "/dashboard/employees/exits", label: "Exits" },
    ],
  },
  {
    label: "Payroll",
    icon: "pay",
    subItems: [
      { path: "/dashboard/payroll", label: "Runs & Processing" },
    ],
  },
  {
    label: "Leave",
    icon: "leave",
    subItems: [
      { path: "/dashboard/leave/requests", label: "Leave Requests" },
      { path: "/dashboard/leave", label: "Leave Overview" },
    ],
  },
  { path: "/dashboard/reports", label: "Reports", icon: "chart" },
  {
    label: "Time & Attendance",
    icon: "clock",
    subItems: [
      { path: "/dashboard/attendance", label: "Analytics" },
      { path: "/dashboard/attendance/logs", label: "Raw Logs" },
    ],
  },
  { path: "/dashboard/org-structure", label: "Org. structure", icon: "users" },
  { path: "/dashboard/billing", label: "Billing", icon: "card" },
  {
    label: "Settings",
    icon: "settings",
    subItems: [
      { path: "/dashboard/settings", label: "Organization" },
      { path: "/dashboard/settings/team", label: "Team Management" },
      { path: "/dashboard/settings/compliance", label: "Compliance" },
    ],
  },
] as const;

function NavIcon({ type }: { type: string }) {
  const cls = "w-[18px] h-[18px] shrink-0";
  switch (type) {
    case "home":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "users":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "clock":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "leave":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "pay":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "chart":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "card":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case "settings":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return null;
  }
}

function SidebarNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() => {
    // Auto-expand groups that contain the current path
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach(g => {
      if ('subItems' in g) {
        if (g.subItems.some(sub => pathname === sub.path || pathname.startsWith(sub.path + '/'))) {
          initial[g.label] = true;
        }
      }
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <nav className="flex-1 p-3 space-y-1">
      {NAV_GROUPS.map((group) => {
        const isGroupExpanded = expanded[group.label];
        const isGroupActive = 'path' in group ? pathname === group.path : ('subItems' in group ? group.subItems.some(s => pathname === s.path || pathname.startsWith(s.path + '/')) : false);

        if (!('subItems' in group)) {
          return (
            <Link
              key={group.label}
              href={group.path as string}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isGroupActive
                  ? "bg-[var(--brand-primary-muted)] text-[var(--brand-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
              }`}
            >
              <NavIcon type={group.icon!} />
              {group.label}
            </Link>
          );
        }

        return (
          <div key={group.label} className="flex flex-col">
            <button
              onClick={() => toggleGroup(group.label)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left ${
                isGroupActive
                  ? "text-[var(--brand-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <NavIcon type={group.icon!} />
                {group.label}
              </div>
              <svg 
                className={`w-4 h-4 transition-transform ${isGroupExpanded ? 'rotate-90' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {isGroupExpanded && (
              <div className="ml-9 mt-1 space-y-1 flex flex-col relative before:absolute before:left-[-11px] before:top-0 before:bottom-2 before:w-[1px] before:bg-[var(--border)]">
                {group.subItems.map(sub => {
                  const isSubActive = pathname === sub.path;
                  return (
                    <Link
                      key={sub.label}
                      href={sub.path}
                      className={`relative px-3 py-1.5 text-[13px] font-medium transition-colors rounded-md ${
                        isSubActive
                          ? "text-[var(--brand-primary)] bg-[var(--brand-primary-muted)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                      } before:absolute before:left-[-11px] before:top-1/2 before:w-2 before:h-[1px] before:bg-[var(--border)]`}
                    >
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { backendStatus, stats } = useDashboard();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user.role === "SUPER_ADMIN") {
      router.replace("/admin-portal");
    }
  }, [user, authLoading, router, pathname]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const displayName = user?.email?.split("@")[0] ?? "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const roleLabel =
    user?.role === "OWNER" ? "Owner" : user?.role === "HR" ? "HR Manager" : user?.role ?? "";

  if (authLoading || !user || user.role === "SUPER_ADMIN") {
    return (
      <div className="workspace-theme flex min-h-screen items-center justify-center bg-white text-sm text-[var(--text-muted)]">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="workspace-theme flex min-h-screen flex-col bg-white text-[var(--text-primary)]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-[var(--border)] bg-white px-4 lg:px-6">
        <div className="flex items-center gap-4 min-w-0">
          <DemozLogo href="/dashboard" size={32} showWordmark className="shrink-0" />
          <span className="hidden sm:inline h-5 w-px bg-[var(--border)]" />
          <span className="hidden sm:block truncate text-sm font-semibold text-[var(--text-primary)] max-w-[200px]">
            {stats.companyName || user.companyName || "Workspace"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="hidden md:flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)]"
            title={backendStatus === "CONNECTED" ? "Connected to server" : "Offline simulation"}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                backendStatus === "CONNECTED" ? "bg-[var(--success)]" : "bg-amber-500"
              }`}
            />
            {backendStatus === "CONNECTED" ? "Live" : "Offline"}
          </div>

          <div className="flex items-center gap-2.5 pl-2 border-l border-[var(--border)]">
            <div className="hidden sm:flex flex-col items-center justify-center text-center min-w-[88px]">
              <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight truncate max-w-[120px] w-full">
                {displayName}
              </p>
              {roleLabel && (
                <span className="mt-1 inline-block rounded-full bg-[var(--brand-primary-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-primary)]">
                  {roleLabel}
                </span>
              )}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-bold text-white shrink-0">
              {initials}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors px-2"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex w-56 lg:w-60 flex-col border-r border-[var(--border)] bg-[var(--bg-subtle)] shrink-0 overflow-y-auto">
          <SidebarNav />

          <div className="p-4 m-3 rounded-xl border border-[var(--border)] bg-white text-xs text-[var(--text-muted)] space-y-1.5">
            <p className="font-semibold text-[var(--text-secondary)] truncate" title={stats.companyName}>
              {stats.companyName}
            </p>
            <p>
              Plan: <span className="font-medium text-[var(--brand-primary)]">{stats.planTier}</span>
            </p>
            {user.workspace && (
              <p>
                Fayda on file:{" "}
                <span className="font-medium text-[var(--text-primary)]">
                  {user.workspace.faydaOnFile}/{user.workspace.employeeCount}
                </span>
              </p>
            )}
          </div>
        </aside>

        {/* Mobile bottom nav — show top-level items only */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 flex border-t border-[var(--border)] bg-white px-1 py-1 safe-area-pb">
          {NAV_GROUPS.filter((g): g is typeof g & { path: string } => 'path' in g).slice(0, 5).map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.label}
                href={item.path}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium rounded-lg ${
                  isActive ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]"
                }`}
              >
                <NavIcon type={item.icon!} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-white p-5 lg:p-8 pb-20 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <DashboardProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </DashboardProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
