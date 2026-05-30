"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ToastProvider } from "../../components/ui/toast";
import { DashboardProvider, useDashboard } from "../../context/DashboardContext";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { DemozLogo } from "../../components/brand/DemozLogo";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Home", icon: "⌂" },
  { path: "/dashboard/employees", label: "Employees", icon: "👥" },
  { path: "/dashboard/attendance", label: "Attendance", icon: "📋" },
  { path: "/dashboard/leave", label: "Leave", icon: "🌴" },
  { path: "/dashboard/payroll", label: "Payroll", icon: "💰" },
  { path: "/dashboard/reports", label: "Reports", icon: "📊" },
  { path: "/dashboard/billing", label: "Billing", icon: "💳" },
];

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
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight truncate max-w-[140px]">
                {displayName}
              </p>
              {roleLabel && (
                <span className="inline-block mt-0.5 rounded-full bg-[var(--brand-primary-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-primary)]">
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
                  <span className="text-base opacity-80" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
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
                <span className="text-sm">{item.icon}</span>
                {item.label}
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
