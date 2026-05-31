'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RequireRole } from '@/components/auth/RequireRole';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { toast } from '@/components/ui/toast';

interface TenantProfile {
  id: string;
  name: string;
  companyCode: string;
  tin: string | null;
  taxRegion: string | null;
  planTier: string;
  maxEmployees: number;
  status: string;
  licenseUrl: string | null;
}

export default function OrganizationSettingsPage() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [tin, setTin] = useState('');
  const [taxRegion, setTaxRegion] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<TenantProfile>('/workspace/profile');
        setProfile(data);
        setName(data?.name || '');
        setTin(data?.tin || '');
        setTaxRegion(data?.taxRegion || '');
      } catch {
        // leave empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiRequest<TenantProfile>('/workspace/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, tin: tin || null, taxRegion: taxRegion || null }),
      });
      setProfile(updated);
      toast.success('Settings saved', 'Organization profile updated successfully.');
    } catch (err: any) {
      toast.error('Save failed', err?.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }, [name, tin, taxRegion, toast]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="h-8 w-48 bg-[var(--bg-subtle)] rounded animate-pulse" />
        <div className="h-40 bg-[var(--bg-subtle)] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Organization Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage your company&apos;s core details and legal identifiers.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">Company Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">Company Code</label>
            <input
              type="text"
              value={profile?.companyCode || ''}
              disabled
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-muted)] cursor-not-allowed"
            />
            <p className="text-[11px] text-[var(--text-muted)]">Used for USSD access. Cannot be changed.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">TIN (Taxpayer ID Number)</label>
            <input
              type="text"
              value={tin}
              onChange={e => setTin(e.target.value)}
              placeholder="e.g. 0001234567"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">Tax Region</label>
            <select
              value={taxRegion}
              onChange={e => setTaxRegion(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            >
              <option value="">Select Region</option>
              <option value="ADDIS_ABABA">Addis Ababa</option>
              <option value="OROMIA">Oromia</option>
              <option value="AMHARA">Amhara</option>
              <option value="TIGRAY">Tigray</option>
              <option value="SNNPR">SNNPR</option>
              <option value="SOMALI">Somali</option>
              <option value="AFAR">Afar</option>
              <option value="BENISHANGUL_GUMUZ">Benishangul-Gumuz</option>
              <option value="GAMBELA">Gambela</option>
              <option value="HARARI">Harari</option>
              <option value="DIRE_DAWA">Dire Dawa</option>
              <option value="SIDAMA">Sidama</option>
              <option value="SW_ETHIOPIA">South West Ethiopia</option>
            </select>
          </div>
        </div>

        {/* Read-only plan info */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4 space-y-2">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Subscription</h3>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-[var(--text-muted)]">Plan:</span>{' '}
              <span className="font-semibold text-[var(--brand-primary)]">{profile?.planTier || '—'}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Max Employees:</span>{' '}
              <span className="font-semibold text-[var(--text-primary)]">{profile?.maxEmployees || '—'}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Status:</span>{' '}
              <span className={`font-semibold ${profile?.status === 'ACTIVE' ? 'text-green-600' : 'text-amber-600'}`}>
                {profile?.status || '—'}
              </span>
            </div>
          </div>
        </div>

        <RequireRole allowedRoles={['SUPER_ADMIN', 'OWNER']}>
          <div className="pt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Organization Settings'}
            </button>
          </div>
        </RequireRole>
      </form>
    </div>
  );
}
