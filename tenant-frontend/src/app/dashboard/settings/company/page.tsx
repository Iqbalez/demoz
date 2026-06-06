'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { toast } from '@/components/ui/toast';

const INDUSTRIES = ['Manufacturing', 'Retail', 'NGO', 'Government', 'Tech', 'Other'];
const SIZES = ['1-10', '11-50', '51-200', '200+'];
const MONTHS = [
  { val: 1, label: 'January' }, { val: 2, label: 'February' }, { val: 3, label: 'March' },
  { val: 4, label: 'April' }, { val: 5, label: 'May' }, { val: 6, label: 'June' },
  { val: 7, label: 'July (Ethiopian FY Start)' }, { val: 8, label: 'August' },
  { val: 9, label: 'September' }, { val: 10, label: 'October' }, { val: 11, label: 'November' },
  { val: 12, label: 'December' },
];

export default function CompanyProfilePage() {
  const { settings, loading, updateSettings } = useSettings();
  const [form, setForm] = useState<any>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unsaved changes protection
  const { showUnsavedModal, confirmNavigation, cancelNavigation } = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (settings?.company && !isDirty) {
      setForm({
        name: settings.company.name || '',
        industry: settings.company.industry || '',
        companySize: settings.company.companySize || '',
        tin: settings.company.tin || '',
        registrationNumber: settings.company.registrationNumber || '',
        contactEmail: settings.company.contactEmail || '',
        contactPhone: settings.company.contactPhone || '',
        fiscalYearStart: settings.company.fiscalYearStart || 7,
        logoUrl: settings.company.logoUrl || '',
      });
    }
  }, [settings, isDirty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setIsDirty(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.warning('File too large', 'Logo must be under 2MB.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setForm({ ...form, logoUrl: event.target?.result as string });
      setIsDirty(true);
    };
    reader.readAsDataURL(file);
    // TODO: replace with S3 upload strategy in production
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (form.tin && !/^\\d{10}$/.test(form.tin)) {
      toast.error('Validation Error', 'Ethiopian TIN must be exactly 10 numeric digits.');
      return;
    }

    setSaving(true);
    try {
      await updateSettings('company', {
        ...form,
        fiscalYearStart: parseInt(form.fiscalYearStart, 10)
      });
      setIsDirty(false);
      toast.success('Settings Saved', 'Company profile updated successfully.');
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save company settings.');
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
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Company Profile</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Manage your organization's core details, logo, and registration information.</p>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm space-y-6">
            
            {/* Logo Upload Section */}
            <div className="flex items-center gap-6 pb-6 border-b border-[var(--border)]">
              <div className="w-20 h-20 rounded-xl bg-[var(--bg-subtle)] border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden flex-shrink-0">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Company Logo" className="w-full h-full object-contain" />
                ) : (
                  <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Company Logo</h3>
                <p className="text-xs text-[var(--text-muted)] mb-3">PNG or JPG up to 2MB. Used in navbar and payslips.</p>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleLogoUpload}
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold border border-[var(--border)] rounded-md hover:bg-[var(--bg-subtle)] transition-colors text-[var(--text-primary)]"
                >
                  Upload Image
                </button>
              </div>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">Company Name *</label>
                <input required name="name" type="text" value={form.name} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">Industry</label>
                <select name="industry" value={form.industry} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none">
                  <option value="">Select Industry...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">Company Size</label>
                <select name="companySize" value={form.companySize} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none">
                  <option value="">Select Size...</option>
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">Fiscal Year Start</label>
                <select name="fiscalYearStart" value={form.fiscalYearStart} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none">
                  {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                </select>
              </div>
            </div>

            {/* Registration Info */}
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider pt-4 border-t border-[var(--border)]">Registration & Tax</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">Tax Identification Number (TIN)</label>
                <input 
                  name="tin" 
                  type="text" 
                  maxLength={10}
                  value={form.tin} 
                  onChange={handleChange} 
                  placeholder="10 digit numeric TIN"
                  className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none font-mono" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">Business Registration Number</label>
                <input name="registrationNumber" type="text" value={form.registrationNumber} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none font-mono" />
              </div>
            </div>

            {/* Contact Info */}
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider pt-4 border-t border-[var(--border)]">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">Official Email</label>
                <input name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">Official Phone</label>
                <input name="contactPhone" type="text" value={form.contactPhone} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none" />
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              disabled={!isDirty || saving}
              onClick={() => {
                setForm(settings?.company || {});
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
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Unsaved Changes</h3>
            <p className="text-sm text-gray-600">You have unsaved changes to your company profile. Are you sure you want to leave this page? Your changes will be lost.</p>
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
