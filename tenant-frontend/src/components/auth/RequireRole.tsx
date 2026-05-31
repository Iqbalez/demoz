'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

interface RequireRoleProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireRole({ allowedRoles, children, fallback = null }: RequireRoleProps) {
  const { user } = useAuth();

  // If user is globally SUPER_ADMIN, they can see everything
  if (user?.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  // Get active workspace role
  const activeWorkspaceId = typeof window !== 'undefined' ? localStorage.getItem('demoz_tenant_id') : null;
  const activeWorkspace = user?.workspaces?.find((w: any) => w.tenantId === activeWorkspaceId) || user?.workspaces?.[0];

  const currentRole = activeWorkspace?.role || user?.role;

  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
