"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "../../../../lib/api";

interface ExitedEmployee {
  id: string;
  firstName: string;
  lastName: string;
  employeeIdNumber: string;
  phoneNumber: string;
  status: string;
  hireDate: string;
  updatedAt?: string;
}

export default function ExitsPage() {
  const [employees, setEmployees] = useState<ExitedEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<{ data: ExitedEmployee[] }>("/employees?status=TERMINATED&limit=100");
        setEmployees(data?.data || []);
      } catch {
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Employee Exits</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          View employees who have been terminated or exited the company.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-lg bg-[var(--bg-subtle)] animate-pulse" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">No Exited Employees</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            There are no terminated employees in the system. When an employee exits, they will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-subtle)]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Employee</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">ID</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Phone</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-white">
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{emp.firstName} {emp.lastName}</p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{emp.employeeIdNumber}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{emp.phoneNumber}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                      {emp.status}
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
