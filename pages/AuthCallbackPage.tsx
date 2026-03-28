import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthCallbackPage: React.FC = () => {
  const { refreshApproval, approval, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    // refreshApproval은 AuthContext에서 onAuthStateChange(SIGNED_IN)로 자동 실행됨
    // 여기서는 approval 상태가 확정될 때까지 기다렸다가 이동
    refreshApproval();
  }, []);

  React.useEffect(() => {
    // loading이 끝나고 approval이 확정된 뒤에만 이동
    if (loading) return;
    if (approval === 'APPROVED') {
      navigate('/admin', { replace: true });
    } else if (approval === 'UNKNOWN') {
      // 아직 초기 상태면 좀 더 기다림
      return;
    } else {
      // PENDING / REJECTED / UNAUTHORIZED
      navigate('/access-denied', { replace: true });
    }
  }, [approval, loading]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
      <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
      <div className="text-slate-600 text-sm">로그인 처리 중...</div>
    </div>
  );
};
