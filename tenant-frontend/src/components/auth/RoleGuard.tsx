import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface RoleGuardProps {
  allowedRoles: string[]; // e.g. ['OWNER']
  children: ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // No user → redirect to login
      if (!user) {
        router.replace('/login');
        return;
      }
      // Role mismatch → redirect to appropriate dashboard
      if (!allowedRoles.includes(user.role)) {
        // Determine fallback based on role
        const fallback =
          user.role === 'HR'
            ? '/dashboard/hr'
            : user.role === 'EMPLOYEE'
            ? '/dashboard/employee'
            : '/login';
        router.replace(fallback);
      }
    }
  }, [user, loading, allowedRoles, router]);

  // While loading or redirecting, render nothing to avoid flicker
  if (loading || !user || !allowedRoles.includes(user?.role || '')) {
    return null;
  }

  return <>{children}</>;
}
