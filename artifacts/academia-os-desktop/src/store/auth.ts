import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { auth as authApi, type User, type Session } from '../api/client';

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User; session: Session };

type AuthContextValue = {
  authState: AuthState;
  login(username: string, password: string): Promise<{ ok: boolean; error?: string }>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
};

import React from 'react';
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useAuthProvider(): AuthContextValue {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  // Check existing session on mount
  useEffect(() => {
    authApi.getSession().then((res) => {
      if (res.ok && res.loggedIn && res.user && res.session) {
        setAuthState({ status: 'authenticated', user: res.user, session: res.session });
      } else {
        setAuthState({ status: 'unauthenticated' });
      }
    }).catch(() => setAuthState({ status: 'unauthenticated' }));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    if (res.ok) {
      // Re-fetch session to get full user object
      const session = await authApi.getSession();
      if (session.ok && session.loggedIn && session.user && session.session) {
        setAuthState({ status: 'authenticated', user: session.user, session: session.session });
        return { ok: true };
      }
    }
    return { ok: false, error: (res as { ok: false; error?: { message?: string } }).error?.message ?? 'Login failed' };
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setAuthState({ status: 'unauthenticated' });
  }, []);

  const refresh = useCallback(async () => {
    const res = await authApi.refresh();
    if (!res.ok) {
      setAuthState({ status: 'unauthenticated' });
    }
  }, []);

  return { authState, login, logout, refresh };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuthProvider();
  return React.createElement(AuthContext.Provider, { value }, children);
}
