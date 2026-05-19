"use client";

import React from "react";
import { useDashboard } from "../../context/DashboardContext";

export default function DashboardOverviewPage() {
  const { stats, auditLogs } = useDashboard();
  const seatPercentage = Math.min((stats.totalEmployees / stats.maxEmployees) * 100, 100);

  return (
    <div className="space-y-6 animate-slide-up select-none">
      
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/20 via-slate-900/10 to-transparent flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-[#0c1424]">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">Welcome back, Demoz Manager!</h2>
          <p className="text-xs text-slate-400 mt-1">Here is the compliant multi-tenant overview for your organization today.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-outfit">
            USSD Webhook Active
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Employees */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-100 dark:border-zinc-800/80 shadow-md relative overflow-hidden flex flex-col justify-between h-32 hover:scale-[1.02] transition-all duration-300">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seats Occupied</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              👥
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
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-100 dark:border-zinc-800/80 shadow-md relative overflow-hidden flex flex-col justify-between h-32 hover:scale-[1.02] transition-all duration-300">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</span>
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              📍
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">
              {stats.attendanceRate}%
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2 flex items-center gap-1">
              <span className="text-emerald-500 font-bold">↑ 1.2%</span> from yesterday
            </p>
          </div>
        </div>

        {/* Estimated Monthly Payroll */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-100 dark:border-zinc-800/80 shadow-md relative overflow-hidden flex flex-col justify-between h-32 hover:scale-[1.02] transition-all duration-300">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Payroll</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold font-mono text-[10px]">
              ETB
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">
              {stats.monthlyPayroll.toLocaleString()} <span className="text-xs text-amber-500 font-bold">ETB</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Ethiopian Tax/Pension Compliant
            </p>
          </div>
        </div>

        {/* Active Subscription Plan */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-100 dark:border-zinc-800/80 shadow-md relative overflow-hidden flex flex-col justify-between h-32 hover:scale-[1.02] transition-all duration-300">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Plan</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              💳
            </span>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800 dark:text-zinc-50 uppercase font-outfit">
              {stats.planTier}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Next renewal: June 15, 2026
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Telemetry Charts & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendance Visual Vector Chart */}
        <div className="lg:col-span-2 p-5 rounded-3xl border border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-[#0c1424] shadow-xl flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-100 font-outfit">Weekly Attendance Telemetry</h3>
            <p className="text-[10px] text-slate-400 mt-1">Comparing Web PWA vs USSD mobile check-ins</p>
          </div>
          
          <div className="my-6 flex items-end justify-between h-36 px-4 border-b border-slate-100 dark:border-zinc-800/80 pb-2">
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
                    className="w-4 bg-emerald-500 rounded-t-lg hover:opacity-85 transition-all duration-700 cursor-pointer" 
                    style={{ height: `${bar.ussd}%` }}
                    title={`USSD: ${bar.ussd}%`}
                  ></div>
                  {/* Web Bar */}
                  <div 
                    className="w-4 bg-sky-500 rounded-t-lg hover:opacity-85 transition-all duration-700 cursor-pointer" 
                    style={{ height: `${bar.web}%` }}
                    title={`Web: ${bar.web}%`}
                  ></div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 font-mono">{bar.day}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-4 text-[10px] justify-center font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
              <span className="text-slate-400 uppercase tracking-wide">USSD (Mobile)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-sky-500"></span>
              <span className="text-slate-400 uppercase tracking-wide">Web App (PWA)</span>
            </div>
          </div>
        </div>

        {/* Live system logs */}
        <div className="p-5 rounded-3xl border border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-[#0c1424] shadow-xl flex flex-col h-[300px]">
          <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-100 font-outfit mb-3">Live System Logs</h3>
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
            {auditLogs.map((log) => {
              const bgMap = {
                info: "bg-sky-500/10 text-sky-500 border-sky-500/20",
                success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
                error: "bg-red-500/10 text-red-500 border-red-500/20",
              };
              
              return (
                <div key={log.id} className="flex gap-2.5 items-start text-xs border border-slate-100 dark:border-zinc-800/50 p-2.5 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/30">
                  <div className={`p-1 px-1.5 rounded bg-black/5 dark:bg-white/5 border font-mono text-[8px] font-bold shrink-0 uppercase tracking-wider ${bgMap[log.type]}`}>
                    {log.type}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-slate-700 dark:text-zinc-200">
                      <span className="font-bold text-slate-900 dark:text-zinc-100">{log.user}</span> {log.action}
                    </p>
                    <span className="text-[9px] text-slate-400 font-mono block">{log.timestamp}</span>
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
