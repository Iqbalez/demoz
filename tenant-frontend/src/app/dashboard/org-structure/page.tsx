'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '@/lib/api';

interface EmployeeNode {
  id: string;
  firstName: string;
  lastName: string;
  employeeIdNumber: string;
  department: { name: string; branchId: string };
  manager?: { id: string; firstName: string; lastName: string } | null;
  managerId?: string | null;
  baseSalary?: number;
  children?: EmployeeNode[];
}

export default function OrgStructurePage() {
  const [employees, setEmployees] = useState<EmployeeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiRequest<{ data: EmployeeNode[] }>('/employees?page=1&limit=1000');
        setEmployees(res.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load employees');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { tree, orphans } = useMemo(() => {
    const nodeMap = new Map<string, EmployeeNode>();
    const roots: EmployeeNode[] = [];
    const orphanList: EmployeeNode[] = [];

    // Initialize nodes
    employees.forEach(emp => {
      nodeMap.set(emp.id, { ...emp, children: [] });
    });

    // Build tree
    employees.forEach(emp => {
      const node = nodeMap.get(emp.id)!;
      // Use managerId if it exists, otherwise fall back to manager.id
      const mId = emp.managerId || emp.manager?.id;
      
      if (mId) {
        const parent = nodeMap.get(mId);
        if (parent) {
          parent.children!.push(node);
        } else {
          // Manager not found in list, consider as root/orphan
          orphanList.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return { tree: roots, orphans: orphanList };
  }, [employees]);

  const renderNode = (node: EmployeeNode) => {
    return (
      <div key={node.id} className="flex flex-col items-center">
        <div className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-sm min-w-[200px] relative z-10 flex flex-col items-center gap-2 transition-transform hover:-translate-y-1 hover:shadow-md">
          <div className="w-12 h-12 rounded-full bg-[var(--brand-primary)] text-white font-bold flex items-center justify-center text-lg">
            {node.firstName[0]}{node.lastName[0]}
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">{node.firstName} {node.lastName}</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{node.employeeIdNumber}</p>
            <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] text-[10px] font-medium text-[var(--text-secondary)]">
              {node.department?.name || 'General'}
            </span>
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="relative flex flex-col items-center mt-6">
            {/* Vertical line down from parent */}
            <div className="absolute top-[-24px] w-px h-6 bg-[var(--border)]"></div>
            
            {/* Horizontal line connecting children */}
            {node.children.length > 1 && (
              <div className="absolute top-0 h-px bg-[var(--border)]" style={{
                left: `calc(50% / ${node.children.length} - 5px)`, // Rough approximation for CSS layout
                right: `calc(50% / ${node.children.length} - 5px)`
              }}></div>
            )}
            
            <div className="flex justify-center gap-8 pt-6 relative">
              {/* Horizontal line connector */}
              {node.children.length > 1 && (
                <div className="absolute top-0 left-[10%] right-[10%] h-px bg-[var(--border)]"></div>
              )}
              {node.children.map((child, idx) => (
                <div key={child.id} className="relative">
                  {/* Vertical line down to child */}
                  <div className="absolute top-[-24px] left-1/2 w-px h-6 bg-[var(--border)] -translate-x-1/2"></div>
                  {renderNode(child)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-r-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading organizational structure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-red-600">
        <h3 className="font-semibold">Error</h3>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Organizational Structure</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Visual representation of your company hierarchy and reporting lines.</p>
      </div>

      <div className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl p-8 overflow-auto min-h-[60vh]">
        {tree.length === 0 && orphans.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[var(--text-muted)] text-sm">
            No employees found in this workspace.
          </div>
        ) : (
          <div className="flex flex-col items-center justify-start min-w-max pb-12">
            <div className="flex justify-center gap-16">
              {tree.map(root => renderNode(root))}
            </div>
            
            {orphans.length > 0 && (
              <div className="mt-16 pt-8 border-t border-[var(--border)] w-full">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-6 text-center">Unassigned / Orphans</h3>
                <div className="flex flex-wrap justify-center gap-8">
                  {orphans.map(orphan => renderNode(orphan))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
