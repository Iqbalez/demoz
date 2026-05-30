"use client";

import React, { useMemo } from "react";
import { useDashboard } from "../../context/DashboardContext";
import { useAuth } from "../../context/AuthContext";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { stats, auditLogs, logs, employees } = useDashboard();
  const firstName = user?.email?.split("@")[0]?.split(/[._]/)[0] ?? "there";
  const greetingName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const seatPercentage = Math.min((stats.totalEmployees / stats.maxEmployees) * 100, 100);

  const weeklyChartData = useMemo(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets: Record<string, { ussd: number; web: number; mobile: number }> = {};
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
      } catch {}
    });

    const workDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    return workDays.map((day) => ({
      day,
      ussd: buckets[day].ussd,
      web: buckets[day].web,
      mobile: buckets[day].mobile,
      total: buckets[day].ussd + buckets[day].web + buckets[day].mobile,
    }));
  }, [logs]);

  const chartMax = useMemo(() => {
    return Math.max(...weeklyChartData.map((d) => Math.max(d.ussd, d.web + d.mobile, 1)));
  }, [weeklyChartData]);

  const hasChartData = logs.length > 0;

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

  const payrollInsight = useMemo(() => {
    if (employees.length === 0) return null;
    const activeCount = employees.filter((e) => e.status === "ACTIVE").length;
    const ratio = Math.round((activeCount / employees.length) * 100);
    return { activeCount, ratio };
  }, [employees]);

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Welcome banner */}
      <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--brand-primary-light)] to-white p-6 lg:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            {getGreeting()}, {greetingName}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-lg">
            Here&apos;s what&apos;s happening at{" "}
            <span className="font-semibold text-[var(--text-primary)]">{stats.companyName}</span> today.
          </p>
        </div>
        <div className="pill pill-success shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] mr-2" />
          All systems online
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Seats Occupied */}
        <div className="bento-tile flex flex-col justify-between h-36 p-5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Employees</span>
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {stats.totalEmployees} <span className="text-sm text-[var(--text-muted)] font-medium">/ {stats.maxEmployees}</span>
            </div>
            <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full mt-3 overflow-hidden border border-[var(--border)]">
              <div 
                className="bg-[var(--accent)] h-full rounded-full transition-all duration-500" 
                style={{ width: `${seatPercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="absolute right-5 bottom-4">
            <span className="text-[11px] font-medium text-[var(--accent)]">
              {Math.round(seatPercentage)}% allocated
            </span>
          </div>
        </div>

        {/* KPI 2: Attendance Rate */}
        <div className="bento-tile flex flex-col justify-between h-36 p-5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Attendance Rate</span>
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {stats.attendanceRate}%
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
              {logs.length > 0 ? `${logs.length} total check-ins` : "No data today"}
            </p>
          </div>
          <div className="absolute right-5 bottom-4">
            {attendanceDelta !== null ? (
              <span className={`pill ${attendanceDelta.direction === "up" ? "pill-success" : "pill-danger"}`}>
                {attendanceDelta.direction === "up" ? "↑" : "↓"} {Math.abs(attendanceDelta.diff)}%
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[var(--text-muted)]">—</span>
            )}
          </div>
        </div>

        {/* KPI 3: Estimated Monthly Payroll */}
        <div className="bento-tile flex flex-col justify-between h-36 p-5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Monthly Payroll</span>
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {stats.monthlyPayroll.toLocaleString()} <span className="text-sm text-[var(--text-muted)] font-medium">ETB</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
              Tax & Pension Compliant
            </p>
          </div>
          <div className="absolute right-5 bottom-4">
            {payrollInsight !== null ? (
              <span className="pill pill-accent">
                {payrollInsight.ratio}% active
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[var(--text-muted)]">—</span>
            )}
          </div>
        </div>

        {/* KPI 4: Active Subscription Plan */}
        <div className="bento-tile flex flex-col justify-between h-36 p-5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Current Plan</span>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-[var(--accent)] uppercase">
              {stats.planTier}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
              Active Subscription
            </p>
          </div>
        </div>
      </div>

      {/* Main Data Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bento-tile flex flex-col justify-between min-h-[340px]">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Weekly Attendance Overview</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {hasChartData
                ? `Activity breakdown across ${logs.length} check-ins this week.`
                : "No attendance data available yet."}
            </p>
          </div>
          
          {hasChartData ? (
            <>
              <div className="my-8 flex items-end justify-between h-40 px-6 border-b border-[var(--border)] pb-2 relative">
                {/* Horizontal grid lines */}
                <div className="absolute w-full h-px bg-[var(--border)] top-10 left-0"></div>
                <div className="absolute w-full h-px bg-[var(--border)] top-20 left-0"></div>
                
                {weeklyChartData.map((bar, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-3 w-1/5 relative z-10">
                    <div className="flex items-end justify-center gap-2 w-full h-28">
                      <div 
                        className="w-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-all duration-300 rounded-t cursor-pointer" 
                        style={{ height: `${bar.ussd > 0 ? Math.max((bar.ussd / chartMax) * 100, 4) : 0}%` }}
                        title={`USSD: ${bar.ussd}`}
                      ></div>
                      <div 
                        className="w-4 bg-[var(--text-muted)] hover:bg-[var(--text-secondary)] transition-all duration-300 rounded-t cursor-pointer" 
                        style={{ height: `${(bar.web + bar.mobile) > 0 ? Math.max(((bar.web + bar.mobile) / chartMax) * 100, 4) : 0}%` }}
                        title={`Web/Mobile: ${bar.web + bar.mobile}`}
                      ></div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-medium text-[var(--text-muted)]">{bar.day}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-6 text-[11px] justify-center font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded bg-[var(--accent)]"></span>
                  <span className="text-[var(--text-secondary)]">USSD Check-ins</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded bg-[var(--text-muted)]"></span>
                  <span className="text-[var(--text-secondary)]">Web/App Check-ins</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
              <p className="text-sm text-[var(--text-muted)] text-center">No data available to display chart.</p>
            </div>
          )}
        </div>

        {/* Live Event Stream */}
        <div className="bento-tile flex flex-col h-[340px]">
          <div className="mb-4">
            <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Activity Log</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Recent platform events</p>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => {
                const isWarning = log.type === 'warning';
                return (
                  <div key={log.id} className={`p-3 rounded-lg border ${isWarning ? 'border-[var(--danger-dim)] bg-[var(--danger-dim)]' : 'border-[var(--border)] bg-[var(--bg-elevated)]'} text-xs`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${isWarning ? 'text-[var(--danger)]' : 'text-[var(--accent)]'}`}>
                        {log.type}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{log.timestamp}</span>
                    </div>
                    <p className="text-[var(--text-secondary)]">
                      <span className="text-[var(--text-primary)] font-medium">{log.user}</span> {log.action}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-muted)]">
                <p className="text-sm">No recent activity.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
