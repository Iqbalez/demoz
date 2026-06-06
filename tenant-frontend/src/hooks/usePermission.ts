import { useAuth } from '@/context/AuthContext';

export function usePermission() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Super Admins and Owners inherently have all permissions based on the role structure,
    // but the backend's permissions array in UserPayload already resolves this 
    // using the DEFAULT_ROLE_PERMISSIONS matrix or the custom role.
    
    // The permissions array contains the exact granular capabilities.
    if (user.permissions && Array.isArray(user.permissions)) {
      return user.permissions.includes(permission);
    }
    
    return false;
  };

  return { hasPermission };
}
