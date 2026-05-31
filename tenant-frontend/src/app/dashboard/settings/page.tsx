'use client';

import { RequireRole } from '@/components/auth/RequireRole';
import { useAuth } from '@/context/AuthContext';

export default function OrganizationSettingsPage() {
  const { user } = useAuth();
  const activeWorkspaceId = typeof window !== 'undefined' ? localStorage.getItem('demoz_tenant_id') : null;
  const activeWorkspace = user?.workspaces?.find((w: any) => w.tenantId === activeWorkspaceId) || user?.workspaces?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--m-cream)]">Organization Settings</h1>
        <p className="text-sm text-[var(--m-muted)] mt-1">Manage your company's core details and legal identifiers.</p>
      </div>

      <form className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--m-cream)]">Company Name</label>
            <input 
              type="text" 
              defaultValue={activeWorkspace?.companyName || ''}
              className="w-full rounded-md border border-[var(--m-border)] bg-[var(--m-bg)] px-3 py-2 text-sm text-[var(--m-cream)] focus:border-[var(--m-primary)] focus:outline-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--m-cream)]">TIN (Taxpayer Identification Number)</label>
            <input 
              type="text" 
              placeholder="e.g. 0001234567"
              className="w-full rounded-md border border-[var(--m-border)] bg-[var(--m-bg)] px-3 py-2 text-sm text-[var(--m-cream)] focus:border-[var(--m-primary)] focus:outline-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--m-cream)]">Tax Region</label>
            <select className="w-full rounded-md border border-[var(--m-border)] bg-[var(--m-bg)] px-3 py-2 text-sm text-[var(--m-cream)] focus:border-[var(--m-primary)] focus:outline-none">
              <option value="ADDIS_ABABA">Addis Ababa</option>
              <option value="OROMIA">Oromia</option>
              <option value="AMHARA">Amhara</option>
              <option value="DIRE_DAWA">Dire Dawa</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-[var(--m-border)]">
          <label className="text-sm font-medium text-[var(--m-cream)]">Business License (PDF)</label>
          <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-[var(--m-border)] px-6 pt-5 pb-6">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-[var(--m-muted)]" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-[var(--m-muted)]">
                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-[var(--m-primary)] hover:text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--m-primary)] focus-within:ring-offset-2">
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-[var(--m-faint)]">PDF up to 10MB</p>
            </div>
          </div>
        </div>

        <RequireRole allowedRoles={['SUPER_ADMIN', 'OWNER']}>
          <div className="pt-6">
            <button type="submit" className="px-4 py-2 bg-[var(--m-primary)] text-white rounded-md text-sm font-medium hover:bg-indigo-600 transition-colors">
              Save Organization Settings
            </button>
          </div>
        </RequireRole>
      </form>
    </div>
  );
}
