import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_RAW = import.meta.env.VITE_BOARD_API_BASE_URL as string | undefined;
const API_BASE = API_BASE_RAW?.replace(/\/+$/, '');

function requireBase() {
  if (!API_BASE) throw new Error('VITE_BOARD_API_BASE_URL is not set');
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

  const isAuthenticated = !!accessToken;

  // Prevents parallel refreshApproval calls — second caller awaits the ongoing promise
  const refreshPromiseRef = React.useRef<Promise<void> | null>(null);

  const refreshApproval = async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const run = async () => {
      requireBase();
      const token = await getAccessToken();
      setAccessToken(token);

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
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await refreshApproval();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      // If a refresh is already in-flight, just wait for it instead of
      // setting loading=true and starting a duplicate call
      if (refreshPromiseRef.current) {
        await refreshPromiseRef.current;
        return;
      }
      if (mounted) setLoading(true);
      try {
        await refreshApproval();
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
    accessToken
  }), [isAuthenticated, approval, user, loading, accessToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
