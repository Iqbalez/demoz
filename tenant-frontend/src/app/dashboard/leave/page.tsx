"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useDashboard } from "../../../context/DashboardContext";
import { apiRequest } from "@/lib/api";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason?: string;
  rejectionReason?: string;
  createdAt: string;
  employee: { firstName: string; lastName: string; employeeIdNumber: string };
  leaveType: { name: string; code: string };
  approvedBy?: { email: string };
}

function LeaveOverviewContent() {
  const { employees } = useDashboard();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      const data = await apiRequest<LeaveRequest[]>("/leave/requests");
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    const poll = setInterval(fetchRequests, 20000);
    return () => clearInterval(poll);
  }, [fetchRequests]);

  const handleApprove = async (id: string) => {
    try {
      await apiRequest(`/leave/requests/${id}/approve`, { method: "PUT" });
      await fetchRequests();
    } catch {}
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    try {
      await apiRequest(`/leave/requests/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectingId(null);
      setRejectReason("");
      await fetchRequests();
    } catch {}
  };

  const filtered = filter === "ALL" ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  // Ethiopian date formatter
  const formatEthDate = (gcDateStr: string) => {
    try {
      const d = new Date(gcDateStr);
      const ethLib = require("ethiopian-date");
      const [ey, em, ed] = ethLib.toEthiopian(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const months = ["መስከረም","ጥቅምት","ኅዳር","ታኅሣሥ","ጥር","የካቲት","መጋቢት","ሚያዝያ","ግንቦት","ሰኔ","ሐምሌ","ነሐሴ","ጳጉሜ"];
      return `${months[em - 1]} ${ed}, ${ey}`;
    } catch {
      return new Date(gcDateStr).toLocaleDateString();
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      APPROVED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      REJECTED: "bg-red-500/10 text-red-500 border-red-500/20",
      CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
    };
    return `px-2 py-0.5 rounded-full text-[9px] font-bold border ${map[status] || map.CANCELLED}`;
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0c1424] p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 font-outfit tracking-tight">
            Leave Overview / ፈቃድ አጠቃላይ
          </h2>
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            Manage leave requests, approvals, and balances across your organization.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {pendingCount > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-bold animate-pulse">
              {pendingCount} Pending
            </span>
          )}
          <a
            href="/dashboard/leave/new"
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl shadow-lg shadow-emerald-950/20 font-bold text-xs cursor-pointer active:scale-95 no-underline"
          >
            + Submit Request / ፈቃድ ጠይቅ
          </a>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              filter === tab
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
            }`}
          >
            {tab} {tab === "PENDING" && pendingCount > 0 ? `(${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-[#0c1424] rounded-3xl border border-slate-100 dark:border-zinc-800/80 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading requests...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No leave requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-500 text-[10px] font-extrabold uppercase tracking-wider border-b dark:border-zinc-800">
                  <th className="py-4 px-4">Employee</th>
                  <th className="py-4 px-4">Type / ዓይነት</th>
                  <th className="py-4 px-4">Start (EC)</th>
                  <th className="py-4 px-4">End (EC)</th>
                  <th className="py-4 px-4">Days</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40">
                {filtered.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 transition-all">
                    <td className="py-4 px-4 font-semibold text-slate-900 dark:text-zinc-100">
                      {req.employee.firstName} {req.employee.lastName}
                      <span className="block text-[9px] text-slate-400 font-mono">{req.employee.employeeIdNumber}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-zinc-300">{req.leaveType.name}</td>
                    <td className="py-4 px-4">
                      <span className="text-slate-800 dark:text-zinc-200">{formatEthDate(req.startDate)}</span>
                      <span className="block text-[9px] text-slate-400">{new Date(req.startDate).toLocaleDateString()}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-slate-800 dark:text-zinc-200">{formatEthDate(req.endDate)}</span>
                      <span className="block text-[9px] text-slate-400">{new Date(req.endDate).toLocaleDateString()}</span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-700 dark:text-zinc-300">{req.totalDays}</td>
                    <td className="py-4 px-4"><span className={statusBadge(req.status)}>{req.status}</span></td>
                    <td className="py-4 px-4 text-right">
                      {req.status === "PENDING" && (
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[9px] font-bold cursor-pointer hover:bg-emerald-500 active:scale-95"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectingId(req.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-bold cursor-pointer hover:bg-red-500/20 active:scale-95"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {req.status === "REJECTED" && req.rejectionReason && (
                        <span className="text-[9px] text-red-400 italic">{req.rejectionReason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-4 animate-slide-up">
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-50 font-outfit">Rejection Reason / የውድቅ ምክንያት</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm min-h-[80px] resize-none"
              required
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectingId(null); setRejectReason(""); }}
                className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectingId)}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-red-400 active:scale-95"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeaveOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-20 bg-white dark:bg-[#0c1424] border dark:border-zinc-800 rounded-3xl animate-pulse" />
          <div className="h-60 bg-white dark:bg-[#0c1424] border dark:border-zinc-800 rounded-3xl animate-pulse" />
        </div>
      }
    >
      <LeaveOverviewContent />
    </Suspense>
  );
}
