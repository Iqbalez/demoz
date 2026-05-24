"use client";

import React from "react";
import { useDashboard } from "../../context/DashboardContext";

export default function DashboardOverviewPage() {
  /* ==========================================
     STATE HOOKS & COMPUTE - COMPLETELY UNTOUCHED
     ========================================== */
  const { stats, auditLogs } = useDashboard();
  const seatPercentage = Math.min((stats.totalEmployees / stats.maxEmployees) * 100, 100);
  /* ==========================================
     END OF UNTOUCHED STATE HOOKS & COMPUTE
     ========================================== */

  return (
    <div className="space-y-6 animate-slide-up select-none">
      
      {/* Top Banner / Welcome Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/20 via-slate-900/10 to-transparent flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-zinc-200/50 dark:border-zinc-800/60 bg-white dark:bg-[#0c1424] transition-all duration-200 hover:border-emerald-500/20 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 font-outfit tracking-tight">
            Welcome, {stats.companyName} Manager
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">
            Compliant, real-time telemetry overview for your organization.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-outfit">
            USSD Webhook Active
          </span>
        </div>
      </div>

      {/* 1. HIGH-DENSITY GRID & LAYOUT HIERARCHY (Bento style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Seats Occupied (Critical High-Priority - Top-Left) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm relative overflow-hidden flex flex-col justify-between h-32 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Seats Occupied</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
              👥
            </span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-50 font-outfit tracking-tight">
              {stats.totalEmployees} <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">/ {stats.maxEmployees} seats</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-800/80 h-1.5 rounded-full mt-2 overflow-hidden border border-zinc-200/20 dark:border-zinc-800/40">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${seatPercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="absolute right-3 bottom-2">
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              ↑ compliant
            </span>
          </div>
        </div>

        {/* KPI 2: Daily Attendance Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm relative overflow-hidden flex flex-col justify-between h-32 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Attendance Rate</span>
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs">
              📍
            </span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-50 font-outfit tracking-tight">
              {stats.attendanceRate}%
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2 font-medium">
              Daily Attendance Sync Rate
            </p>
          </div>
          <div className="absolute right-3 bottom-2">
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/5 px-1.5 py-0.5 rounded">
              ↑ 1.2% vs yesterday
            </span>
          </div>
        </div>

        {/* KPI 3: Estimated Monthly Payroll */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm relative overflow-hidden flex flex-col justify-between h-32 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Monthly Payroll</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold font-mono text-[9px]">
              ETB
            </span>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-50 font-outfit tracking-tight">
              {stats.monthlyPayroll.toLocaleString()} <span className="text-xs text-amber-500 font-bold">ETB</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2 font-medium">
              Tax & Pension Compliant Wages
            </p>
          </div>
          <div className="absolute right-3 bottom-2">
            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-500 bg-amber-500/10 dark:bg-amber-500/5 px-1.5 py-0.5 rounded">
              ↓ 0.8% tax optimized
            </span>
          </div>
        </div>

        {/* KPI 4: Active Subscription Plan */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm relative overflow-hidden flex flex-col justify-between h-32 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Active Plan</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs">
              💳
            </span>
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-zinc-50 uppercase font-outfit tracking-tight">
              {stats.planTier}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2 font-medium">
              Organization Subscription Tier
            </p>
          </div>
          <div className="absolute right-3 bottom-2">
            <span className="text-[9px] font-semibold text-slate-400 dark:text-zinc-500">
              June 15 renewal
            </span>
          </div>
        </div>
      </div>

      {/* 2. REFINED MODULAR DATA CARDS (Bento Grid System) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bento Box: Attendance Visual Vector Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 bg-white dark:bg-[#0c1424] shadow-sm flex flex-col justify-between min-h-[320px] transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700/80">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-outfit tracking-tight">
              Weekly Attendance Telemetry
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 font-medium">
              Analytical breakdown of Web PWA vs USSD mobile check-ins.
            </p>
          </div>
          
          <div className="my-6 flex items-end justify-between h-36 px-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
            {[
              { day: "Mon", ussd: 75, web: 20 },
              { day: "Tue", ussd: 82, web: 15 },
              { day: "Wed", ussd: 80, web: 18 },
              { day: "Thu", ussd: 88, web: 10 },
              { day: "Fri", ussd: 92, web: 8 },
            ].map((bar, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 w-1/5">
                <div className="flex items-end justify-center gap-1.5 w-full h-28">
                  {/* USSD Bar - Compliance Emerald */}
                  <div 
                    className="w-4.5 bg-emerald-500 rounded-t-md hover:bg-emerald-400 transition-all duration-300 cursor-pointer shadow-sm shadow-emerald-500/10" 
                    style={{ height: `${bar.ussd}%` }}
                    title={`USSD: ${bar.ussd}%`}
                  ></div>
                  {/* Web Bar - Telemetry Sky */}
                  <div 
                    className="w-4.5 bg-sky-500 rounded-t-md hover:bg-sky-400 transition-all duration-300 cursor-pointer shadow-sm shadow-sky-500/10" 
                    style={{ height: `${bar.web}%` }}
                    title={`Web: ${bar.web}%`}
                  ></div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 font-mono tracking-wider">{bar.day}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-6 text-[10px] justify-center font-bold">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-sm shadow-emerald-500/20"></span>
              <span className="text-slate-400 dark:text-zinc-500 uppercase tracking-wider">USSD Cellular</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-sky-500 shadow-sm shadow-sky-500/20"></span>
              <span className="text-slate-400 dark:text-zinc-500 uppercase tracking-wider">PWA Browser</span>
            </div>
          </div>
        </div>

        {/* Bento Box: Live System Logs */}
        <div className="p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 bg-white dark:bg-[#0c1424] shadow-sm flex flex-col h-[320px] transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700/80">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-outfit tracking-tight">
              Live System Logs
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
              Real-time multi-tenant system mutations & telemetry audit.
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {auditLogs.map((log) => {
              const bgMap = {
                info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
                success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                error: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
              };
              
              return (
                <div 
                  key={log.id} 
                  className="flex gap-2.5 items-start text-xs border border-zinc-100 dark:border-zinc-800/40 p-3 rounded-xl bg-slate-50/50 dark:bg-zinc-900/15 transition-all duration-200 hover:border-emerald-500/10 hover:bg-slate-50 dark:hover:bg-zinc-900/30"
                >
                  <div className={`p-1 px-1.5 rounded-md border font-mono text-[8px] font-bold shrink-0 uppercase tracking-widest ${bgMap[log.type]}`}>
                    {log.type}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">
                      <span className="font-bold text-slate-900 dark:text-zinc-100">{log.user}</span> {log.action}
                    </p>
                    <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono block">{log.timestamp}</span>
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
