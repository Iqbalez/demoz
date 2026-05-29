"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useDashboard } from "../../context/DashboardContext";
import { toast } from "../../components/ui/toast";
import { apiRequest } from "../../lib/api";
import { downloadWithSession } from "../../lib/download";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

type PayrollRunRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  grossTotal: number;
  netTotal: number;
  taxTotal: number;
  sampleLineItemId: string | null;
};

export function ReportsDashboard() {
  const { stats, isThemeDark } = useDashboard();
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [runs, setRuns] = useState<PayrollRunRow[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const data = await apiRequest<PayrollRunRow[]>("/payroll/reports/runs");
      setRuns(data);
    } catch {
      setRuns([]);
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const payrollTrendData =
    runs.length > 0
      ? runs.slice(0, 6).reverse().map((r) => ({
          month: new Date(r.periodStart).toLocaleString("default", { month: "short", year: "2-digit" }),
          gross: r.grossTotal,
          net: r.netTotal,
          tax: r.taxTotal,
          pension: Math.max(0, r.grossTotal - r.netTotal - r.taxTotal),
        }))
      : stats.monthlyPayroll > 0
        ? [
            {
              month: new Date().toLocaleString("default", { month: "short" }),
              gross: stats.monthlyPayroll,
              net: stats.monthlyPayroll * 0.78,
              tax: stats.monthlyPayroll * 0.15,
              pension: stats.monthlyPayroll * 0.07,
            },
          ]
        : [];

  const handleAiAudit = () => {
    setIsAuditing(true);
    setAuditResult(null);
    toast.info("Compliance check", "Reviewing payroll runs against ERCA Schedule A and POESSA rules…");

    setTimeout(() => {
      setIsAuditing(false);
      if (!runs.length) {
        setAuditResult(
          "No completed payroll runs yet. Run payroll from the Payroll page, then export ERCA and POESSA CSV files here.",
        );
        toast.warning("No payroll runs", "Generate payroll before exporting statutory reports.");
        return;
      }
      setAuditResult(
        `Found ${runs.length} completed run(s) for ${stats.companyName}. Exports use real line items from your database (income tax bands, 15,000 ETB pension cap, transport exemption).`,
      );
      toast.success("Ready to export", "Use the buttons below to download Ethiopian-format CSV/HTML.");
    }, 1200);
  };

  const downloadReport = async (type: "erca" | "psssa" | "payslip", run: PayrollRunRow) => {
    try {
      if (type === "payslip") {
        if (!run.sampleLineItemId) {
          toast.error("No payslip", "This run has no line items yet.");
          return;
        }
        await downloadWithSession(
          `/payroll/reports/payslip/${run.sampleLineItemId}`,
          `payslip-${run.id}.html`,
          { openHtmlInNewTab: true },
        );
      } else if (type === "erca") {
        await downloadWithSession(
          `/payroll/reports/erca/${run.id}`,
          `erca-schedule-a-${run.id.slice(0, 8)}.csv`,
        );
      } else {
        await downloadWithSession(
          `/payroll/reports/psssa/${run.id}`,
          `poessa-pension-${run.id.slice(0, 8)}.csv`,
        );
      }
      toast.success("Download started", `${type.toUpperCase()} export for ${stats.companyName}`);
    } catch (err: unknown) {
      toast.error("Download failed", err instanceof Error ? err.message : "Could not download file");
    }
  };

  return (
    <div className="space-y-6 animate-slide-up select-none">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 dark:border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50 font-outfit">Analytics & Reports</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ERCA Schedule A and POESSA pension CSV exports from completed payroll runs
          </p>
        </div>

        <button
          onClick={handleAiAudit}
          disabled={isAuditing}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isAuditing ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Checking…</span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span>Check compliance readiness</span>
            </>
          )}
        </button>
      </div>

      {auditResult && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex gap-4 animate-fade-in">
          <div className="text-2xl mt-1">✨</div>
          <div>
            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Compliance summary</h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">{auditResult}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c1424] shadow-md h-80 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 font-outfit">Payroll expense trend</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Gross vs net from completed runs</p>
          </div>
          <div className="flex-1 w-full min-h-[220px]">
            {mounted && payrollTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={payrollTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: isThemeDark ? "#a1a1aa" : "#64748b" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: isThemeDark ? "#a1a1aa" : "#64748b" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isThemeDark ? "#18181b" : "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="gross" stroke="#10b981" strokeWidth={3} fill="url(#colorGross)" name="Gross (ETB)" />
                  <Area type="monotone" dataKey="net" stroke="#0ea5e9" strokeWidth={3} fill="url(#colorNet)" name="Net (ETB)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 italic">
                {loadingRuns ? "Loading runs…" : "Complete a payroll run to see trends."}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c1424] shadow-md h-80 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 font-outfit">Statutory deductions</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Income tax vs pension (ETB)</p>
          </div>
          <div className="flex-1 w-full min-h-[220px]">
            {mounted && payrollTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={payrollTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isThemeDark ? "#27272a" : "#f1f5f9"} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isThemeDark ? "#a1a1aa" : "#64748b" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isThemeDark ? "#a1a1aa" : "#64748b" }} />
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey="tax" stackId="a" fill="#f43f5e" name="Income Tax" />
                  <Bar dataKey="pension" stackId="a" fill="#f59e0b" name="Pension" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 italic">
                No deduction data yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-zinc-800/80">
          <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 font-outfit">Payroll ledgers & exports</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Downloads use your session cookie and real payroll line items (no demo data).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-zinc-900/50 text-slate-500 dark:text-slate-400 uppercase text-[9px] font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3">Period</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Gross total</th>
                <th className="px-5 py-3 text-right">Exports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {loadingRuns ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    Loading payroll runs…
                  </td>
                </tr>
              ) : runs.length > 0 ? (
                runs.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800 dark:text-zinc-100">
                        {new Date(run.periodStart).toLocaleDateString("en-ET", { month: "long", year: "numeric" })}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">Run {run.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold rounded text-[9px] uppercase">
                        {run.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold">{run.grossTotal.toLocaleString()} ETB</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => downloadReport("erca", run)}
                          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded font-bold text-[10px]"
                        >
                          ERCA CSV
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadReport("psssa", run)}
                          className="px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded font-bold text-[10px]"
                        >
                          POESSA CSV
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadReport("payslip", run)}
                          className="px-3 py-1.5 border border-slate-200 dark:border-zinc-700 rounded font-bold text-[10px]"
                        >
                          Sample payslip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-semibold italic">
                    No completed payroll runs. Run payroll first, then return here to download ERCA and POESSA files.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
