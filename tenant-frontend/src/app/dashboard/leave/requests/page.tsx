"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "../../../../lib/api";

interface LeaveRequest {
  id: string;
  employee: { firstName: string; lastName: string };
  leaveType: { name: string; code: string };
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: string;
  createdAt: string;
}

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<LeaveRequest[]>("/leave/requests");
        setRequests(Array.isArray(data) ? data : []);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statusColor = (s: string) => {
    switch (s) {
      case "APPROVED": return "bg-green-100 text-green-700 border-green-200";
      case "REJECTED": return "bg-red-100 text-red-700 border-red-200";
      case "CANCELLED": return "bg-gray-100 text-gray-600 border-gray-200";
      default: return "bg-amber-100 text-amber-700 border-amber-200";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Leave Requests</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Review and manage employee leave requests.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-lg bg-[var(--bg-subtle)] animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">No Leave Requests</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            There are no leave requests yet. When employees submit time-off requests, they will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-subtle)]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Employee</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Period</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Days</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-white">
              {requests.map(req => (
                <tr key={req.id}>
                  <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                    {req.employee?.firstName} {req.employee?.lastName}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                    {req.leaveType?.name || "—"}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                    {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{req.totalDays}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
