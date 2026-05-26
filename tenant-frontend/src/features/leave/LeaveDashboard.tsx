"use client";

import React, { useState, useTransition } from "react";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "../../components/ui/toast";

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  maxDaysPerYear: number;
  requiresApproval: boolean;
  isPaid: boolean;
}

export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  rejectionReason: string | null;
  createdAt: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeIdNumber: string;
  };
  leaveType: {
    name: string;
    code: string;
  };
  approvedBy?: {
    email: string;
  } | null;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeIdNumber: string;
}

interface LeaveDashboardProps {
  requests: LeaveRequest[];
  leaveTypes: LeaveType[];
  employees: Employee[];
  onApprove: (id: string) => Promise<{ success: boolean; message: string }>;
  onReject: (id: string, reason: string) => Promise<{ success: boolean; message: string }>;
  onRequestLeave: (dto: {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => Promise<{ success: boolean; message: string }>;
  onSeedTypes: () => Promise<{ success: boolean; message: string }>;
}

export default function LeaveDashboard({
  requests,
  leaveTypes,
  employees,
  onApprove,
  onReject,
  onRequestLeave,
  onSeedTypes,
}: LeaveDashboardProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [rejectionInputId, setRejectionInputId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !selectedLeaveTypeId || !startDate || !endDate) {
      toast.warning("Incomplete Form", "Please fill in all mandatory fields.");
      return;
    }

    startTransition(async () => {
      const result = await onRequestLeave({
        employeeId: selectedEmployeeId,
        leaveTypeId: selectedLeaveTypeId,
        startDate,
        endDate,
        reason,
      });

      if (result.success) {
        toast.success("Leave Requested", result.message);
        setShowRequestForm(false);
        setSelectedEmployeeId("");
        setSelectedLeaveTypeId("");
        setStartDate("");
        setEndDate("");
        setReason("");
      } else {
        toast.error("Request Failed", result.message);
      }
    });
  };

  const handleApprove = async (id: string) => {
    startTransition(async () => {
      const result = await onApprove(id);
      if (result.success) {
        toast.success("Request Approved", result.message);
      } else {
        toast.error("Approval Failed", result.message);
      }
    });
  };

  const handleRejectSubmit = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast.warning("Reason Required", "Please specify a reason for the rejection.");
      return;
    }

