"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "../../../lib/api";
import Link from "next/link";

interface PayrollRun {
  id: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  totalGross: number;
  totalNet: number;
  totalTax: number;
  createdAt: string;
}

const REPORT_CARDS = [
  {
    title: "Basic Salary Report",
    description: "Details employees' basic salary earned before any allowances or deductions.",
    icon: "💰",
    category: "payroll",
  },
  {
    title: "Gross Salary Report",
    description: "Total compensation including base salary, transport, position allowances, and overtime.",
    icon: "📊",
    category: "payroll",
  },
  {
    title: "Net Pay Report",
    description: "The amount employees take home after all deductions — income tax, pension, and other withholdings.",
    icon: "💵",
    category: "payroll",
  },
  {
    title: "PAYE Report",
    description: "Monthly Pay-As-You-Earn income tax report as per Ethiopian Revenue and Customs (ERCA) brackets.",
    icon: "🏛️",
    category: "tax",
  },
  {
    title: "Pension Report",
    description: "Monthly pension contributions report — 7% employee and 11% employer per POESSA regulations.",
    icon: "🏦",
    category: "tax",
  },
  {
    title: "Payslips Report",
    description: "Individual employee payslips showing the complete breakdown of earnings and deductions.",
    icon: "📄",
    category: "payroll",
  },
  {
    title: "Muster Roll",
    description: "A summary of payments and salaries to all employees — including gross, deductions, and net payments.",
    icon: "📋",
    category: "payroll",
  },
  {
    title: "Allowances Report",
    description: "Breakdown of transport and position allowances given to employees on a regular basis.",
    icon: "🎁",
    category: "payroll",
  },
  {
    title: "Attendance Report",
    description: "Aggregate attendance statistics — present, absent, late, and anomaly rates per employee.",
    icon: "⏱️",
    category: "attendance",
  },
  {
    title: "Lateness Report",
    description: "Identifies employees who consistently clock in late, with frequency and duration analytics.",
    icon: "⚠️",
    category: "attendance",
  },
  {
    title: "Leave Report",
    description: "Details employee leaves accrued, used, and remaining balance per leave type.",
    icon: "🏖️",
    category: "leave",
  },
  {
    title: "Exits Report",
    description: "Details individuals who have left employment — termination dates, reasons, and final settlements.",
    icon: "🚪",
    category: "hr",
  },
];

export default function ReportsPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<{ runs?: PayrollRun[] }>("/api/v1/payroll/runs");
        setRuns(Array.isArray(data?.runs) ? data.runs : Array.isArray(data) ? data as any : []);
      } catch {
        setRuns([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = REPORT_CARDS.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  const latestRun = runs.length > 0 ? runs[0] : null;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Reports</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Generate and download payroll, tax, attendance, and HR reports.
          </p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none w-64"
          />
        </div>
      </div>

      {/* Latest Payroll Summary */}
      {latestRun && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Latest Payroll Run</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Period</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {new Date(latestRun.periodStart).toLocaleDateString()} — {new Date(latestRun.periodEnd).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Gross Total</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {Number(latestRun.totalGross).toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Net Total</p>
              <p className="text-sm font-semibold text-green-600">
                {Number(latestRun.totalNet).toLocaleString("en-ET", { style: "currency", currency: "ETB" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Status</p>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                latestRun.status === "COMPLETED" || latestRun.status === "PAID"
                  ? "bg-green-100 text-green-700 border-green-200"
                  : latestRun.status === "FAILED"
                  ? "bg-red-100 text-red-700 border-red-200"
                  : "bg-amber-100 text-amber-700 border-amber-200"
              }`}>
                {latestRun.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(card => (
          <div
            key={card.title}
            className="group rounded-xl border border-[var(--border)] bg-white p-5 hover:border-[var(--brand-primary)] hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">{card.icon}</span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                  {card.title}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-3">
                  {card.description}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-medium text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2 py-0.5 rounded">
                {card.category}
              </span>
              <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-[var(--text-muted)]">
          No reports match &quot;{search}&quot;.
        </div>
      )}
    </div>
  );
}
