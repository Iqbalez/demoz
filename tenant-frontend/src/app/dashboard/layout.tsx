"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ToastProvider } from "../../components/ui/toast";
import { DashboardProvider, useDashboard } from "../../context/DashboardContext";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { backendStatus, isThemeDark, setIsThemeDark, stats } = useDashboard();

  const handleLogout = () => {
    // Session termination router transition
    router.push("/");
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-[#070b13] transition-colors">
      
      {/* Dynamic Header console */}
      <header className="h-16 px-6 border-b border-slate-100 dark:border-zinc-800/80 bg-white/70 dark:bg-[#0c1424]/70 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent font-outfit tracking-tight select-none">
            {stats.companyName} Workspace
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest select-none">
            Tenant Console
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* SRE connection verification badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 select-none">
            <span className={`w-2 h-2 rounded-full ${backendStatus === "CONNECTED" ? "bg-emerald-500 animate-pulse" : "bg-purple-500 animate-pulse"}`}></span>
            {backendStatus === "CONNECTED" ? "Connected to NestJS" : "Simulation Mode"}
          </div>

          {/* Theme switcher */}
          <button
            onClick={() => setIsThemeDark((prev) => !prev)}
            className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-all cursor-pointer"
            title="Toggle Theme"
          >
            {isThemeDark ? "☀️" : "🌙"}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main workspace layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-56 p-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-zinc-800/80 space-y-6">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block select-none">Corporate Directory</span>
            
            <nav className="space-y-1">
              {[
                { path: "/dashboard", label: "Console Overview", icon: "📊" },
                { path: "/dashboard/employees", label: "HR / Onboarding", icon: "👥" },
                { path: "/dashboard/attendance", label: "Geofence Registry", icon: "📍" },
                { path: "/dashboard/leave", label: "Leave Manager", icon: "📅" },
                { path: "/dashboard/payroll", label: "Payroll Compliant", icon: "💰" },
                { path: "/dashboard/reports", label: "Analytics & Reports", icon: "📈" },
                { path: "/dashboard/billing", label: "SaaS Billing", icon: "💳" },
              ].map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer active:scale-[0.98] transition-all ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/20"
                        : "hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-600 dark:text-zinc-300"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-zinc-800/80 text-[10px] text-slate-400 space-y-1 select-none">
            <div>Corporate: <span className="font-bold font-mono">{stats.companyName}</span></div>
            <div>Biometrics: <span className="text-emerald-500 font-bold">Fayda Verified</span></div>
          </div>
        </aside>

        {/* Central children render page */}
        <main className="flex-1 p-6 overflow-y-auto">
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
