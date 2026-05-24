"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ToastProvider } from "../../components/ui/toast";
import { DashboardProvider, useDashboard } from "../../context/DashboardContext";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { backendStatus, isThemeDark, setIsThemeDark, stats } = useDashboard();

  useEffect(() => {
    if (!isThemeDark) {
      setIsThemeDark(true); // Force dark mode for the techno-futurist vibe
    }
  }, [isThemeDark, setIsThemeDark]);

  const handleLogout = () => router.push("/");

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors">
      
      {/* Topbar */}
      <header className="topbar justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-gradient-accent tracking-tighter select-none uppercase">
            {stats.companyName}
          </span>
          <span className="accent-badge">Tenant Node</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] text-[10px] font-bold text-[var(--text-secondary)] select-none">
            <span className={`accent-dot ${backendStatus === "CONNECTED" ? "" : "bg-purple-500 shadow-purple-500"}`}></span>
            {backendStatus === "CONNECTED" ? "SRE: CONNECTED" : "SRE: SIMULATION"}
          </div>

          <button onClick={handleLogout} className="btn-ghost text-xs py-1.5 px-3">
            Terminate Session
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 p-6 space-y-8 flex flex-col h-full border-r border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="space-y-3 flex-1">
            <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-widest block px-3">Menu</span>
            
            <nav className="space-y-1">
              {[
                { path: "/dashboard", label: "Overview" },
                { path: "/dashboard/employees", label: "Directory" },
                { path: "/dashboard/attendance", label: "Attendance" },
                { path: "/dashboard/leave", label: "Leave Requests" },
                { path: "/dashboard/payroll", label: "Payroll" },
                { path: "/dashboard/reports", label: "Reports" },
                { path: "/dashboard/billing", label: "Billing" },
              ].map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link key={item.path} href={item.path} className={`nav-item ${isActive ? "active" : ""}`}>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-[var(--border)] text-xs text-[var(--text-muted)] space-y-2 px-3">
            <div>Organization: <span className="font-medium text-[var(--text-secondary)]">{stats.companyName}</span></div>
            <div>Verification: <span className="text-[var(--success)] font-medium">Fayda Verified</span></div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DashboardProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </DashboardProvider>
    </ToastProvider>
  );
}
