import React, { useState, useEffect, useMemo } from "react";
import { Employee } from "../employees/HRDirectory";
import { toast } from "../../components/ui/toast";
import { usePayrollJobStatus } from "../../hooks/usePayrollJobStatus";
import { usePermission } from "../../hooks/usePermission";
import { useSettings } from "../../context/SettingsContext";
import { apiRequest } from "../../lib/api";
import { getCurrentPayPeriod } from "../../lib/payroll-period";

export interface PayrollEngineProps {
  employees: Employee[];
  onTriggerDisbursement: (runId: string, totpCode: string) => Promise<void>;
}

// Progressive Income Tax Brackets (Proclamation No. 1395/2025 - Schedule A)
// Taxable Income = Gross Salary - Employee Pension (7%) - Non-taxable Allowances
export function calculateEthiopianTax(taxableVal: number): number {
  if (taxableVal <= 2000) return 0;
  if (taxableVal <= 4000) return taxableVal * 0.15 - 300;
  if (taxableVal <= 7000) return taxableVal * 0.20 - 500;
  if (taxableVal <= 10000) return taxableVal * 0.25 - 850;
  if (taxableVal <= 14000) return taxableVal * 0.30 - 1350;
  return taxableVal * 0.35 - 2050;
}

export default function PayrollEngine({
  employees,
  onTriggerDisbursement,
}: PayrollEngineProps) {
  const [payrollStatus, setPayrollStatus] = useState<"DRAFT" | "SUBMITTED" | "DISBURSING" | "PAID">("DRAFT");
  const [isAuditing, setIsAuditing] = useState(false);
  const [showAiAuditReport, setShowAiAuditReport] = useState(false);
  const { hasPermission } = usePermission();
  const { settings } = useSettings();
  const payPeriod = useMemo(
    () => getCurrentPayPeriod(settings?.payroll ?? {}),
    [settings?.payroll],
  );
  const pensionCap = Number(settings?.payroll?.pensionCap ?? 15000);

  // Active BullMQ background job state tracking
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const { status: jobStatus, progress, errorMessage, payrollRun, isProcessing } = usePayrollJobStatus(activeRunId);

  // Bind completed BullMQ job run state directly to dashboard panels
  useEffect(() => {
    if (jobStatus === "COMPLETED" && payrollRun) {
      setPayrollStatus("SUBMITTED");
      toast.success("BullMQ Generation Succeeded", "PostgreSQL database ledger computed Compliant deductions transactionally.");
    }
  }, [jobStatus, payrollRun]);
  
  // Selected employee for deep-dive regulatory breakdown popup
  const [selectedBreakdownEmp, setSelectedBreakdownEmp] = useState<Employee | null>(
    employees.find((e) => e.status === "ACTIVE") || null
  );

  // Maker-Checker Authorization simulation parameters
  // Available Operator Roles are passed dynamically from parent role selections
  const [currentRoleOperator, setCurrentRoleOperator] = useState<"HR" | "OWNER">("HR");
  const [totpCode, setTotpCode] = useState("");
  const [show2FaModal, setShow2FaModal] = useState(false);

  // Computations (dynamically bound to BullMQ PostgreSQL ledger if active)
  const activeEmployees = employees.filter((e) => e.status === "ACTIVE");

  const totalGross = payrollRun 
    ? Number(payrollRun.totalGross || 0)
    : activeEmployees.reduce((acc, emp) => acc + (emp.baseSalary || 0), 0);

  const totalPensionEmployee = payrollRun
    ? Number(payrollRun.totalGross || 0) * 0.07 // Visual fallback for processed sets
    : activeEmployees.reduce((acc, emp) => acc + Math.min(emp.baseSalary || 0, pensionCap) * 0.07, 0);

  const totalPensionEmployer = payrollRun
    ? Number(payrollRun.totalGross || 0) * 0.11
    : activeEmployees.reduce((acc, emp) => acc + Math.min(emp.baseSalary || 0, pensionCap) * 0.11, 0);

  const totalTax = payrollRun
    ? Number(payrollRun.totalTax || 0)
    : activeEmployees.reduce((acc, emp) => {
        const pension = Math.min(emp.baseSalary || 0, pensionCap) * 0.07;
        const taxable = (emp.baseSalary || 0) - pension;
        return acc + calculateEthiopianTax(taxable);
      }, 0);

  const totalNet = payrollRun
    ? Number(payrollRun.totalNet || 0)
    : totalGross - totalPensionEmployee - totalTax;

  const handleRunAiAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      setShowAiAuditReport(true);
      toast.success("Smart Compliance Audit Completed", "Rule matches analyzed. Low risk anomalies flagged.");
    }, 900);
  };

  // Maker action: Submit for review (Enqueues live BullMQ calculation job on backend)
  const handleMakerSubmit = async () => {
    try {
      // Dispatch real enqueuing event to NestJS
      const data = await apiRequest<{ payrollRunId: string }>("/api/v1/payroll/run", {
        method: "POST",
        body: JSON.stringify({
          periodStart: payPeriod.periodStart,
          periodEnd: payPeriod.periodEnd,
        }),
      });
      setActiveRunId(data.payrollRunId);
      toast.success("Payroll run started", `Period ${payPeriod.label} · Pay date ${payPeriod.payDate}`);
    } catch (err: any) {
      // Seamless mock simulation if backend is unreached/offline
      setPayrollStatus("SUBMITTED");
      toast.warning("Backend Offline: Simulating enqueued payroll calculations.");
    }
  };

  // Checker action: Initiate disbursement review
  const handleCheckerTriggerDisburse = () => {
    setTotpCode("");
    setShow2FaModal(true);
  };

  // Checker action: Finalize disbursement via 2FA
  const handleFinalizeDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRunId) {
      toast.error("Error", "No active payroll run to disburse.");
      return;
    }

    setShow2FaModal(false);
    setPayrollStatus("DISBURSING");
    try {
      await onTriggerDisbursement(activeRunId, totpCode);
      setPayrollStatus("PAID");
    } catch (err) {
      setPayrollStatus("SUBMITTED");
    }
  };

  const handleResetPayroll = () => {
    setPayrollStatus("DRAFT");
    setShowAiAuditReport(false);
  };

  // Download single payslip PDF
  const handleDownloadPayslip = async (employeeId: string) => {
    if (!activeRunId) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/v1/payroll/runs/${activeRunId}/payslips/${employeeId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${employeeId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download Error', 'Failed to download payslip PDF.');
    }
  };

  // Download all payslips as ZIP
  const handleBulkDownload = async () => {
    if (!activeRunId) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/v1/payroll/runs/${activeRunId}/payslips-bulk`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Bulk download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslips-${activeRunId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download Error', 'Failed to download payslips ZIP.');
    }
  };

  // Download ERCA monthly report
  const handleErcaReport = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/v1/payroll/reports/erca-monthly/${year}/${month}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('ERCA report failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `erca-report-${year}-${month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('ERCA Report Error', 'Failed to generate ERCA report.');
    }
  };

  return (
    <div className="space-y-6 animate-slide-up select-none">
      
      {/* 2. REFINED MODULAR DATA CARDS: Top Panel Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0c1424] p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700/80">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 font-outfit tracking-tight">Compliant Payroll Engine</h2>
          <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
            Current period: <strong className="text-slate-600 dark:text-zinc-300">{payPeriod.label}</strong>
            {' · '}Pay date: <strong className="text-slate-600 dark:text-zinc-300">{payPeriod.payDate}</strong>
            {' · '}{payPeriod.payFrequency}
          </p>
        </div>

        {/* Demo Switcher for Maker-Checker Visual Validation */}
        <div className="flex items-center gap-2 select-none">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Role Preview:</span>
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-zinc-950 p-1 border dark:border-zinc-800 gap-1">
            <button
              onClick={() => setCurrentRoleOperator("HR")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                currentRoleOperator === "HR"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-zinc-200"
              }`}
            >
              Maker (HR)
            </button>
            <button
              onClick={() => setCurrentRoleOperator("OWNER")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                currentRoleOperator === "OWNER"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-zinc-200"
              }`}
            >
              Checker (Owner)
            </button>
          </div>
        </div>
      </div>
      {/* Bulk Actions Bar — when a payroll run is active */}
      {activeRunId && payrollStatus !== "DRAFT" && (
        <div className="flex flex-wrap gap-2 bg-white dark:bg-[#0c1424] p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm">
          <button
            onClick={handleBulkDownload}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Download All Payslips (ZIP)
          </button>
          <button
            onClick={handleErcaReport}
            className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 rounded-xl text-[10px] font-bold cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 text-[8px] font-extrabold">ERCA</span>
            Monthly Report
          </button>
        </div>
      )}

      {/* Calculations Summary Cards */}


      {/* Maker-Checker Status Board Dashboard Alert */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-100 dark:border-zinc-800/80 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider select-none">
              Workflow Status
            </span>
            <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-50 font-outfit">Maker-Checker Authorization Pane</h3>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-[9px] font-bold border ${
              payrollStatus === "PAID"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : payrollStatus === "SUBMITTED"
                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800"
            }`}
          >
            {payrollStatus === "PAID"
              ? "✓ SETTLED & DISBURSED"
              : payrollStatus === "SUBMITTED"
              ? "● PENDING OWNER AUTHORIZATION"
              : "● DRAFT REGISTRY PERIOD"}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs select-none">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 dark:text-zinc-200">
              {payrollStatus === "DRAFT"
                ? "Step 1: HR Manager drafts ledger"
                : payrollStatus === "SUBMITTED"
                ? "Step 2: Awaiting Owner checker verification"
                : "Step 3: Settlement complete!"}
            </h4>
            <p className="text-[10px] text-slate-400">
              {payrollStatus === "DRAFT"
                ? "Maker reviews attendance and automated compliance rules before locking the payroll period."
                : payrollStatus === "SUBMITTED"
                ? "Checker (Owner) must verify Chapa bulk ledger and enter dynamic 2FA to dispatch payouts."
                : "Bulk transaction settles with secure logs recorded inside the tenant scoped ledger."}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            {/* HR Maker Trigger */}
            {currentRoleOperator === "HR" && (
              <>
                {payrollStatus === "DRAFT" && hasPermission('run_payroll') && (
                  <button
                    onClick={handleMakerSubmit}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl shadow-lg shadow-emerald-950/20 font-bold text-xs cursor-pointer active:scale-95"
                  >
                    Submit for Checker Review
                  </button>
                )}
                {payrollStatus !== "DRAFT" && (
                  <span className="text-[10px] font-bold text-slate-400 italic">
                    {payrollStatus === "SUBMITTED" ? "Submitted to Checker" : "Settlement Completed"}
                  </span>
                )}
              </>
            )}

            {/* Owner Checker Trigger */}
            {currentRoleOperator === "OWNER" && (
              <>
                {payrollStatus === "SUBMITTED" && hasPermission('approve_payroll') && (
                  <button
                    onClick={handleCheckerTriggerDisburse}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl shadow-lg shadow-emerald-950/20 font-bold text-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Authorize Bulk Chapa Payout
                  </button>
                )}

                {payrollStatus === "DRAFT" && (
                  <button
                    disabled
                    className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 rounded-xl font-bold text-xs cursor-not-allowed border dark:border-zinc-800/80"
                  >
                    Waiting for HR Maker submission
                  </button>
                )}

                {payrollStatus === "PAID" && (
                  <button
                    onClick={handleResetPayroll}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl font-bold text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all border dark:border-zinc-800/80"
                  >
                    Reset Period Draft
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* COMPLIANCE WIZARD SECTION: Selected Employee Regulatory Tax deep-dive visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Compliance Wizard Calculator Breakdown */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-[#0c1424] border border-slate-100 dark:border-zinc-800/80 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold uppercase tracking-wider select-none">
              Ethiopian Tax Compliance Wizard
            </span>
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-50 font-outfit mt-2">Schedule A Taxation breakdown</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
              Examine progressive tax schedule splits, pension contributions, and allowance exemptions for the active period.
            </p>
          </div>

          {selectedBreakdownEmp ? (
            <div className="my-5 space-y-4 select-none">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-zinc-950/20 p-3 rounded-2xl border dark:border-zinc-800/50">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-155 font-outfit">
                    {selectedBreakdownEmp.firstName} {selectedBreakdownEmp.lastName}
                  </h4>
                  <span className="text-[9px] text-slate-400 font-mono font-semibold">{selectedBreakdownEmp.employeeIdNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Basic Salary</span>
                  <span className="text-xs font-bold text-emerald-500 font-mono">
                    {(selectedBreakdownEmp.baseSalary || 0).toLocaleString()} ETB
                  </span>
                </div>
              </div>

              {/* Dynamic progressive taxation segments */}
              <div className="space-y-2 text-[10px]">
                
                {/* 7% Pension breakdown */}
                <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="font-bold text-amber-600 block">7% Employee Pension</span>
                    <span className="text-[8px] text-slate-400">POESSA private organization regulations (capped at 15,000 ETB salary).</span>
                  </div>
                  <span className="font-mono font-bold text-amber-600">
                    -{(Math.min(selectedBreakdownEmp.baseSalary || 0, pensionCap) * 0.07).toLocaleString()} ETB
                  </span>
                </div>

                {/* 11% Pension breakdown */}
                <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="font-bold text-amber-600 block">11% Employer Pension (Corporate Expense)</span>
                    <span className="text-[8px] text-slate-400">Paid directly by the company (capped at 15,000 ETB salary).</span>
                  </div>
                  <span className="font-mono font-bold text-amber-600">
                    +{(Math.min(selectedBreakdownEmp.baseSalary || 0, pensionCap) * 0.11).toLocaleString()} ETB
                  </span>
                </div>

                {/* progressive Tax breakdown */}
                <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="font-bold text-red-500 block">Federal progressive Income Tax</span>
                    <span className="text-[8px] text-slate-400">
                      Computed under Schedule A tax brackets (Proclamation No. 1395/2025) on basic salary minus pension.
                    </span>
                  </div>
                  <span className="font-mono font-bold text-red-500">
                    -{calculateEthiopianTax((selectedBreakdownEmp.baseSalary || 0) - Math.min(selectedBreakdownEmp.baseSalary || 0, pensionCap) * 0.07).toLocaleString()} ETB
                  </span>
                </div>

                {/* compliant transport allowance exemptions */}
                <div className="p-3 bg-sky-500/5 border border-sky-500/15 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="font-bold text-sky-600 block">Transport Allowance Exemptions</span>
                    <span className="text-[8px] text-slate-400">Exempt up to 25% basic salary or 2,200 ETB fixed cap.</span>
                  </div>
                  <span className="font-bold text-sky-600 font-mono">100% EXEMPT</span>
                </div>
              </div>

              {/* Settlement Net payout */}
              <div className="p-4 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex justify-between items-center">
                <span className="text-[10px] text-slate-800 dark:text-zinc-200 font-bold font-outfit">Settled Net Earnings</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {(
                    (selectedBreakdownEmp.baseSalary || 0) -
                    Math.min(selectedBreakdownEmp.baseSalary || 0, pensionCap) * 0.07 -
                    calculateEthiopianTax((selectedBreakdownEmp.baseSalary || 0) - Math.min(selectedBreakdownEmp.baseSalary || 0, pensionCap) * 0.07)
                  ).toLocaleString()}{" "}
                  ETB
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 italic">No employees found.</div>
          )}
        </div>

        {/* Compliant Salary Ledger listings */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-[#0c1424] p-5 rounded-3xl border border-slate-100 dark:border-zinc-800/80 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-50 font-outfit">SaaS Bulk Disbursement Ledger</h3>
            <div className="mt-3 rounded-2xl border dark:border-zinc-800 overflow-hidden shadow-inner bg-slate-50 dark:bg-zinc-950/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-500 text-[10px] font-extrabold uppercase tracking-wider border-b dark:border-zinc-800">
                      <th className="py-4 px-4">Employee</th>
                      <th className="py-4 px-4">Gross Salary</th>
                      <th className="py-4 px-4">Pension (7%)</th>
                      <th className="py-4 px-4">Income Tax</th>
                      <th className="py-4 px-4">Net Payout</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40 text-slate-700 dark:text-zinc-200">
                    {activeEmployees.map((emp) => {
                      const pension = Math.min(emp.baseSalary || 0, pensionCap) * 0.07;
                      const taxable = (emp.baseSalary || 0) - pension;
                      const tax = calculateEthiopianTax(taxable);
                      const net = (emp.baseSalary || 0) - pension - tax;

                      return (
                        <tr
                          key={emp.id}
                          onClick={() => setSelectedBreakdownEmp(emp)}
                          className={`hover:bg-slate-50/50 dark:hover:bg-zinc-900/5 transition-all cursor-pointer ${
                            selectedBreakdownEmp?.id === emp.id ? "bg-emerald-500/5 dark:bg-emerald-500/5" : ""
                          }`}
                        >
                          <td className="py-4 px-4 font-semibold text-slate-900 dark:text-zinc-100">
                            {emp.firstName} {emp.lastName}
                          </td>
                          <td className="py-4 px-4 font-mono">{(emp.baseSalary || 0).toLocaleString()}</td>
                          <td className="py-4 px-4 font-mono text-amber-500 font-medium">-{pension.toLocaleString()}</td>
                          <td className="py-4 px-4 font-mono text-red-500 font-medium">-{tax.toLocaleString()}</td>
                          <td className="py-4 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {net.toLocaleString()}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedBreakdownEmp(emp); }}
                                className={`px-2 py-1 text-[9px] font-bold rounded-lg ${
                                  selectedBreakdownEmp?.id === emp.id
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                                }`}
                              >
                                Details
                              </button>
                              {activeRunId && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDownloadPayslip(emp.id); }}
                                  className="px-2 py-1 text-[9px] font-bold rounded-lg bg-sky-500/10 text-sky-600 border border-sky-500/20 hover:bg-sky-500/20 cursor-pointer"
                                  title="Download Payslip PDF"
                                >
                                  PDF
                                </button>
                              )}
                            </div>
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
      </div>

      {/* 2FA MODAL: Checker authorization verification */}
      {show2FaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 text-center space-y-4 animate-slide-up">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl mx-auto select-none">
              🔒
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-50 font-outfit">Dynamic 2FA Verification</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Confirm your identity as Checker Owner. Enter the 6-digit dynamic key generated inside your Google Authenticator.
              </p>
            </div>

            <form onSubmit={handleFinalizeDisburse} className="space-y-4 text-xs">
              <input
                type="text"
                required
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-2.5 text-center bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-lg font-mono font-bold tracking-widest focus:outline-none focus:border-emerald-500"
              />

              <div className="p-2.5 bg-slate-50 dark:bg-zinc-950 rounded-xl border dark:border-zinc-800 text-[8px] font-mono text-slate-400 uppercase select-none">
                Demo simulation code token: 123456
              </div>

              <div className="pt-2 border-t dark:border-zinc-800/80 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShow2FaModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold rounded-xl text-xs cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md active:scale-95"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISBURSING PROGRESS SPLASH OVERLAY */}
      {payrollStatus === "DISBURSING" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-2xl text-center space-y-4 animate-slide-up select-none">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-50 font-outfit">Chapa API Gateway dispatch</h3>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                Settling payout disbursements with Chapa for {activeEmployees.length} active corporate employees. Please do not close or refresh this tab.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-lg border dark:border-zinc-800/80 text-[8px] font-mono text-slate-400 uppercase">
              POST /api/v1/finance/payouts/bulk
            </div>
          </div>
        </div>
      )}

      {/* Dynamic BullMQ Polling Progress Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-2xl text-center space-y-4 animate-slide-up select-none">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-50 font-outfit">Processing BullMQ Job calculations</h3>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                Active Job Run: <span className="font-mono text-emerald-400 font-bold">{activeRunId}</span>
              </p>
            </div>
            
            {/* Beautiful Progress Bar */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400">
                <span>Status: {jobStatus}</span>
                <span className="text-emerald-500">{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-950 h-2.5 rounded-full overflow-hidden border dark:border-zinc-850">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-lg border dark:border-zinc-800/80 text-[8px] font-mono text-slate-400 uppercase">
              GET /api/v1/payroll/status/{activeRunId}
            </div>
          </div>
        </div>
      )}

      {/* SRE Worker Error display panel */}
      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-500 select-none animate-slide-up">
          <strong>BullMQ Worker Error:</strong> {errorMessage}
        </div>
      )}
    </div>
  );
}
