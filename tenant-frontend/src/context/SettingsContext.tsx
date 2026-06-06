'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

// Future expansion: this will match our schema closely
export interface TenantSettings {
  company: {
    name: string;
    industry?: string;
    companySize?: string;
    registrationNumber?: string;
    tin?: string;
    contactEmail?: string;
    contactPhone?: string;
    fiscalYearStart: number;
    logoUrl?: string;
  };
  payroll: any; // Add specific types as we implement Phase 4
  attendance: any; // Add specific types as we implement Phase 5
  security: any;
  notifications: any;
}

interface SettingsContextType {
  settings: TenantSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (module: keyof TenantSettings, data: any) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<TenantSettings>('/settings');
      setSettings(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (module: keyof TenantSettings, data: any) => {
    // Optimistic update
    const previous = { ...settings };
    setSettings((prev) => prev ? { ...prev, [module]: { ...prev[module], ...data } } : null);

    try {
      await apiRequest(`/settings/${module}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      // Optionally re-fetch after successful save to ensure sync
      // await fetchSettings();
    } catch (err: any) {
      // Revert on error
      setSettings(previous as TenantSettings);
      throw new Error(err.message || `Failed to update ${module} settings`);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refreshSettings: fetchSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
