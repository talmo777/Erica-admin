import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthCallbackPage: React.FC = () => {
  const { approval, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const navigatedRef = React.useRef(false);

  React.useEffect(() => {
    if (loading || navigatedRef.current) return;
    navigatedRef.current = true;

    if (approval === 'APPROVED') {
      // Approved admin — go straight to the tool
      navigate('/admin', { replace: true });
    } else if (isAuthenticated) {
      // Has a valid Supabase session but not an approved admin
      // (PENDING, REJECTED, UNAUTHORIZED, or API unreachable)
      navigate('/access-denied', { replace: true });
    } else {
      // No Supabase session at all — back to login
      navigate('/login', { replace: true });
    }
  }, [loading, approval, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
        <span className="text-sm text-slate-500">로그인 처리 중…</span>
      </div>
    </div>
  );
};
