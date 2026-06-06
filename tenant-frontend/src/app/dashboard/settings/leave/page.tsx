'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import { toast } from '@/components/ui/toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface LeavePolicy {
  id: string;
  name: string;
  code: string;
  maxDaysPerYear: number;
  requiresApproval: boolean;
  isPaid: boolean;
  accrualMethod: string;
  carryover: boolean;
  carryoverMax: number;
  genderRestriction: string | null;
  minDaysPerReq: number;
  noticePeriodDays: number;
  requiresDocumentation: boolean;
  isSystem: boolean;
}

export default function LeavePoliciesPage() {
  const { hasPermission } = usePermission();
  const canEdit = hasPermission('edit_leave_policy');

  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'policies' | 'holidays'>('policies');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [form, setForm] = useState<Partial<LeavePolicy>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<LeavePolicy[]>('/settings/leave-policies');
      setPolicies(data);
    } catch (err: any) {
      toast.error('Load Failed', err.message || 'Failed to load leave policies.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (policy?: LeavePolicy) => {
    if (policy) {
      setEditingPolicy(policy);
      setForm({ ...policy });
    } else {
      setEditingPolicy(null);
      setForm({
        name: '',
        code: '',
        maxDaysPerYear: 14,
        requiresApproval: true,
        isPaid: true,
        accrualMethod: 'UPFRONT',
        carryover: false,
        carryoverMax: 0,
        genderRestriction: null,
        minDaysPerReq: 1,
        noticePeriodDays: 0,
        requiresDocumentation: false,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPolicy(null);
    setForm({});
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    
    try {
      // Format numbers
      const payload = {
        ...form,
        maxDaysPerYear: parseInt(form.maxDaysPerYear as any),
        carryoverMax: parseInt(form.carryoverMax as any) || 0,
        minDaysPerReq: parseInt(form.minDaysPerReq as any) || 1,
        noticePeriodDays: parseInt(form.noticePeriodDays as any) || 0,
        genderRestriction: form.genderRestriction === 'NONE' ? null : form.genderRestriction,
      };

      if (editingPolicy) {
        await apiRequest(`/settings/leave-policies/${editingPolicy.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Policy Updated', 'Leave policy was updated successfully.');
      } else {
        await apiRequest('/settings/leave-policies', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Policy Created', 'New leave policy was added successfully.');
      }
      closeModal();
      fetchPolicies();
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save leave policy.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!canEdit || !confirm('Are you sure you want to delete this policy? This may affect historical data.')) return;
    
    try {
      await apiRequest(`/settings/leave-policies/${id}`, { method: 'DELETE' });
      toast.success('Policy Deleted', 'Leave policy was removed.');
      fetchPolicies();
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not delete policy.');
    }
  };

  if (loading && policies.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[var(--bg-subtle)] rounded-lg"></div>
        <div className="h-64 bg-[var(--bg-subtle)] rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Leave & Holidays</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Configure leave types, accrual rules, and public holidays.</p>
      </div>

      <div className="border-b border-[var(--border)]">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('policies')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'policies'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
            }`}
          >
            Leave Policies
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'holidays'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
            }`}
          >
            Public Holidays
          </button>
        </nav>
      </div>

      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Leave Policies</h2>
            {canEdit && (
              <button 
                onClick={() => openModal()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] rounded-lg transition-colors shadow-sm"
              >
                <PlusIcon className="w-4 h-4" />
                New Policy
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {policies.map((policy) => (
              <div key={policy.id} className="bg-white rounded-xl border border-[var(--border)] p-5 shadow-sm flex flex-col hover:border-[var(--brand-primary)] transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                      {policy.name}
                      <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)]">
                        {policy.code}
                      </span>
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      {policy.maxDaysPerYear} days/year • {policy.accrualMethod}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {canEdit && (
                      <button onClick={() => openModal(policy)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--bg-subtle)] rounded-md transition-colors">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    {canEdit && !policy.isSystem && (
                      <button onClick={() => handleDeletePolicy(policy.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)] mt-auto pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${policy.isPaid ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    {policy.isPaid ? 'Paid Leave' : 'Unpaid Leave'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${policy.requiresApproval ? 'bg-amber-500' : 'bg-gray-300'}`}></span>
                    {policy.requiresApproval ? 'Requires Approval' : 'Auto-Approved'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${policy.carryover ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                    {policy.carryover ? `Carryover (Max ${policy.carryoverMax})` : 'No Carryover'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${policy.requiresDocumentation ? 'bg-purple-500' : 'bg-gray-300'}`}></span>
                    {policy.requiresDocumentation ? 'Requires Doc' : 'No Doc Needed'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'holidays' && (
        <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm flex items-center justify-center min-h-[300px]">
          <div className="text-center space-y-3">
            <svg className="w-12 h-12 mx-auto text-[var(--text-muted)] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium text-[var(--text-secondary)]">Holiday Calendar Coming Soon</p>
            <p className="text-xs text-[var(--text-muted)]">Configure National and Custom holidays to map with overtime multipliers.</p>
          </div>
        </div>
      )}

      {/* Leave Policy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-[var(--border)] sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">{editingPolicy ? 'Edit Leave Policy' : 'Create Leave Policy'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSavePolicy} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Policy Name</label>
                  <input required name="name" type="text" value={form.name || ''} onChange={handleFormChange} disabled={editingPolicy?.isSystem} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:bg-gray-100" placeholder="e.g., Annual Leave" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Code (Initials)</label>
                  <input required name="code" type="text" value={form.code || ''} onChange={handleFormChange} disabled={editingPolicy?.isSystem} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:bg-gray-100" placeholder="e.g., AL" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Max Days Per Year</label>
                  <input required name="maxDaysPerYear" type="number" min="0" value={form.maxDaysPerYear || ''} onChange={handleFormChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Accrual Method</label>
                  <select required name="accrualMethod" value={form.accrualMethod || 'UPFRONT'} onChange={handleFormChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                    <option value="UPFRONT">Upfront (Granted on Jan 1)</option>
                    <option value="MONTHLY">Monthly Accrual</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Min Days Per Request</label>
                  <input required name="minDaysPerReq" type="number" min="1" value={form.minDaysPerReq || ''} onChange={handleFormChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Notice Period (Days in advance)</label>
                  <input required name="noticePeriodDays" type="number" min="0" value={form.noticePeriodDays || ''} onChange={handleFormChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Gender Restriction</label>
                  <select name="genderRestriction" value={form.genderRestriction || 'NONE'} onChange={handleFormChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                    <option value="NONE">None (All Genders)</option>
                    <option value="FEMALE">Female Only (e.g. Maternity)</option>
                    <option value="MALE">Male Only (e.g. Paternity)</option>
                  </select>
                </div>
              </div>

              <div className="border border-[var(--border)] rounded-lg p-4 bg-gray-50/50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="isPaid" checked={form.isPaid || false} onChange={handleFormChange} className="rounded text-[var(--brand-primary)] h-5 w-5" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[var(--text-primary)]">Paid Leave</span>
                      <span className="text-xs text-[var(--text-muted)]">Employee receives full salary</span>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="requiresApproval" checked={form.requiresApproval || false} onChange={handleFormChange} className="rounded text-[var(--brand-primary)] h-5 w-5" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[var(--text-primary)]">Requires Approval</span>
                      <span className="text-xs text-[var(--text-muted)]">Must be approved by manager</span>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" name="requiresDocumentation" checked={form.requiresDocumentation || false} onChange={handleFormChange} className="rounded text-[var(--brand-primary)] h-5 w-5" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[var(--text-primary)]">Requires Documentation</span>
                      <span className="text-xs text-[var(--text-muted)]">e.g., Medical certificate for sick leave</span>
                    </div>
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" name="carryover" checked={form.carryover || false} onChange={handleFormChange} className="rounded text-[var(--brand-primary)] h-5 w-5" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[var(--text-primary)]">Allow Carryover</span>
                        <span className="text-xs text-[var(--text-muted)]">Unused days carry to next year</span>
                      </div>
                    </label>
                    {form.carryover && (
                      <div className="ml-8">
                        <input required name="carryoverMax" type="number" min="1" placeholder="Max carryover days" value={form.carryoverMax || ''} onChange={handleFormChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 text-sm font-medium text-white bg-[var(--brand-primary)] rounded-lg hover:bg-[var(--brand-primary-dark)] transition-colors">
                  {saving ? 'Saving...' : (editingPolicy ? 'Save Changes' : 'Create Policy')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
