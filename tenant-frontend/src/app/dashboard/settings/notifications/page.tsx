'use client';

import React, { useState, useEffect } from 'react';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { usePermission } from '@/hooks/usePermission';
import { toast } from '@/components/ui/toast';
import { apiRequest } from '@/lib/api';

type Tab = 'company' | 'personal';

interface CompanyForm {
  payrollReminderDays: number;
  leaveApprovalAlert: boolean;
  attendanceAnomalyAlert: boolean;
  taxRemittanceAlert: boolean;
}

interface PersonalForm {
  payrollReminderDays: number;
  leaveApprovalAlert: boolean;
  attendanceAnomalyAlert: boolean;
  taxRemittanceAlert: boolean;
  subscriptionRenewalAlert: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export default function NotificationsSettingsPage() {
  const { hasPermission } = usePermission();
  const canEdit = hasPermission('manage_settings');

  const [activeTab, setActiveTab] = useState<Tab>('company');
  const [companyForm, setCompanyForm] = useState<CompanyForm>({
    payrollReminderDays: 3,
    leaveApprovalAlert: true,
    attendanceAnomalyAlert: true,
    taxRemittanceAlert: true,
  });
  const [personalForm, setPersonalForm] = useState<PersonalForm>({
    payrollReminderDays: 3,
    leaveApprovalAlert: true,
    attendanceAnomalyAlert: true,
    taxRemittanceAlert: true,
    subscriptionRenewalAlert: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const { showUnsavedModal, confirmNavigation, cancelNavigation } = useUnsavedChanges(isDirty);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiRequest<{ company: CompanyForm; preferences: PersonalForm }>('/settings/notifications');
        setCompanyForm({
          payrollReminderDays: res.company.payrollReminderDays ?? 3,
          leaveApprovalAlert: res.company.leaveApprovalAlert ?? true,
          attendanceAnomalyAlert: res.company.attendanceAnomalyAlert ?? true,
          taxRemittanceAlert: res.company.taxRemittanceAlert ?? true,
        });
        setPersonalForm({
          payrollReminderDays: res.preferences.payrollReminderDays ?? 3,
          leaveApprovalAlert: res.preferences.leaveApprovalAlert ?? true,
          attendanceAnomalyAlert: res.preferences.attendanceAnomalyAlert ?? true,
          taxRemittanceAlert: res.preferences.taxRemittanceAlert ?? true,
          subscriptionRenewalAlert: res.preferences.subscriptionRenewalAlert ?? true,
          quietHoursEnabled: res.preferences.quietHoursEnabled ?? false,
          quietHoursStart: res.preferences.quietHoursStart || '22:00',
          quietHoursEnd: res.preferences.quietHoursEnd || '07:00',
        });
      } catch (err: any) {
        toast.error('Load Failed', err.message || 'Could not load notification settings.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setCompanyForm({
      ...companyForm,
      [name]: type === 'checkbox' ? checked : value,
    });
    setIsDirty(true);
  };

  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setPersonalForm({
      ...personalForm,
      [name]: type === 'checkbox' ? checked : value,
    });
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (activeTab === 'company') {
        if (!canEdit) return;
        await apiRequest('/settings/notifications', {
          method: 'PATCH',
          body: JSON.stringify({
            ...companyForm,
            payrollReminderDays: parseInt(String(companyForm.payrollReminderDays), 10),
          }),
        });
        toast.success('Settings Saved', 'Company notification defaults updated.');
      } else {
        await apiRequest('/settings/notifications/me', {
          method: 'PATCH',
          body: JSON.stringify({
            ...personalForm,
            payrollReminderDays: parseInt(String(personalForm.payrollReminderDays), 10),
          }),
        });
        toast.success('Preferences Saved', 'Your personal notification preferences updated.');
      }
      setIsDirty(false);
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
          <p className="text-sm text-[var(--text-muted)] mt-1">Configure company-wide defaults or your personal notification preferences.</p>
        </div>

        <div className="flex gap-2 border-b border-[var(--border)]">
          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'company'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Company Defaults
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'personal'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            My Preferences
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {activeTab === 'company' && (
            <>
              <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Payroll & Compliance</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Tenant-wide defaults stored in NotificationConfig.</p>
                </div>
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[var(--text-primary)]">Payroll Reminder (Days before)</label>
                      <input disabled={!canEdit} required name="payrollReminderDays" type="number" step="1" min="1" max="15" value={companyForm.payrollReminderDays} onChange={handleCompanyChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none disabled:bg-gray-100" />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input disabled={!canEdit} type="checkbox" name="taxRemittanceAlert" checked={companyForm.taxRemittanceAlert} onChange={handleCompanyChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all disabled:opacity-50" />
                      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Tax & Pension Remittance Alerts</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Operational Alerts</h3>
                </div>
                <div className="p-5 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input disabled={!canEdit} type="checkbox" name="leaveApprovalAlert" checked={companyForm.leaveApprovalAlert} onChange={handleCompanyChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all disabled:opacity-50" />
                      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Leave Request Alerts</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input disabled={!canEdit} type="checkbox" name="attendanceAnomalyAlert" checked={companyForm.attendanceAnomalyAlert} onChange={handleCompanyChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all disabled:opacity-50" />
                      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Attendance Anomaly Alerts</p>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}

          {activeTab === 'personal' && (
            <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">My Preferences</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">Personal settings stored in UserNotificationPreference for your account only.</p>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--text-primary)]">Payroll Reminder (Days before)</label>
                    <input required name="payrollReminderDays" type="number" step="1" min="1" max="15" value={personalForm.payrollReminderDays} onChange={handlePersonalChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none" />
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input type="checkbox" name="subscriptionRenewalAlert" checked={personalForm.subscriptionRenewalAlert} onChange={handlePersonalChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all" />
                    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Subscription Renewal Alerts</p>
                  </div>
                </label>

                <div className="pt-4 border-t border-[var(--border)] space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input type="checkbox" name="quietHoursEnabled" checked={personalForm.quietHoursEnabled} onChange={handlePersonalChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all" />
                      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Quiet Hours</p>
                      <p className="text-xs text-[var(--text-muted)]">Suppress non-critical alerts during your chosen window.</p>
                    </div>
                  </label>

                  {personalForm.quietHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4 pl-8">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[var(--text-primary)]">Start</label>
                        <input name="quietHoursStart" type="time" value={personalForm.quietHoursStart} onChange={handlePersonalChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[var(--text-primary)]">End</label>
                        <input name="quietHoursEnd" type="time" value={personalForm.quietHoursEnd} onChange={handlePersonalChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={!isDirty || saving || (activeTab === 'company' && !canEdit)}
              className="px-6 py-2 text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : activeTab === 'company' ? 'Save Company Defaults' : 'Save My Preferences'}
            </button>
          </div>
        </form>
      </div>

      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Unsaved Changes</h3>
            <p className="text-sm text-gray-600">You have unsaved changes. Are you sure you want to leave this page?</p>
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
