import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { setApiBearerToken } from '../services/api';

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

  // 동시에 여러 refreshApproval이 중복 실행되지 않도록 lock
  const refreshingRef = useRef(false);

  const isAuthenticated = !!accessToken;

  const refreshApproval = async () => {
    // 이미 실행 중이면 skip
    if (refreshingRef.current) return;
    refreshingRef.current = true;

    try {
      requireBase();
      const token = await getAccessToken();
      setAccessToken(token);

      if (!token) {
        setApproval('UNAUTHORIZED');
        setUser(null);
        return;
      }

      const res = await fetch(`${API_BASE}/api/admin/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });

      if (res.ok) {
        const data = (await res.json()) as { ok: true; email: string; name?: string; role?: string };
        setApproval('APPROVED');
        setUser({ email: data.email, name: data.name ?? null, role: data.role ?? null });
        return;
      }

      let payload: any = null;
      try { payload = await res.json(); } catch {}
      const status = String(payload?.status ?? '');

      if (status === 'PENDING') setApproval('PENDING');
      else if (status === 'REJECTED') setApproval('REJECTED');
      else setApproval('UNAUTHORIZED');

      const { data: sessionData } = await supabase.auth.getUser();
      const email = sessionData.user?.email ?? '';
      setUser(email ? { email } : null);
    } finally {
      refreshingRef.current = false;
    }
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

  // accessToken이 바뀌면 api 모듈에 주입
  useEffect(() => {
    setApiBearerToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    let mounted = true;

    // 초기 로드
    (async () => {
      try {
        await refreshApproval();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // 세션 상태 변화 감지 - SIGNED_IN / SIGNED_OUT 이벤트만 처리
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      // TOKEN_REFRESHED는 무시 (불필요한 re-render 방지)
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return;

      if (!mounted) return;
      setLoading(true);
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
