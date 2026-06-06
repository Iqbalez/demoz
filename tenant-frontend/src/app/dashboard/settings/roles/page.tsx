'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { PERMISSION_GROUPS, PERMISSIONS } from '@/lib/permissions';

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
}

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form state for create/edit
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPerms, setFormPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      const data = await apiRequest<Role[]>('/settings/roles');
      setRoles(data);
    } catch (err: any) {
      toast.error('Failed to load roles', err.message || 'Could not fetch roles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const openCreate = () => {
    setEditingRole(null);
    setFormName('');
    setFormDesc('');
    setFormPerms([]);
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDesc(role.description || '');
    setFormPerms([...role.permissions]);
    setShowModal(true);
  };

  const togglePerm = (perm: string) => {
    setFormPerms(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.warning('Validation', 'Role name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editingRole) {
        // PATCH
        await apiRequest(`/settings/roles/${editingRole.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: formName, description: formDesc, permissions: formPerms }),
        });
        toast.success('Role updated', `${formName} has been updated.`);
      } else {
        // POST
        await apiRequest('/settings/roles', {
          method: 'POST',
          body: JSON.stringify({ name: formName, description: formDesc, permissions: formPerms }),
        });
        toast.success('Role created', `${formName} has been created.`);
      }
      setShowModal(false);
      fetchRoles();
    } catch (err: any) {
      toast.error('Save failed', err.message || 'Could not save role.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`Are you sure you want to delete "${role.name}"? This action cannot be undone.`)) return;
    try {
      await apiRequest(`/settings/roles/${role.id}`, { method: 'DELETE' });
      toast.success('Role deleted', `${role.name} has been removed.`);
      fetchRoles();
    } catch (err: any) {
      toast.error('Delete failed', err.message || 'Could not delete role.');
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

  const systemRoles = roles.filter(r => r.isSystem);
  const customRoles = roles.filter(r => !r.isSystem);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Roles & Permissions</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Manage access control with system and custom roles.</p>
          </div>
          <button
            onClick={openCreate}
            className="px-5 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            + Create Custom Role
          </button>
        </div>

        {/* System Roles */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] px-1">System Roles (Immutable)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemRoles.map(role => (
              <div key={role.id} className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{role.name}</h3>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 tracking-wider">System</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{role.description}</p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                </div>
                <div className="flex flex-wrap gap-1 pt-1 border-t border-[var(--border)]">
                  {role.permissions.slice(0, 4).map(p => (
                    <span key={p} className="text-[10px] font-medium px-1.5 py-0.5 bg-[var(--bg-subtle)] text-[var(--text-muted)] rounded">{p}</span>
                  ))}
                  {role.permissions.length > 4 && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[var(--bg-subtle)] text-[var(--text-muted)] rounded">+{role.permissions.length - 4} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Roles */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] px-1">Custom Roles</h2>
          {customRoles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-white p-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">No custom roles yet. Click "Create Custom Role" to get started.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-subtle)] text-[var(--text-muted)] text-[10px] font-extrabold uppercase tracking-wider border-b border-[var(--border)]">
                    <th className="py-3 px-5">Role Name</th>
                    <th className="py-3 px-5">Description</th>
                    <th className="py-3 px-5">Permissions</th>
                    <th className="py-3 px-5">Users</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-sm">
                  {customRoles.map(role => (
                    <tr key={role.id} className="hover:bg-[var(--bg-subtle)] transition-colors text-[var(--text-primary)]">
                      <td className="py-3 px-5 font-semibold">{role.name}</td>
                      <td className="py-3 px-5 text-[var(--text-muted)] text-xs max-w-[200px] truncate">{role.description || '-'}</td>
                      <td className="py-3 px-5">
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.slice(0, 3).map(p => (
                            <span key={p} className="text-[10px] font-medium px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">{p}</span>
                          ))}
                          {role.permissions.length > 3 && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">+{role.permissions.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] text-xs font-bold">
                          {role.userCount}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right space-x-2">
                        <button
                          onClick={() => openEdit(role)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(role)}
                          disabled={role.userCount > 0}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                            role.userCount > 0
                              ? 'border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed bg-[var(--bg-subtle)]'
                              : 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300'
                          }`}
                          title={role.userCount > 0 ? `${role.userCount} user(s) assigned — reassign before deleting` : 'Delete Role'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 mb-10">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {editingRole ? `Edit "${editingRole.name}"` : 'Create Custom Role'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[var(--bg-subtle)] rounded-lg transition-colors">
                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Role Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Payroll Manager"
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Description</label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Brief description of this role"
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Permission Matrix */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">Permission Matrix</h4>
                  <span className="text-xs text-[var(--text-muted)]">{formPerms.length} / {Object.keys(PERMISSIONS).length} selected</span>
                </div>

                {PERMISSION_GROUPS.map(group => (
                  <div key={group.group} className="rounded-lg border border-[var(--border)] overflow-hidden">
                    <div className="bg-[var(--bg-subtle)] px-4 py-2.5 border-b border-[var(--border)]">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{group.group}</h5>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                      {group.permissions.map(perm => {
                        const isChecked = formPerms.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--bg-subtle)]/50 transition-colors"
                          >
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePerm(perm.id)}
                                className="peer h-4.5 w-4.5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all"
                              />
                              <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--text-primary)]">{perm.label}</p>
                              <p className="text-xs text-[var(--text-muted)]">{perm.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-[var(--border)]">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-subtle)] hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="px-6 py-2 text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
