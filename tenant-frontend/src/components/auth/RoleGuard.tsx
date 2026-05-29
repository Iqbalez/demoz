import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface RoleGuardProps {
  allowedRoles: string[]; // e.g. ['OWNER', 'HR']
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
      if (user.role === "SUPER_ADMIN") {
        router.replace("/admin-portal");
        return;
      }
      if (!allowedRoles.includes(user.role)) {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, allowedRoles, router]);

  // While loading or redirecting, render nothing to avoid flicker
  if (loading || !user || !allowedRoles.includes(user?.role || '')) {
    return null;
  }

  return <>{children}</>;
}
