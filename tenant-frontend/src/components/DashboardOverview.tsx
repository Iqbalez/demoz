"use client";

import React from "react";

export interface DashboardOverviewProps {
  stats: {
    totalEmployees: number;
    maxEmployees: number;
    attendanceRate: number;
    monthlyPayroll: number;
    planTier: string;
  };
  activityLogs: Array<{
    id: string;
    timestamp: string;
    user: string;
    action: string;
    type: "info" | "success" | "warning" | "error";
  }>;
}

export default function DashboardOverview({ stats, activityLogs }: DashboardOverviewProps) {
  const seatPercentage = Math.min((stats.totalEmployees / stats.maxEmployees) * 100, 100);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl glass-card bg-gradient-to-r from-emerald-950/20 via-slate-900/10 to-transparent flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">Welcome back, Demoz Manager!</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Here is the compliant multi-tenant overview for your organization today.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-slow"></span>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-outfit">Live USSD Link Active</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Employees */}
        <div className="p-5 rounded-2xl glass-card relative overflow-hidden flex flex-col justify-between h-32 hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Total Onboarded</span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">
              {stats.totalEmployees} <span className="text-xs text-slate-400 font-medium">/ {stats.maxEmployees} seats</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${seatPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Daily Attendance Rate */}
        <div className="p-5 rounded-2xl glass-card relative overflow-hidden flex flex-col justify-between h-32 hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Attendance Rate</span>
            <span className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">
              {stats.attendanceRate}%
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2 flex items-center gap-1">
              <span className="text-emerald-500">↑ 1.2%</span> from yesterday
            </p>
          </div>
        </div>

        {/* Estimated Monthly Payroll */}
        <div className="p-5 rounded-2xl glass-card relative overflow-hidden flex flex-col justify-between h-32 hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Monthly Payroll</span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <span className="text-xs font-bold font-mono">ETB</span>
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">
              {stats.monthlyPayroll.toLocaleString()} <span className="text-xs text-amber-500 font-bold">ETB</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2">
              Ethiopian Tax/Pension Compliant
            </p>
          </div>
        </div>

        {/* Active Subscription Plan */}
        <div className="p-5 rounded-2xl glass-card relative overflow-hidden flex flex-col justify-between h-32 hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">SaaS Active Plan</span>
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </span>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 dark:text-zinc-50 uppercase font-outfit">
              {stats.planTier}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2">
              Next renewal: June 15, 2026
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Data & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendance Visual Chart (SVG Bar Chart) */}
        <div className="lg:col-span-2 p-5 rounded-2xl glass-card flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-100 font-outfit">Weekly Attendance Trend</h3>
            <p className="text-xs text-slate-400 mt-1">Comparing Web PWA vs USSD mobile check-ins</p>
          </div>
          
          <div className="my-6 flex items-end justify-between h-36 px-4 border-b border-slate-100 dark:border-zinc-800 pb-2">
            {[
              { day: "Mon", ussd: 75, web: 20 },
              { day: "Tue", ussd: 82, web: 15 },
              { day: "Wed", ussd: 80, web: 18 },
              { day: "Thu", ussd: 88, web: 10 },
              { day: "Fri", ussd: 92, web: 8 },
            ].map((bar, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 w-1/5">
                <div className="flex items-end justify-center gap-1.5 w-full h-28">
                  {/* USSD Bar */}
                  <div 
                    className="w-4 bg-emerald-500 rounded-t-sm hover:opacity-85 transition-all duration-700" 
                    style={{ height: `${bar.ussd}%` }}
                    title={`USSD: ${bar.ussd}%`}
                  ></div>
                  {/* Web Bar */}
                  <div 
                    className="w-4 bg-sky-500 rounded-t-sm hover:opacity-85 transition-all duration-700" 
                    style={{ height: `${bar.web}%` }}
                    title={`Web: ${bar.web}%`}
                  ></div>
                </div>
                <span className="text-[10px] font-medium text-slate-400">{bar.day}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-4 text-xs justify-center font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span className="text-slate-600 dark:text-zinc-400">USSD (Mobile)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-sky-500"></span>
              <span className="text-slate-600 dark:text-zinc-400">Web App (PWA)</span>
            </div>
          </div>
        </div>

        {/* Live Activity Log feed */}
        <div className="p-5 rounded-2xl glass-card flex flex-col h-[300px]">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-100 font-outfit mb-3">Live System Logs</h3>
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            {activityLogs.map((log) => {
              const bgMap = {
                info: "bg-sky-500/10 text-sky-500 border-sky-500/20",
                success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
                error: "bg-red-500/10 text-red-500 border-red-500/20",
              };
              
              return (
                <div key={log.id} className="flex gap-2.5 items-start text-xs border border-slate-100 dark:border-zinc-800/80 p-2.5 rounded-xl bg-slate-50/50 dark:bg-zinc-900/30">
                  <div className={`p-1.5 rounded-lg border font-mono text-[9px] font-semibold shrink-0 ${bgMap[log.type]}`}>
                    {log.type.toUpperCase()}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-slate-700 dark:text-zinc-200">
                      <span className="font-semibold text-slate-900 dark:text-zinc-100">{log.user}</span> {log.action}
                    </p>
                    <span className="text-[10px] text-slate-400 block">{log.timestamp}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
