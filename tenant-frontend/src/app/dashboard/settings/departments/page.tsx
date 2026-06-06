'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { useDashboard } from '@/context/DashboardContext';

interface Department {
  id: string;
  name: string;
  branch: { name: string };
  parent?: { name: string } | null;
  manager?: { firstName: string; lastName: string } | null;
  _count: { employees: number };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

export default function DepartmentsSettingsPage() {
  const { branches } = useDashboard();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add state
  const [newDeptName, setNewDeptName] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchDepartments(),
      fetchEmployees()
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const fetchDepartments = async () => {
    try {
      const data = await apiRequest<Department[]>('/departments');
      setDepartments(data);
    } catch (err: any) {
      toast.error('Failed to load', err.message || 'Could not load departments.');
    }
  };

  const fetchEmployees = async () => {
    try {
      // Assuming a generic /employees endpoint exists that returns the list
      const res = await apiRequest<any>('/employees?limit=1000').catch(() => ({ data: [] }));
      setEmployees(res.data || []);
    } catch (err) {
      // Ignore failure, just empty dropdown
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    if (!selectedBranchId) {
      toast.warning('No branch selected', 'Please select a branch first.');
      return;
    }

    setIsAdding(true);
    try {
      const payload: any = { 
        name: newDeptName, 
        branchId: selectedBranchId 
      };
      if (selectedParentId) payload.parentId = selectedParentId;
      if (selectedManagerId) payload.managerId = selectedManagerId;

      await apiRequest('/departments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Department added', `Successfully created ${newDeptName}.`);
      setNewDeptName('');
      setSelectedParentId('');
      setSelectedManagerId('');
      fetchDepartments();
    } catch (err: any) {
      toast.error('Add failed', err.message || 'Could not add department.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string, employeeCount: number) => {
    if (employeeCount > 0) {
      toast.warning('Cannot delete', 'Reassign employees before deleting this department.');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await apiRequest(`/departments/${id}`, { method: 'DELETE' });
      toast.success('Department deleted', `${name} has been removed.`);
      fetchDepartments();
    } catch (err: any) {
      toast.error('Delete failed', err.message || 'Could not delete department.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[var(--bg-subtle)] rounded-lg"></div>
        <div className="h-64 bg-[var(--bg-subtle)] rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Departments & Branches</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage organizational hierarchy, divisions, and assign department heads.</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm space-y-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add New Department</h3>
        <form onSubmit={handleAddDepartment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Branch *</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Department Name *</label>
              <input
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Engineering"
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Parent Dept (Optional)</label>
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none"
              >
                <option value="">None (Top Level)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Dept Head (Optional)</label>
              <select
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none"
              >
                <option value="">Unassigned</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-[var(--border)]">
            <button
              type="submit"
              disabled={isAdding || !newDeptName.trim()}
              className="px-6 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isAdding ? 'Adding…' : 'Add Department'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-[var(--bg-subtle)] text-[var(--text-muted)] text-[10px] font-extrabold uppercase tracking-wider border-b border-[var(--border)]">
              <th className="py-3 px-5">Department Name</th>
              <th className="py-3 px-5">Parent</th>
              <th className="py-3 px-5">Branch</th>
              <th className="py-3 px-5">Department Head</th>
              <th className="py-3 px-5">Employees</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] text-sm">
            {departments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                  No departments found. Create one above.
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-[var(--bg-subtle)] transition-colors text-[var(--text-primary)]">
                  <td className="py-3 px-5 font-medium">{dept.name}</td>
                  <td className="py-3 px-5 text-[var(--text-muted)]">{dept.parent?.name || '-'}</td>
                  <td className="py-3 px-5 text-[var(--text-secondary)]">{dept.branch.name}</td>
                  <td className="py-3 px-5">
                    {dept.manager ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
                        {dept.manager.firstName} {dept.manager.lastName}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)] italic text-xs">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-5">
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] text-xs font-bold">
                      {dept._count.employees}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button
                      onClick={() => handleDelete(dept.id, dept.name, dept._count.employees)}
                      disabled={dept._count.employees > 0}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        dept._count.employees > 0
                          ? 'border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed bg-[var(--bg-subtle)]'
                          : 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 active:scale-95 cursor-pointer'
                      }`}
                      title={dept._count.employees > 0 ? "Cannot delete department with assigned employees" : "Delete Department"}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
