"use client";

import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "@/lib/api";

export type UserRole = "SUPER_ADMIN" | "OWNER" | "HR" | "EMPLOYEE";
export type TenantStatus = "ACTIVE" | "PAST_DUE" | "SUSPENDED";

export interface WorkspaceInfo {
  tenantId: string;
  role: UserRole;
  status: TenantStatus;
  companyName: string;
}

export interface UserPayload {
  id: string;
  email: string;
  phoneNumber?: string;
  is2FaEnabled?: boolean;
  tenantId: string | null;
  role: UserRole | null;
  workspaces?: WorkspaceInfo[];
  defaultTenantId?: string | null;
  subscription_status?: TenantStatus | null;
  subscription_expires_at?: string | null;
  companyName?: string | null;
  planTier?: string | null;
  maxEmployees?: number | null;
  workspace?: {
    employeeCount: number;
    faydaOnFile: number;
    faydaMissing: number;
  } | null;
  permissions?: string[];
}

interface AuthContextProps {
  user: UserPayload | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  refreshUser: async () => { },
  logout: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiRequest<UserPayload>("/api/v1/auth/me");
      setUser(data);
      if (data?.defaultTenantId && typeof window !== 'undefined') {
        localStorage.setItem('demoz_tenant_id', data.defaultTenantId);
      }
    } catch {
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // clear local state even if network fails
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("demoz_tenant_id");
    }
    setUser(null);
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
