import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  AcademiaUser,
  MobileAccountType
} from '@/api/types';
import { changePassword as apiChangePassword, clearMobileSession, getProfile, hasMobileSession, login as apiLogin, logout as apiLogout, onSessionExpired } from '@/api/client';
import { registerForPushNotifications } from '@/lib/notifications';

type AuthValue = {
  user: AcademiaUser | null; loading: boolean; error: string | null;
  signIn(
    username: string,
    password: string,
    accountType: MobileAccountType
  ): Promise<AcademiaUser>;
  signOut(): Promise<void>;
  changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<void>;
  refreshProfile(): Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AcademiaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const restore = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (!(await hasMobileSession())) { setUser(null); return; }
      const profile = await getProfile(); setUser(profile);
      if (!profile.mustChangePassword) registerForPushNotifications().catch(() => undefined);
    } catch (err) {
      await clearMobileSession(); setUser(null);
      setError(err instanceof Error ? err.message : 'Your session could not be restored.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { restore(); }, [restore]);
  useEffect(() => onSessionExpired(() => { setUser(null); setError('Your session expired. Sign in again.'); }), []);

  const signIn = useCallback(async (
    username: string,
    password: string,
    accountType: MobileAccountType
  ) => {
    setError(null);
    const data = await apiLogin(
      username.trim(),
      password,
      accountType
    );
    setUser(data.user);
    if (!data.user.mustChangePassword) registerForPushNotifications().catch(() => undefined);
    return data.user;
  }, []);
  const signOut = useCallback(async () => { try { await apiLogout(); } finally { setUser(null); } }, []);
  const changePassword = useCallback(async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const next = await apiChangePassword(currentPassword, newPassword, confirmPassword); setUser(next);
    registerForPushNotifications().catch(() => undefined);
  }, []);
  const refreshProfile = useCallback(async () => { setUser(await getProfile()); }, []);
  const value = useMemo(() => ({ user, loading, error, signIn, signOut, changePassword, refreshProfile }), [user, loading, error, signIn, signOut, changePassword, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
