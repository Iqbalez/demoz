"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "../../../../lib/api";

interface AttendanceLogEntry {
  id: string;
  employee: { firstName: string; lastName: string };
  timestamp: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  source: "USSD" | "WEB_PWA";
  isAnomaly: boolean;
  anomalyReason: string | null;
}

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState<AttendanceLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<AttendanceLogEntry[]>("/api/v1/attendance/logs?limit=50");
        setLogs(Array.isArray(data) ? data : []);
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Attendance Raw Logs</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Immutable audit trail of all clock-in and clock-out events across USSD and Web PWA.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-lg bg-[var(--bg-subtle)] animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">No Attendance Logs</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Attendance logs will appear here when employees clock in via USSD or the web app.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-subtle)]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Employee</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Time</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Source</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Anomaly</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-white">
              {logs.map(log => (
                <tr key={log.id} className={log.isAnomaly ? "bg-red-50" : ""}>
                  <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                    {log.employee?.firstName} {log.employee?.lastName}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                      log.type === "CLOCK_IN" ? "bg-green-100 text-green-700 border-green-200" : "bg-blue-100 text-blue-700 border-blue-200"
                    }`}>
                      {log.type === "CLOCK_IN" ? "Clock In" : "Clock Out"}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{log.source}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm">
                    {log.isAnomaly ? (
                      <span className="text-red-600 font-medium">{log.anomalyReason || "Flagged"}</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
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
