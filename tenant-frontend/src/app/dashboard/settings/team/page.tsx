'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RequireRole } from '@/components/auth/RequireRole';
import { apiRequest } from '@/lib/api';
import { toast } from '@/components/ui/toast';

interface TeamMember {
  id: string;
  email: string;
  role: string | null;
  status: string;
  customRoleId?: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  customRoleId?: string | null;
}

interface CustomRole {
  id: string;
  name: string;
  description?: string;
}

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvite[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('HR');
  const [inviteCustomRoleId, setInviteCustomRoleId] = useState('');
  const [sending, setSending] = useState(false);

  const loadTeam = useCallback(async () => {
    try {
      const data = await apiRequest<{ members: TeamMember[]; pendingInvitations: PendingInvite[] }>('/workspace/team');
      setMembers(data?.members || []);
      setInvitations(data?.pendingInvitations || []);
    } catch {
      setMembers([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    try {
      const roles = await apiRequest<CustomRole[]>('/settings/roles');
      setCustomRoles(roles || []);
    } catch {
      setCustomRoles([]);
    }
  }, []);

  useEffect(() => {
    loadTeam();
    loadRoles();
  }, [loadTeam, loadRoles]);

  const handleInvite = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setSending(true);
    try {
      await apiRequest('/invites', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          ...(inviteCustomRoleId ? { customRoleId: inviteCustomRoleId } : {}),
        }),
      });
      toast.success('Invite sent', `Invitation sent to ${inviteEmail}.`);
      setInviteEmail('');
      setInviteCustomRoleId('');
      setIsInviteModalOpen(false);
      loadTeam();
    } catch (err: any) {
      toast.error('Invite failed', err?.message || 'Could not send invitation.');
    } finally {
      setSending(false);
    }
  }, [inviteEmail, inviteRole, inviteCustomRoleId, loadTeam]);

  const allTeam = [
    ...members.map((m) => ({ id: m.id, email: m.email, role: m.role || '—', status: m.status })),
    ...invitations.map((i) => ({ id: i.id, email: i.email, role: i.role, status: i.status })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Team Management</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Invite dashboard users and assign company roles created in Settings → Roles &amp; Permissions.
          </p>
        </div>
        <RequireRole allowedRoles={['SUPER_ADMIN', 'OWNER', 'HR']}>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            + Invite User
          </button>
        </RequireRole>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-[var(--bg-subtle)] animate-pulse" />
          ))}
        </div>
      ) : allTeam.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-12 text-center">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">No Team Members</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Invite users to your workspace to manage HR, payroll, and finance with custom permissions.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--bg-subtle)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-white">
              {allTeam.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] text-white text-xs font-bold flex items-center justify-center">
                        {member.email[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{member.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                      member.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>
                      {member.status === 'PENDING_INVITE' ? 'Pending' : member.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl border border-[var(--border)] p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Invite New User</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                  placeholder="colleague@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Base access level</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                >
                  <option value="HR">HR Manager</option>
                  <option value="EMPLOYEE">Employee (limited)</option>
                </select>
                <p className="text-xs text-[var(--text-muted)] mt-1">Owners are created at signup. Use custom roles below for Finance, Payroll, etc.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Company role (permissions)</label>
                <select
                  value={inviteCustomRoleId}
                  onChange={(e) => setInviteCustomRoleId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                >
                  <option value="">— No custom role (use base access only) —</option>
                  {customRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
                {customRoles.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Create roles first under Settings → Roles &amp; Permissions.</p>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
