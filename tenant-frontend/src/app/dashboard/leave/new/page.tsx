"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useDashboard } from "../../../../context/DashboardContext";
import { apiRequest } from "@/lib/api";
import EthiopianDatePicker from "@/components/EthiopianDatePicker";

interface LeaveType {
  id: string;
  name: string;
  code: string;
  maxDaysPerYear: number;
  isPaid: boolean;
}

interface WorkingDaysPreview {
  workingDays: number;
  holidays: { name: string; amharic: string; date: string }[];
}

interface LeaveBalance {
  yearsOfService: number;
  entitlement: number;
  used: number;
  remaining: number;
}

function NewLeaveRequestContent() {
  const { employees } = useDashboard();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Live preview state
  const [preview, setPreview] = useState<WorkingDaysPreview | null>(null);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch leave types
  useEffect(() => {
    (async () => {
      try {
        const types = await apiRequest<LeaveType[]>("/leave/types");
        setLeaveTypes(types);
      } catch {
        setLeaveTypes([]);
      }
    })();
  }, []);

  // Fetch balance when employee changes
  useEffect(() => {
    if (!selectedEmployee) { setBalance(null); return; }
    (async () => {
      try {
        const b = await apiRequest<LeaveBalance>(`/leave/balance/${selectedEmployee}`);
        setBalance(b);
      } catch {
        setBalance(null);
      }
    })();
  }, [selectedEmployee]);

  // Live working days preview
  useEffect(() => {
    if (!startDate || !endDate) { setPreview(null); return; }
    const fetchPreview = async () => {
      setPreviewLoading(true);
      try {
        const s = startDate.toISOString().slice(0, 10);
        const e = endDate.toISOString().slice(0, 10);
        const data = await apiRequest<WorkingDaysPreview>(`/leave/working-days?startDate=${s}&endDate=${e}`);
        setPreview(data);
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    };
    fetchPreview();
  }, [startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedType || !startDate || !endDate) return;

    setSubmitting(true);
    setError("");
    try {
      await apiRequest("/leave/requests", {
        method: "POST",
        body: JSON.stringify({
          employeeId: selectedEmployee,
          leaveTypeId: selectedType,
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
          reason,
        }),
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-12 p-8 bg-white dark:bg-[#0c1424] rounded-3xl border border-emerald-500/20 shadow-xl text-center space-y-4 animate-slide-up">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center text-3xl mx-auto">✓</div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-50 font-outfit">Request Submitted / ፈቃድ ቀርቧል</h3>
        <p className="text-xs text-slate-400">Your leave request has been submitted for approval. You will receive an SMS notification when it is processed.</p>
        <div className="flex gap-3 justify-center pt-2">
          <a href="/dashboard/leave" className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-xl text-xs font-semibold no-underline">← Back to Overview</a>
          <button onClick={() => { setSuccess(false); setStartDate(undefined); setEndDate(undefined); setReason(""); setSelectedType(""); }} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer">Submit Another</button>
        </div>
      </div>
    );
  }

  const selectedLeaveType = leaveTypes.find(t => t.id === selectedType);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-[#0c1424] p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 font-outfit tracking-tight">
            Submit Leave Request / ፈቃድ ጠይቅ
          </h2>
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            Fill out the form below. Working days are calculated excluding weekends and Ethiopian public holidays.
          </p>
        </div>
        <a href="/dashboard/leave" className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-xl text-xs font-semibold no-underline hover:bg-slate-200 dark:hover:bg-zinc-700">← Overview</a>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-3 bg-white dark:bg-[#0c1424] p-6 rounded-3xl border border-slate-100 dark:border-zinc-800/80 shadow-xl space-y-5">
          {/* Employee Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Employee / ሰራተኛ</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-sm cursor-pointer"
            >
              <option value="">Select employee...</option>
              {employees.filter(e => e.status === "ACTIVE").map(emp => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeIdNumber})</option>
              ))}
            </select>
          </div>

          {/* Leave Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Leave Type / ዓይነት ፈቃድ</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-sm cursor-pointer"
            >
              <option value="">Select type...</option>
              {leaveTypes.map(lt => (
                <option key={lt.id} value={lt.id}>
                  {lt.name} {lt.isPaid ? "" : "(Unpaid)"}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <EthiopianDatePicker
              label="Start Date / መጀመሪያ ቀን"
              value={startDate}
              onChange={setStartDate}
              id="leave-start-date"
            />
            <EthiopianDatePicker
              label="End Date / መጨረሻ ቀን"
              value={endDate}
              onChange={setEndDate}
              id="leave-end-date"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Reason / ምክንያት</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the reason for your leave request..."
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-sm min-h-[80px] resize-none"
            />
          </div>

          {/* Sick note upload hint */}
          {selectedLeaveType?.code === "SL" && (
            <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-[10px] text-amber-600">
              <strong>Medical documentation required:</strong> For sick leave exceeding 3 consecutive days, please attach a medical certificate to your HR department.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !selectedEmployee || !selectedType || !startDate || !endDate}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl shadow-lg shadow-emerald-950/20 font-bold text-sm cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? "Submitting..." : "Submit Leave Request / ፈቃድ ላክ"}
          </button>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Working Days Preview */}
          <div className="bg-white dark:bg-[#0c1424] p-5 rounded-3xl border border-slate-100 dark:border-zinc-800/80 shadow-xl space-y-3">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold uppercase tracking-wider">
              Live Preview
            </span>
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-50 font-outfit">Working Days / የስራ ቀናት</h3>

            {previewLoading ? (
              <div className="text-xs text-slate-400 animate-pulse">Calculating...</div>
            ) : preview ? (
              <div className="space-y-3">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-center">
                  <span className="text-3xl font-bold text-emerald-600 font-mono">{preview.workingDays}</span>
                  <span className="block text-[10px] text-slate-400 mt-1">working days requested</span>
                </div>

                {preview.holidays.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Excluded Holidays:</span>
                    {preview.holidays.map((h, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-amber-500/5 rounded-lg border border-amber-500/10 text-[10px]">
                        <span className="text-slate-700 dark:text-zinc-300">{h.name}</span>
                        <span className="text-amber-500 font-mono">{h.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Select start and end dates to preview.</p>
            )}
          </div>

          {/* Balance Card */}
          {balance && selectedLeaveType?.code === "AL" && (
            <div className="bg-white dark:bg-[#0c1424] p-5 rounded-3xl border border-slate-100 dark:border-zinc-800/80 shadow-xl space-y-3">
              <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/25 text-sky-600 text-[9px] font-extrabold uppercase tracking-wider">
                Annual Leave Balance
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Years of Service</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">{balance.yearsOfService}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Entitlement (Proc. 1156/2019)</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">{balance.entitlement} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Used This Year</span>
                  <span className="font-bold text-amber-500">{balance.used} days</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                    style={{ width: `${Math.max(0, (balance.remaining / balance.entitlement) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Remaining</span>
                  <span className={`font-bold ${balance.remaining <= 3 ? "text-red-500" : "text-emerald-600"}`}>
                    {balance.remaining} days
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

export default function NewLeaveRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="h-20 bg-white dark:bg-[#0c1424] border dark:border-zinc-800 rounded-3xl animate-pulse" />
          <div className="h-96 bg-white dark:bg-[#0c1424] border dark:border-zinc-800 rounded-3xl animate-pulse" />
        </div>
      }
    >
      <NewLeaveRequestContent />
    </Suspense>
  );
}
