"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ToastProvider } from "../../components/ui/toast";
import { DashboardProvider, useDashboard } from "../../context/DashboardContext";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { DemozLogo } from "../../components/brand/DemozLogo";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Home", icon: "home" },
  { path: "/dashboard/employees", label: "Employees", icon: "users" },
  { path: "/dashboard/attendance", label: "Attendance", icon: "clock" },
  { path: "/dashboard/leave", label: "Leave", icon: "leave" },
  { path: "/dashboard/payroll", label: "Payroll", icon: "pay" },
  { path: "/dashboard/reports", label: "Reports", icon: "chart" },
  { path: "/dashboard/billing", label: "Billing", icon: "card" },
] as const;

function NavIcon({ type }: { type: (typeof NAV_ITEMS)[number]["icon"] }) {
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
    default:
      return null;
  }
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
          <nav className="flex-1 p-3 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-[var(--brand-primary)] shadow-sm border border-[var(--border)]"
                      : "text-[var(--text-secondary)] hover:bg-white/80 hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="flex w-[18px] items-center justify-center shrink-0" aria-hidden>
                    <NavIcon type={item.icon} />
                  </span>
                  <span className="leading-none">{item.label}</span>
                </Link>
              );
            })}
          </nav>

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

        {/* Mobile nav */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 flex border-t border-[var(--border)] bg-white px-1 py-1 safe-area-pb">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium rounded-lg ${
                  isActive ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]"
                }`}
              >
                <NavIcon type={item.icon} />
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
