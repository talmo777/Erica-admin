import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { AdminProfile } from '../types';

type ApprovalState = 'UNKNOWN' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'UNAUTHORIZED';

interface AuthUser {
  email: string;
  name?: string | null;
  role?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  approval: ApprovalState;
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshApproval: () => Promise<void>;
  accessToken: string | null;
  profile: AdminProfile | null;
  saveProfile: (p: AdminProfile) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_RAW = import.meta.env.VITE_BOARD_API_BASE_URL as string | undefined;
const API_BASE = API_BASE_RAW?.replace(/\/+$/, '');

function requireBase(): boolean {
  if (!API_BASE) {
    console.warn('[auth] VITE_BOARD_API_BASE_URL is not set — API calls will be skipped.');
    return false;
  }
  return true;
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [approval, setApproval] = useState<ApprovalState>('UNKNOWN');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  const isAuthenticated = !!accessToken;

  // Prevents parallel refreshApproval calls — second caller awaits the ongoing promise
  const refreshPromiseRef = React.useRef<Promise<void> | null>(null);

  const saveProfile = async (p: AdminProfile) => {
    const { error } = await supabase.auth.updateUser({
      data: {
        admin_name: p.name,
        admin_role: p.role,
        admin_contact: p.contact,
      },
    });
    if (error) throw error;
    setProfile(p);
  };

  const refreshApproval = async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const run = async () => {
      if (!requireBase()) {
        // API base not configured — treat as unauthorised (no throw)
        setApproval('UNAUTHORIZED');
        setUser(null);
        return;
      }

      const token = await getAccessToken();
      setAccessToken(token);

      // Load admin profile from Supabase user session metadata
      const { data: sd } = await supabase.auth.getSession();
      const meta = sd.session?.user?.user_metadata ?? {};
      const sessionEmail = sd.session?.user?.email ?? '';
      if (token && sessionEmail) {
        setProfile({
          name: meta.admin_name ?? '',
          role: meta.admin_role ?? '',
          contact: meta.admin_contact ?? '',
          email: sessionEmail,
        });
      } else {
        setProfile(null);
      }

      if (!token) {
        setApproval('UNAUTHORIZED');
        setUser(null);
        return;
      }

      const controller = new AbortController();
      const API_TIMEOUT_MS = 10000;
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(`${API_BASE}/api/admin/me`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }

      if (res.ok) {
        const data = (await res.json()) as { ok: true; email: string; name?: string; role?: string };
        setApproval('APPROVED');
        setUser({ email: data.email, name: data.name ?? null, role: data.role ?? null });
        return;
      }

      // 승인 안된 경우: 서버에서 status 내려줌
      let payload: any = null;
      try { payload = await res.json(); } catch {}
      const status = String(payload?.status ?? '');

      if (status === 'PENDING') setApproval('PENDING');
      else if (status === 'REJECTED') setApproval('REJECTED');
      else setApproval('UNAUTHORIZED');

      // 세션은 있어도 관리자 접근 불가 상태
      const { data: sessionData } = await supabase.auth.getUser();
      const email = sessionData.user?.email ?? '';
      setUser(email ? { email } : null);
    };

    const promise = run().finally(() => {
      refreshPromiseRef.current = null;
    });
    refreshPromiseRef.current = promise;
    return promise;
  };

  const signInWithGoogle = async () => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAccessToken(null);
    setApproval('UNAUTHORIZED');
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await refreshApproval();
      } catch (err) {
        console.error('[auth] refreshApproval failed:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      // If a refresh is already in-flight, just wait for it instead of
      // setting loading=true and starting a duplicate call
      if (refreshPromiseRef.current) {
        try { await refreshPromiseRef.current; } catch { /* already logged */ }
        return;
      }
      if (mounted) setLoading(true);
      try {
        await refreshApproval();
      } catch (err) {
        console.error('[auth] onAuthStateChange refreshApproval failed:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated,
    approval,
    user,
    loading,
    signInWithGoogle,
    signOut,
    refreshApproval,
    accessToken,
    profile,
    saveProfile,
  }), [isAuthenticated, approval, user, loading, accessToken, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
