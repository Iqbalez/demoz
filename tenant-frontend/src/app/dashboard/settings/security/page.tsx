'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { toast } from '@/components/ui/toast';

export default function SecuritySettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const [form, setForm] = useState<any>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Unsaved changes protection
  const { showUnsavedModal, confirmNavigation, cancelNavigation } = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (settings?.security && !isDirty) {
      setForm({
        minPasswordLen: settings.security.minPasswordLen || 8,
        requireUppercase: settings.security.requireUppercase ?? true,
        requireNumber: settings.security.requireNumber ?? true,
        requireSpecial: settings.security.requireSpecial ?? false,
        passwordExpiryDays: settings.security.passwordExpiryDays || '',
        failedLoginLock: settings.security.failedLoginLock || 5,
        sessionTimeoutMins: settings.security.sessionTimeoutMins || 60,
        allowMultiSession: settings.security.allowMultiSession ?? true,
        require2FA: settings.security.require2FA || 'NONE',
      });
    }
  }, [settings, isDirty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm({ ...form, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setForm({ ...form, [name]: value });
    }
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      const payload = {
        ...form,
        minPasswordLen: parseInt(form.minPasswordLen, 10),
        failedLoginLock: parseInt(form.failedLoginLock, 10),
        sessionTimeoutMins: parseInt(form.sessionTimeoutMins, 10),
        passwordExpiryDays: form.passwordExpiryDays ? parseInt(form.passwordExpiryDays, 10) : null,
      };
      await updateSettings('security', payload);
      setIsDirty(false);
      toast.success('Security Saved', 'Security policies updated successfully.');
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save security settings.');
    } finally {
      setSaving(false);
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
    <>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Security</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Enforce password policies, two-factor authentication, and session controls.</p>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          {/* Password Policy */}
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Password Policy</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">These rules apply to all new accounts and password resets.</p>
            </div>
            <div className="p-5 space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Minimum Length</label>
                  <input required name="minPasswordLen" type="number" min="8" max="32" value={form.minPasswordLen} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Password Expiry (Days)</label>
                  <input name="passwordExpiryDays" type="number" min="1" placeholder="Never expire" value={form.passwordExpiryDays} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none placeholder-[var(--text-muted)]" />
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input type="checkbox" name="requireUppercase" checked={form.requireUppercase} onChange={handleChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all" />
                    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">Require Uppercase Letter</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input type="checkbox" name="requireNumber" checked={form.requireNumber} onChange={handleChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all" />
                    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">Require Number</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input type="checkbox" name="requireSpecial" checked={form.requireSpecial} onChange={handleChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all" />
                    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">Require Special Character</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Session & MFA */}
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Session & Access Control</h3>
            </div>
            <div className="p-5 space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Session Timeout (Minutes)</label>
                  <input required name="sessionTimeoutMins" type="number" min="5" max="1440" value={form.sessionTimeoutMins} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Failed Login Lockout (Attempts)</label>
                  <input required name="failedLoginLock" type="number" min="3" max="20" value={form.failedLoginLock} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Require 2-Factor Authentication (2FA)</label>
                  <select name="require2FA" value={form.require2FA} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none">
                    <option value="NONE">Not Required</option>
                    <option value="ADMINS">Admins & Managers Only</option>
                    <option value="ALL">All Users</option>
                  </select>
                </div>
                
                <div className="pt-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input type="checkbox" name="allowMultiSession" checked={form.allowMultiSession} onChange={handleChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all" />
                      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">Allow Multiple Concurrent Sessions</p>
                    </div>
                  </label>
                </div>
              </div>

            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              disabled={!isDirty || saving}
              onClick={() => {
                setForm(settings?.security || {});
                setIsDirty(false);
              }}
              className="px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-subtle)] hover:bg-[var(--border)] rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!isDirty || saving}
              className="px-6 py-2 text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Security Policies'}
            </button>
          </div>
        </form>
      </div>

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Unsaved Changes</h3>
            <p className="text-sm text-gray-600">You have unsaved changes to your security settings. Are you sure you want to leave this page?</p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={cancelNavigation} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Stay on Page
              </button>
              <button onClick={confirmNavigation} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
