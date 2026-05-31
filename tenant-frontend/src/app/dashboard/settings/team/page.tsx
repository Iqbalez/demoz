'use client';

import { RequireRole } from '@/components/auth/RequireRole';
import { useState } from 'react';

export default function TeamManagementPage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Mock data for display purposes
  const teamMembers = [
    { id: 1, name: 'Abebe Kebede', email: 'abebe@demoz.com', role: 'OWNER', status: 'ACTIVE' },
    { id: 2, name: 'Martha Tadesse', email: 'martha@demoz.com', role: 'HR', status: 'ACTIVE' },
    { id: 3, name: 'Dawit Hailu', email: 'dawit@demoz.com', role: 'FINANCE', status: 'PENDING_INVITE' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--m-cream)]">Team Management</h1>
          <p className="text-sm text-[var(--m-muted)] mt-1">Manage user access and provision roles via email invitations.</p>
        </div>
        <RequireRole allowedRoles={['SUPER_ADMIN', 'OWNER', 'HR']}>
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="px-4 py-2 bg-[var(--m-primary)] text-white rounded-md text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            + Invite User
          </button>
        </RequireRole>
      </div>

      <div className="mt-8 rounded-lg border border-[var(--m-border)] bg-[var(--m-bg)] overflow-hidden">
        <table className="min-w-full divide-y divide-[var(--m-border)]">
          <thead className="bg-[var(--m-card)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--m-muted)] uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--m-muted)] uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--m-muted)] uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[var(--m-muted)] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--m-border)]">
            {teamMembers.map((member) => (
              <tr key={member.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-[var(--m-cream)]">{member.name}</div>
                      <div className="text-sm text-[var(--m-muted)]">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                    member.status === 'ACTIVE' 
                      ? 'bg-green-900/50 text-green-300 border-green-700/50' 
                      : 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50'
                  }`}>
                    {member.status === 'PENDING_INVITE' ? 'Pending' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <RequireRole allowedRoles={['SUPER_ADMIN', 'OWNER']}>
                    <button className="text-[var(--m-primary)] hover:text-indigo-400">Edit</button>
                  </RequireRole>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--m-card)] rounded-xl border border-[var(--m-border)] p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-semibold text-[var(--m-cream)] mb-4">Invite New User</h2>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsInviteModalOpen(false); }}>
              <div>
                <label className="block text-sm font-medium text-[var(--m-cream)] mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  className="w-full rounded-md border border-[var(--m-border)] bg-[var(--m-bg)] px-3 py-2 text-sm text-[var(--m-cream)] focus:border-[var(--m-primary)] focus:outline-none" 
                  placeholder="employee@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--m-cream)] mb-1">Role</label>
                <select className="w-full rounded-md border border-[var(--m-border)] bg-[var(--m-bg)] px-3 py-2 text-sm text-[var(--m-cream)] focus:border-[var(--m-primary)] focus:outline-none">
                  <option value="HR">HR Manager</option>
                  <option value="FINANCE">Finance / Payroll</option>
                  <option value="MANAGER">Department Manager</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[var(--m-muted)] hover:text-[var(--m-cream)]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[var(--m-primary)] text-white rounded-md text-sm font-medium hover:bg-indigo-600 transition-colors"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
