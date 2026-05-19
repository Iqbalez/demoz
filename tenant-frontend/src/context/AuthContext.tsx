import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface UserPayload {
  id: string;
  tenantId: string;
  role: 'OWNER' | 'HR' | 'EMPLOYEE';
  email: string;
}

interface AuthContextProps {
  user: UserPayload | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as UserPayload;
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Auth fetch error', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