    startTransition(async () => {
      const result = await onReject(id, rejectionReason);
      if (result.success) {
        toast.success("Request Rejected", result.message);
        setRejectionInputId(null);
        setRejectionReason("");
      } else {
        toast.error("Rejection Failed", result.message);
      }
    });
  };

  const handleSeedTypes = async () => {
    startTransition(async () => {
      const result = await onSeedTypes();
      if (result.success) {
        toast.success("Standard Calendar Seeded", result.message);
      } else {
        toast.error("Seeding Failed", result.message);
      }
    });
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    if (filterStatus === "ALL") return true;
    return req.status === filterStatus;
  });

  // Calculate card counts
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Leave Management Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0c1424] p-6 rounded-3xl border border-slate-100 dark:border-zinc-800/80 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">Leave & Absence Registry</h2>
          <p className="text-xs text-slate-400">
            Adhere strictly to Ethiopian Labor Proclamation 1156/2019. Track annual leave balances and tiered sick leave limits.
          </p>
        </div>

        <div className="flex gap-2">
          {leaveTypes.length === 0 && (
            <button
              onClick={handleSeedTypes}
              className="px-4.5 py-3 bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700/80 text-slate-700 dark:text-zinc-200 rounded-2xl font-bold text-xs transition-all active:scale-[0.97] cursor-pointer"
            >
              Seed Ethiopian Rules
            </button>
          )}
          <button
            onClick={() => setShowRequestForm((prev) => !prev)}
            className="px-4.5 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-2xl shadow-xl shadow-emerald-950/20 font-bold text-xs transition-all active:scale-[0.97] cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Submit Leave Request
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-[#0c1424] p-5 pr-6 rounded-3xl border border-slate-100 dark:border-zinc-800/80 border-r-[4px] border-r-amber-500 shadow-xl flex items-center gap-4 relative">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">⏳</div>
          <div className="truncate">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 truncate">Pending Review</div>
            <div className="text-2xl font-black text-slate-800 dark:text-zinc-50 font-outfit mt-0.5">{pendingCount}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c1424] p-5 pr-6 rounded-3xl border border-slate-100 dark:border-zinc-800/80 border-r-[4px] border-r-emerald-500 shadow-xl flex items-center gap-4 relative">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl shrink-0">✅</div>
          <div className="truncate">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 truncate">Approved Leaves</div>
            <div className="text-2xl font-black text-slate-800 dark:text-zinc-50 font-outfit mt-0.5">{approvedCount}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0c1424] p-5 pr-6 rounded-3xl border border-slate-100 dark:border-zinc-800/80 border-r-[4px] border-r-rose-500 shadow-xl flex items-center gap-4 relative">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-xl shrink-0">❌</div>
          <div className="truncate">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 truncate">Rejected Leaves</div>
            <div className="text-2xl font-black text-slate-800 dark:text-zinc-50 font-outfit mt-0.5">{rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Onboarding Leave Request Form */}
      {showRequestForm && (
        <form
          onSubmit={handleRequestSubmit}
          className="p-6 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-100 dark:border-zinc-800/80 shadow-xl space-y-4 animate-slide-up"
        >
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800/80 pb-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-50 font-outfit">Log New Employee Absence Request</h3>
            <span className="text-[9px] text-slate-400 font-mono">Ethiopian Labor Standard Gate</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Select Employee</label>
              <select
                required
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl font-semibold focus:outline-none cursor-pointer"
              >
                <option value="">Choose employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeIdNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Leave Category</label>
              <select
                required
                value={selectedLeaveTypeId}
                onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl font-semibold focus:outline-none cursor-pointer"
              >
                <option value="">Choose category...</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.code} - Limit: {type.maxDaysPerYear} days)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl dark:text-zinc-100 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl dark:text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Reason / Remarks</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
              rows={2}
              placeholder="e.g. Medical doctor certified recommendations, family event, annual leave rest..."
            />
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t dark:border-zinc-800/80">
            <button
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold rounded-xl text-xs cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
            >
              Save & Submit Request
            </button>
          </div>
        </form>
      )}

      {/* Main Request Registry Table */}
      <div className="mt-6 bg-white dark:bg-[#0c1424] rounded-3xl border border-slate-100 dark:border-zinc-800/80 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row justify-between items-center gap-3 select-none">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-50 font-outfit">Leave Request Registry</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Filter and review employee leave requests in real-time.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Filter Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Requests</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto relative">
          {isPending && (
            <div className="absolute inset-0 bg-slate-100/10 dark:bg-black/10 backdrop-blur-[0.5px] z-10 flex items-center justify-center" />
          )}

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-zinc-900/10 text-slate-400 dark:text-zinc-500 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800/80">
                <th className="py-4 px-5">Employee</th>
                <th className="py-4 px-5">Leave Type</th>
                <th className="py-4 px-5">Start Date</th>
                <th className="py-4 px-5">End Date</th>
                <th className="py-4 px-5">Working Days</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold italic">
                    No leave requests found in this registry.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/40 dark:hover:bg-zinc-900/5 text-slate-700 dark:text-zinc-200">
                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-900 dark:text-zinc-100">
                        {req.employee.firstName} {req.employee.lastName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        ID: {req.employee.employeeIdNumber}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-medium">{req.leaveType.name}</span>
                      <span className="text-[9px] px-1 rounded bg-slate-100 dark:bg-zinc-800/80 font-mono text-slate-500 ml-1.5 uppercase font-bold">
                        {req.leaveType.code}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-500 dark:text-zinc-400">
                      {new Date(req.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-500 dark:text-zinc-400">
                      {new Date(req.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-4 px-5 font-bold text-slate-800 dark:text-zinc-100">
                      {req.totalDays} days
                    </td>
                    <td className="py-4 px-5">
                      {req.status === "PENDING" && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          ⏳ PENDING REVIEW
                        </span>
                      )}
                      {req.status === "APPROVED" && (
                        <div className="space-y-0.5">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            ✓ APPROVED
                          </span>
                          {req.approvedBy && (
                            <div className="text-[8px] text-slate-400 font-mono font-medium">
                              By: {req.approvedBy.email}
                            </div>
                          )}
                        </div>
                      )}
                      {req.status === "REJECTED" && (
                        <div className="space-y-0.5">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            ✕ REJECTED
                          </span>
                          {req.rejectionReason && (
                            <div className="text-[8px] text-rose-500/80 dark:text-rose-400 font-medium max-w-[150px] truncate" title={req.rejectionReason}>
                              {req.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      {req.status === "PENDING" ? (
                        <div className="flex justify-end gap-1.5">
                          {rejectionInputId === req.id ? (
                            <div className="flex items-center gap-1.5 animate-slide-up">
                              <input
                                type="text"
                                placeholder="Rejection reason..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="px-2 py-1 bg-slate-50 dark:bg-zinc-950 border border-rose-500/30 rounded-lg text-[10px] focus:outline-none dark:text-zinc-100"
                              />
                              <button
                                onClick={() => handleRejectSubmit(req.id)}
                                className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold cursor-pointer active:scale-95"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setRejectionInputId(null)}
                                className="px-2 py-1 bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-lg text-[10px] font-bold cursor-pointer active:scale-95"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleApprove(req.id)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer shadow active:scale-95"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectionInputId(req.id)}
                                className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-lg text-[10px] transition-all cursor-pointer active:scale-95"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No actions</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
