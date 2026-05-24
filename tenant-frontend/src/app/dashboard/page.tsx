"use client";

import React, { useMemo } from "react";
import { useDashboard } from "../../context/DashboardContext";

export default function DashboardOverviewPage() {
  /* ==========================================
     STATE HOOKS & COMPUTE - COMPLETELY UNTOUCHED
     ========================================== */
  const { stats, auditLogs, logs, employees } = useDashboard();
  const seatPercentage = Math.min((stats.totalEmployees / stats.maxEmployees) * 100, 100);
  /* ==========================================
     END OF UNTOUCHED STATE HOOKS & COMPUTE
     ========================================== */

  // ── Real-time attendance chart data ──
  // Aggregate actual logs by day-of-week and source channel
  const weeklyChartData = useMemo(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets: Record<string, { ussd: number; web: number; mobile: number }> = {};
    // Initialize all 7 days
    dayNames.forEach((d) => {
      buckets[d] = { ussd: 0, web: 0, mobile: 0 };
    });

    logs.forEach((log) => {
      try {
        const d = new Date(log.timestamp);
        const dayName = dayNames[d.getDay()];
        if (!dayName) return;
        if (log.source === "USSD") buckets[dayName].ussd += 1;
        else if (log.source === "WEB_PWA") buckets[dayName].web += 1;
        else if (log.source === "MOBILE_APP") buckets[dayName].mobile += 1;
      } catch {
        // skip malformed timestamps
      }
    });

    // Return Mon-Fri working days (or all 7 if you prefer)
    const workDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    return workDays.map((day) => ({
      day,
      ussd: buckets[day].ussd,
      web: buckets[day].web,
      mobile: buckets[day].mobile,
      total: buckets[day].ussd + buckets[day].web + buckets[day].mobile,
    }));
  }, [logs]);

  // Find the max value in chart for percentage-height scaling
  const chartMax = useMemo(() => {
    const max = Math.max(...weeklyChartData.map((d) => Math.max(d.ussd, d.web + d.mobile, 1)));
    return max;
  }, [weeklyChartData]);

  const hasChartData = logs.length > 0;

  // ── Real-time KPI delta computations ──
  // Attendance: compute today's rate vs yesterday's
  const attendanceDelta = useMemo(() => {
    if (logs.length === 0 || employees.length === 0) return null;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const todayLogs = logs.filter((l) => l.type === "CLOCK_IN" && l.timestamp.startsWith(todayStr));
    const yesterdayLogs = logs.filter((l) => l.type === "CLOCK_IN" && l.timestamp.startsWith(yesterdayStr));

    const todayRate = employees.length > 0 ? (todayLogs.length / employees.length) * 100 : 0;
    const yesterdayRate = employees.length > 0 ? (yesterdayLogs.length / employees.length) * 100 : 0;

    if (yesterdayRate === 0 && todayRate === 0) return null;
    const diff = todayRate - yesterdayRate;
    return { diff: Math.round(diff * 10) / 10, direction: diff >= 0 ? "up" : "down" };
  }, [logs, employees]);

  // Payroll: compute active vs total employees to derive a compliance ratio
  const payrollInsight = useMemo(() => {
    if (employees.length === 0) return null;
    const activeCount = employees.filter((e) => e.status === "ACTIVE").length;
    const ratio = Math.round((activeCount / employees.length) * 100);
    return { activeCount, ratio };
  }, [employees]);

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
            {stats.totalEmployees > 0 ? (
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                {Math.round(seatPercentage)}% utilized
              </span>
            ) : (
              <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">
                No employees yet
              </span>
            )}
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
              {logs.length > 0 ? `${logs.length} total check-ins recorded` : "No check-ins recorded yet"}
            </p>
          </div>
          <div className="absolute right-3 bottom-2">
            {attendanceDelta !== null ? (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                attendanceDelta.direction === "up"
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/5"
                  : "text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/5"
              }`}>
                {attendanceDelta.direction === "up" ? "↑" : "↓"} {Math.abs(attendanceDelta.diff)}% vs yesterday
              </span>
            ) : (
              <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500">
                — awaiting data
              </span>
            )}
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
            {payrollInsight !== null ? (
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-500 bg-amber-500/10 dark:bg-amber-500/5 px-1.5 py-0.5 rounded">
                {payrollInsight.ratio}% workforce active
              </span>
            ) : (
              <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500">
                — no employees
              </span>
            )}
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
              {stats.maxEmployees} seat limit
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
              {hasChartData
                ? `Real-time breakdown from ${logs.length} recorded check-ins this period.`
                : "No attendance data recorded yet. Check-ins will appear here automatically."}
            </p>
          </div>
          
          {hasChartData ? (
            <>
              <div className="my-6 flex items-end justify-between h-36 px-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
                {weeklyChartData.map((bar, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2 w-1/5">
                    <div className="flex items-end justify-center gap-1.5 w-full h-28">
                      {/* USSD Bar - Compliance Emerald */}
                      <div 
                        className="w-4.5 bg-emerald-500 rounded-t-md hover:bg-emerald-400 transition-all duration-300 cursor-pointer shadow-sm shadow-emerald-500/10" 
                        style={{ height: `${bar.ussd > 0 ? Math.max((bar.ussd / chartMax) * 100, 4) : 0}%` }}
                        title={`USSD: ${bar.ussd} check-ins`}
                      ></div>
                      {/* Web/Mobile Bar - Telemetry Sky */}
                      <div 
                        className="w-4.5 bg-sky-500 rounded-t-md hover:bg-sky-400 transition-all duration-300 cursor-pointer shadow-sm shadow-sky-500/10" 
                        style={{ height: `${(bar.web + bar.mobile) > 0 ? Math.max(((bar.web + bar.mobile) / chartMax) * 100, 4) : 0}%` }}
                        title={`Web: ${bar.web} / Mobile: ${bar.mobile} check-ins`}
                      ></div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 font-mono tracking-wider">{bar.day}</span>
                      <span className="text-[8px] text-slate-300 dark:text-zinc-600 font-mono">{bar.total}</span>
                    </div>
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
                  <span className="text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Web / Mobile</span>
                </div>
              </div>
            </>
          ) : (
            // Empty state when no attendance data exists
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800/60 flex items-center justify-center text-2xl">
                📊
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium text-center max-w-[250px]">
                Attendance telemetry will populate automatically as employees clock in via USSD, web, or mobile.
              </p>
            </div>
          )}
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
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => {
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
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <span className="text-2xl">📋</span>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium text-center">
                  No system events yet. Actions like onboarding and profile edits will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
