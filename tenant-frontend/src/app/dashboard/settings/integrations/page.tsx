'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { usePermission } from '@/hooks/usePermission';
import { toast } from '@/components/ui/toast';

export default function IntegrationsSettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const { hasPermission } = usePermission();
  const canEdit = hasPermission('manage_settings');
  
  const [form, setForm] = useState<any>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const { showUnsavedModal, confirmNavigation, cancelNavigation } = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (settings?.integrations && !isDirty) {
      setForm({
        chapaApiKey: settings.integrations.chapaApiKey || '',
        chapaConnected: settings.integrations.chapaConnected || false,
        cbeAccountNumber: settings.integrations.cbeAccountNumber || '',
        awashAccountNumber: settings.integrations.awashAccountNumber || '',
        ercaRegistrationNumber: settings.integrations.ercaRegistrationNumber || '',
        psssaRegistrationNumber: settings.integrations.psssaRegistrationNumber || '',
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
      await updateSettings('integrations', { ...form });
      setIsDirty(false);
      toast.success('Settings Saved', 'Integration configurations updated successfully.');
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save integration settings.');
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
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Integrations & Payments</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Connect payment gateways, banks, and government portals.</p>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          {/* SECTION: Chapa Payout API */}
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Chapa Bulk Payout
              </h3>
              {form.chapaConnected && <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">Connected</span>}
            </div>
            <div className="p-5 space-y-5">
              <p className="text-sm text-[var(--text-muted)]">
                Automate direct-to-bank salary disbursements using the Chapa API. Your secret keys are encrypted using AES-256-GCM before storage.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Chapa Secret Key</label>
                  <input disabled={!canEdit} name="chapaApiKey" type="text" placeholder="sk_live_..." value={form.chapaApiKey} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none disabled:bg-gray-100 font-mono" />
                </div>
              </div>
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer group w-max">
                  <div className="relative flex items-center">
                    <input disabled={!canEdit} type="checkbox" name="chapaConnected" checked={form.chapaConnected} onChange={handleChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all disabled:opacity-50" />
                    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">Enable Chapa Payouts</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION: Direct Bank Exports */}
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Corporate Bank Accounts</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">Used for generating CBE and Awash bulk transfer formats.</p>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">CBE Corporate Account Number</label>
                  <input disabled={!canEdit} name="cbeAccountNumber" type="text" placeholder="1000..." value={form.cbeAccountNumber} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none disabled:bg-gray-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Awash Corporate Account Number</label>
                  <input disabled={!canEdit} name="awashAccountNumber" type="text" placeholder="0132..." value={form.awashAccountNumber} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none disabled:bg-gray-100" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: Government Portals */}
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Government Identifiers</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">Required for generating ERCA tax forms and PSSSA pension files.</p>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">ERCA Tax Portal ID</label>
                  <input disabled={!canEdit} name="ercaRegistrationNumber" type="text" placeholder="e-tax portal id" value={form.ercaRegistrationNumber} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none disabled:bg-gray-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">PSSSA Employer Registration</label>
                  <input disabled={!canEdit} name="psssaRegistrationNumber" type="text" placeholder="Pension Agency ID" value={form.psssaRegistrationNumber} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none disabled:bg-gray-100" />
                </div>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                disabled={!isDirty || saving}
                onClick={() => {
                  setForm(settings?.integrations || {});
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
                {saving ? 'Saving...' : 'Save Integrations'}
              </button>
            </div>
          )}
        </form>
      </div>

      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Unsaved Changes</h3>
            <p className="text-sm text-gray-600">You have unsaved changes to your integration settings. Are you sure you want to leave this page?</p>
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
