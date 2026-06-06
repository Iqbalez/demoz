'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { usePermission } from '@/hooks/usePermission';
import { toast } from '@/components/ui/toast';

export default function NotificationsSettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const { hasPermission } = usePermission();
  const canEdit = hasPermission('manage_settings');
  
  const [form, setForm] = useState<any>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const { showUnsavedModal, confirmNavigation, cancelNavigation } = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (settings?.notifications && !isDirty) {
      setForm({
        payrollReminderDays: settings.notifications.payrollReminderDays || 3,
        leaveApprovalAlert: settings.notifications.leaveApprovalAlert ?? true,
        attendanceAnomalyAlert: settings.notifications.attendanceAnomalyAlert ?? true,
        taxRemittanceAlert: settings.notifications.taxRemittanceAlert ?? true,
      });
    }
  }, [settings, isDirty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
    }
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      await updateSettings('notifications', {
        ...form,
        payrollReminderDays: parseInt(form.payrollReminderDays, 10),
      });
      setIsDirty(false);
      toast.success('Settings Saved', 'Notification preferences updated successfully.');
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save notification settings.');
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
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Notifications & Alerts</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Configure automated email and push notifications for admins and managers.</p>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Payroll & Compliance</h3>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Payroll Reminder (Days before)</label>
                  <input disabled={!canEdit} required name="payrollReminderDays" type="number" step="1" min="1" max="15" value={form.payrollReminderDays} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none disabled:bg-gray-100" />
                  <p className="text-xs text-[var(--text-muted)]">Remind admins to run payroll before the cycle ends.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input disabled={!canEdit} type="checkbox" name="taxRemittanceAlert" checked={form.taxRemittanceAlert} onChange={handleChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all disabled:opacity-50" />
                    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">Tax & Pension Remittance Alerts</p>
                    <p className="text-xs text-[var(--text-muted)]">Send monthly reminders to file ERCA and Pension returns.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Operational Alerts</h3>
            </div>
            <div className="p-5 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input disabled={!canEdit} type="checkbox" name="leaveApprovalAlert" checked={form.leaveApprovalAlert} onChange={handleChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all disabled:opacity-50" />
                  <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">Leave Request Alerts</p>
                  <p className="text-xs text-[var(--text-muted)]">Notify department managers immediately when an employee requests leave.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input disabled={!canEdit} type="checkbox" name="attendanceAnomalyAlert" checked={form.attendanceAnomalyAlert} onChange={handleChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all disabled:opacity-50" />
                  <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">Attendance Anomaly Alerts</p>
                  <p className="text-xs text-[var(--text-muted)]">Send daily summaries of missing punch-outs or severe lateness.</p>
                </div>
              </label>
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                disabled={!isDirty || saving}
                onClick={() => {
                  setForm(settings?.notifications || {});
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
                {saving ? 'Saving...' : 'Save Notification Settings'}
              </button>
            </div>
          )}
        </form>
      </div>

      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Unsaved Changes</h3>
            <p className="text-sm text-gray-600">You have unsaved changes to your notification settings. Are you sure you want to leave this page?</p>
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
