import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HYU_LOGO_URL } from '../constants';

export const LoginPage: React.FC = () => {
  const { signInWithGoogle, approval, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = React.useState(false);

  // 이미 로그인+승인된 상태면 바로 이동
  React.useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      if (approval === 'APPROVED') navigate('/admin', { replace: true });
      else if (approval !== 'UNKNOWN') navigate('/access-denied', { replace: true });
    }
  }, [loading, isAuthenticated, approval]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      // Google OAuth 리다이렉트가 발생하므로 이 이후 코드는 실행 안 됨
    } catch {
      setSigningIn(false);
    }
  };

  // 초기 세션 확인 중에만 전체 화면 로딩
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
        <div className="text-slate-500 text-sm">세션 확인 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <img src={HYU_LOGO_URL} className="w-10 h-10 rounded-xl" alt="HYU" />
          <div>
            <div className="text-lg font-extrabold text-slate-900">HY-LINK 관리자</div>
            <div className="text-xs text-slate-500">승인된 계정만 접근 가능합니다.</div>
          </div>
        </div>

        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="w-full rounded-xl bg-slate-900 text-white py-3 font-semibold hover:bg-slate-800 transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {signingIn ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              이동 중...
            </>
          ) : (
            'Google로 로그인'
          )}
        </button>

        <button
          onClick={() => navigate('/request-access')}
          className="w-full mt-3 rounded-xl border border-slate-200 bg-white text-slate-900 py-3 font-semibold hover:bg-slate-50 transition"
        >
          승인요청
        </button>

        <div className="mt-4 text-xs text-slate-500 leading-relaxed">
          * 승인요청 제출 후 운영자가 Airtable에서 승인 처리합니다. 승인 완료 시 안내 메일을 발송합니다(초기 MVP는 수동 발송).
        </div>
      </div>
    </div>
  );
};
