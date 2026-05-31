"use client";

import React, { useState, useEffect, useMemo } from "react";
import { apiRequest } from "../../../lib/api";

interface OrgEmployee {
  id: string;
  firstName: string;
  lastName: string;
  employeeIdNumber: string;
  department?: { name: string } | null;
  status: string;
  managerId?: string | null;
}

interface TreeNode {
  employee: OrgEmployee;
  children: TreeNode[];
}

function buildTree(employees: OrgEmployee[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  employees.forEach(e => map.set(e.id, { employee: e, children: [] }));

  employees.forEach(e => {
    const node = map.get(e.id)!;
    if (e.managerId && map.has(e.managerId)) {
      map.get(e.managerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function OrgCard({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const emp = node.employee;
  const initials = `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase();
  const deptName = emp.department?.name || "General";

  const colorMap: Record<number, string> = {
    0: "border-blue-300 bg-blue-50",
    1: "border-green-300 bg-green-50",
    2: "border-purple-300 bg-purple-50",
    3: "border-amber-300 bg-amber-50",
  };
  const cardColor = colorMap[depth % 4] || "border-gray-300 bg-gray-50";

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        className={`relative rounded-xl border-2 ${cardColor} px-5 py-4 min-w-[180px] max-w-[220px] text-center cursor-pointer transition-shadow hover:shadow-lg`}
        onClick={() => node.children.length > 0 && setExpanded(p => !p)}
      >
        <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-2">
          {deptName}
        </p>
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-full bg-[var(--brand-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{emp.firstName} {emp.lastName}</p>
            <p className="text-[11px] text-[var(--text-muted)] truncate">{emp.employeeIdNumber}</p>
          </div>
        </div>

        {node.children.length > 0 && (
          <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-[var(--text-muted)]">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>{node.children.length} report{node.children.length !== 1 ? "s" : ""}</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>

      {/* Connector line down */}
      {expanded && node.children.length > 0 && (
        <>
          <div className="w-px h-6 bg-[var(--border)]" />
          {/* Horizontal connector */}
          <div className="relative flex items-start">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-[var(--border)]"
                style={{
                  left: `${100 / (node.children.length * 2)}%`,
                  right: `${100 / (node.children.length * 2)}%`,
                }}
              />
            )}
            <div className="flex gap-6">
              {node.children.map(child => (
                <div key={child.employee.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-[var(--border)]" />
                  <OrgCard node={child} depth={depth + 1} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgStructurePage() {
  const [employees, setEmployees] = useState<OrgEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<{ data: OrgEmployee[] }>("/employees?limit=500");
        setEmployees(data?.data || []);
      } catch {
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department?.name) set.add(e.department.name);
    });
    return Array.from(set).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter(e => e.status === "ACTIVE");
    if (deptFilter) {
      filtered = filtered.filter(e => e.department?.name === deptFilter);
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      filtered = filtered.filter(e =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.employeeIdNumber.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [employees, deptFilter, searchFilter]);

  const tree = useMemo(() => buildTree(filteredEmployees), [filteredEmployees]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Org. Chart</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {employees.filter(e => e.status === "ACTIVE").length} Employees
            {employees.length > 0 && (
              <>
                {" · "}
                <span className="inline-flex -space-x-1.5">
                  {employees.slice(0, 5).map(e => (
                    <span key={e.id} className="inline-flex w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white text-[9px] font-bold items-center justify-center border-2 border-white">
                      {e.firstName[0]}{e.lastName[0]}
                    </span>
                  ))}
                  {employees.length > 5 && (
                    <span className="inline-flex w-6 h-6 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] text-[9px] font-bold items-center justify-center border-2 border-white">
                      +{employees.length - 5}
                    </span>
                  )}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Department</label>
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="relative ml-auto">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search Employee..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="pl-9 pr-4 py-1.5 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none w-56"
          />
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--brand-primary)]" />
        </div>
      ) : tree.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">No Employees Found</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Onboard employees from the Employees section to see them here. Assign managers to build the hierarchy.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-8">
          <div className="inline-flex flex-col items-center min-w-full py-6">
            {tree.map(root => (
              <OrgCard key={root.employee.id} node={root} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
