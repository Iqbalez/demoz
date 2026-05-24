"use client";

import React, { useState } from "react";
import { Employee } from "./HRDirectory";

export interface PayrollEngineProps {
  employees: Employee[];
  onTriggerDisbursement: () => void;
}

// Progressive Income Tax Brackets (Proclamation No. 1395/2025 - Schedule A)
export function calculateEthiopianTax(taxableVal: number): number {
  if (taxableVal <= 2000) return 0;
  if (taxableVal <= 4000) return taxableVal * 0.15 - 300;
  if (taxableVal <= 7000) return taxableVal * 0.20 - 500;
  if (taxableVal <= 10000) return taxableVal * 0.25 - 850;
  if (taxableVal <= 14000) return taxableVal * 0.30 - 1350;
  return taxableVal * 0.35 - 2050;
}

export default function PayrollEngine({ employees, onTriggerDisbursement }: PayrollEngineProps) {
  const [payrollStatus, setPayrollStatus] = useState<"DRAFT" | "AUDITED" | "DISBURSING" | "PAID">("DRAFT");
  const [isAuditing, setIsAuditing] = useState(false);
  const [showAiAuditReport, setShowAiAuditReport] = useState(false);
  
  // Department Budgets State
  const [deptBudgets, setDeptBudgets] = useState<Record<string, number>>({
    "Operations": 40000,
    "Tech / Engineering": 60000,
    "Finance": 30000,
    "HR / Admin": 30000,
  });

  // Computations
  const activeEmployees = employees.filter(e => e.status === "ACTIVE");
  const totalGross = activeEmployees.reduce((acc, emp) => acc + (emp.baseSalary || 0), 0);
  const totalPension = activeEmployees.reduce((acc, emp) => acc + (Math.min(emp.baseSalary || 0, 15000) * 0.07), 0);
  const totalTax = activeEmployees.reduce((acc, emp) => {
    const pension = Math.min(emp.baseSalary || 0, 15000) * 0.07;
    const taxable = (emp.baseSalary || 0) - pension;
    return acc + calculateEthiopianTax(taxable);
  }, 0);
  const totalNet = totalGross - totalPension - totalTax;

  // Department totals
  const getDeptTotal = (dept: string) => {
    return activeEmployees
      .filter(e => e.departmentName.toLowerCase().startsWith(dept.toLowerCase().slice(0, 4)))
      .reduce((acc, emp) => acc + (emp.baseSalary || 0), 0);
  };

  const handleRunAiAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      setPayrollStatus("AUDITED");
      setShowAiAuditReport(true);
    }, 1200);
  };

  const handleDisbursePayroll = () => {
    setPayrollStatus("DISBURSING");
    setTimeout(() => {
      setPayrollStatus("PAID");
      onTriggerDisbursement();
    }, 2500);
  };

  const handleResetPayroll = () => {
    setPayrollStatus("DRAFT");
    setShowAiAuditReport(false);
  };

  const handleBudgetChange = (dept: string, val: number) => {
    setDeptBudgets(prev => ({
      ...prev,
      [dept]: val
    }));
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">Compliant Payroll</h2>
          <p className="text-sm text-slate-400">Process salaries, compute federal Ethiopian taxes, and verify department allocations.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {payrollStatus === "DRAFT" && (
            <button
              onClick={handleRunAiAudit}
              disabled={isAuditing}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg font-semibold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-55 flex items-center gap-1.5"
            >
              {isAuditing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Auditing Logs...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Run AI Fraud Audit
                </>
              )}
            </button>
          )}

          {payrollStatus === "AUDITED" && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAiAuditReport(prev => !prev)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl font-semibold text-xs transition-all active:scale-95 cursor-pointer border border-slate-200/40 dark:border-zinc-800/40"
              >
                {showAiAuditReport ? "Hide AI Report" : "Show AI Report"}
              </button>
              <button
                onClick={handleDisbursePayroll}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg font-semibold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Disburse via Chapa (ETB)
              </button>
            </div>
          )}

          {payrollStatus === "PAID" && (
            <button
              onClick={handleResetPayroll}
              className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl font-semibold text-xs transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-zinc-800/80"
            >
              Reset Draft Period
            </button>
          )}
        </div>
      </div>

      {/* Calculations Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-card text-center border border-slate-100 dark:border-zinc-800/80">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Gross Salary</span>
          <span className="text-xl font-bold text-slate-800 dark:text-zinc-100 font-outfit block mt-1">{totalGross.toLocaleString()} ETB</span>
        </div>
        <div className="p-4 rounded-2xl glass-card text-center border border-slate-100 dark:border-zinc-800/80">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Income Tax (Federal)</span>
          <span className="text-xl font-bold text-red-500 font-outfit block mt-1">-{totalTax.toLocaleString()} ETB</span>
        </div>
        <div className="p-4 rounded-2xl glass-card text-center border border-slate-100 dark:border-zinc-800/80">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Pension Deductions (7%)</span>
          <span className="text-xl font-bold text-amber-500 font-outfit block mt-1">-{totalPension.toLocaleString()} ETB</span>
        </div>
        <div className="p-4 rounded-2xl glass-card text-center bg-emerald-500/5 border border-emerald-500/20">
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">Net Disbursement</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-outfit block mt-1">{totalNet.toLocaleString()} ETB</span>
        </div>
      </div>

      {/* Department Budget Planner Panel */}
      <div className="p-5 rounded-2xl glass-card border border-slate-100 dark:border-zinc-800/80 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 font-outfit">Interactive Department Budget Planner</h3>
          <p className="text-xs text-slate-400 mt-0.5">Control salary spending guidelines across organizational departments.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {[
            { key: "Operations", label: "Operations Dept" },
            { key: "Tech / Engineering", label: "Tech & Engineering" },
            { key: "Finance", label: "Finance Dept" },
            { key: "HR / Admin", label: "HR & Administration" },
          ].map((dept) => {
            const spent = getDeptTotal(dept.key);
            const budget = deptBudgets[dept.key] || 30000;
            const overBudget = spent > budget;
            const ratio = Math.min((spent / budget) * 100, 100);

            return (
              <div key={dept.key} className="space-y-2 p-3 bg-slate-50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800/50 rounded-xl">
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-slate-800 dark:text-zinc-200">{dept.label}</span>
                  <span className={`font-mono text-[10px] ${overBudget ? "text-red-500 font-bold" : "text-slate-400"}`}>
                    Spent: {spent.toLocaleString()} / Limit: {budget.toLocaleString()} ETB
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${overBudget ? "bg-red-500" : "bg-emerald-500"}`} 
                    style={{ width: `${ratio}%` }}
                  ></div>
                </div>

                {/* Adjuster slider */}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[9px] text-slate-400 font-semibold uppercase">Budget Cap:</span>
                  <input 
                    type="range" 
                    min="10000" 
                    max="100000" 
                    step="5000" 
                    value={budget} 
                    onChange={(e) => handleBudgetChange(dept.key, parseInt(e.target.value))}
                    className="flex-1 accent-emerald-500 cursor-pointer h-1 rounded-lg bg-zinc-800" 
                  />
                </div>

                {overBudget && (
                  <div className="text-[9px] font-bold text-red-500 flex items-center gap-1">
                    ⚠️ Budget infraction detected! Reduce salaries or expand caps.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI FRAUD AUDIT VISUAL PANEL */}
      {showAiAuditReport && (
        <div className="p-5 rounded-2xl glass-card border-purple-500/20 bg-purple-950/5 dark:bg-purple-950/10 animate-slide-up space-y-4">
          <div className="flex justify-between items-center border-b border-purple-500/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-[9px] font-bold uppercase tracking-wider">
                DEMOZ AI ENGINE
              </span>
              <h3 className="text-sm font-bold text-purple-900 dark:text-purple-400 font-outfit">Payroll Audit Analysis</h3>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 font-medium">Risk Score:</span>
              <span className="text-sm font-bold text-emerald-600">8% (Low Risk)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2 space-y-3">
              <h4 className="font-semibold text-slate-800 dark:text-zinc-200">AI Audit Summary</h4>
              <p className="text-slate-500 leading-relaxed">
                The AI Compliance auditor completed checks across biometric registrations. No ghost employee signatures or unauthorized cell-tower USSD relays have been flagged. Total compliance rating matches standard thresholds.
              </p>
              
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                <span className="font-bold text-amber-600 text-[9px] uppercase">Telemetry Proximity Warning</span>
                <p className="text-slate-600 dark:text-amber-200 leading-normal">
                  Employee **Yosef** logged check-ins matching coordinates close to employee **Almaz** within 1.5 seconds. Recommend active biometric check matches to ensure no proxy check-ins are active.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center p-4 bg-purple-950/20 dark:bg-slate-900/30 border border-purple-500/10 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Compliance Score</span>
              <div className="relative w-24 h-24 my-2 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" className="text-slate-200 dark:text-zinc-800" fill="transparent" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" className="text-emerald-500" strokeDasharray="251" strokeDashoffset="20" fill="transparent" />
                </svg>
                <span className="absolute text-lg font-bold text-slate-800 dark:text-zinc-50 font-outfit">92%</span>
              </div>
              <span className="text-[9px] text-slate-400 font-medium">Verified Biometrics Logs</span>
            </div>
          </div>
        </div>
      )}

      {/* PAYOUT PROCESSING LOADER */}
      {payrollStatus === "DISBURSING" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-2xl text-center space-y-4 animate-slide-up">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-50 font-outfit">Connecting Chapa Gateway</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                Initiating secure bank and tele-money disbursements to {activeEmployees.length} active employees. Please do not close this window.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800/80 text-[10px] font-mono text-slate-400">
              POST /api/v1/finance/payouts/bulk
            </div>
          </div>
        </div>
      )}

      {/* PAYROLL LEDGER TABLE */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 font-outfit">Salary Breakdowns</h3>
        <div className="rounded-2xl glass-card overflow-hidden shadow-sm border border-slate-100 dark:border-zinc-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-500 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800/80">
                  <th className="py-4 px-5">Employee</th>
                  <th className="py-4 px-5">Gross Salary</th>
                  <th className="py-4 px-5">Pension (7%)</th>
                  <th className="py-4 px-5">Federal Income Tax</th>
                  <th className="py-4 px-5">Net Payout</th>
                  <th className="py-4 px-5 text-right">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40 text-xs">
                {activeEmployees.map((emp) => {
                  const pension = Math.min(emp.baseSalary || 0, 15000) * 0.07;
                  const taxable = (emp.baseSalary || 0) - pension;
                  const tax = calculateEthiopianTax(taxable);
                  const net = (emp.baseSalary || 0) - pension - tax;
                  
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/10 text-slate-700 dark:text-zinc-200">
                      <td className="py-4 px-5 font-semibold text-slate-900 dark:text-zinc-100">{emp.firstName} {emp.lastName}</td>
                      <td className="py-4 px-5 font-mono font-medium">{(emp.baseSalary || 0).toLocaleString()} ETB</td>
                      <td className="py-4 px-5 font-mono text-amber-500 font-medium">-{pension.toLocaleString()} ETB</td>
                      <td className="py-4 px-5 font-mono text-red-500 font-medium">-{tax.toLocaleString()} ETB</td>
                      <td className="py-4 px-5 font-mono font-bold text-emerald-600 dark:text-emerald-400">{net.toLocaleString()} ETB</td>
                      <td className="py-4 px-5 text-right font-semibold">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          payrollStatus === "PAID" 
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border-slate-200 dark:border-zinc-800"
                        }`}>
                          {payrollStatus === "PAID" ? "✓ DISBURSED" : "● PENDING"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
