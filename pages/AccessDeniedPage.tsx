import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AccessDeniedPage: React.FC = () => {
  const { approval, user, signOut } = useAuth();
  const navigate = useNavigate();

  const msg =
    approval === 'PENDING'
      ? '승인 대기 중입니다. 승인 후 재시도하시기 바랍니다.'
      : approval === 'REJECTED'
      ? '접근이 거절된 계정입니다. 필요 시 운영자에게 문의하세요.'
      : '허가가 안된 계정이오니 승인 후 재시도하시기 바랍니다.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="text-xl font-extrabold text-slate-900">접근 불가</div>

        <div className="mt-2 text-slate-700">{msg}</div>

        <div className="mt-2 text-sm text-slate-500">
          로그인 계정: <span className="font-semibold">{user?.email ?? '-'}</span>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => navigate('/request-access')}
            className="flex-1 rounded-xl bg-slate-900 text-white py-3 font-semibold hover:bg-slate-800 transition"
          >
            승인요청
          </button>

          <button
            onClick={async () => {
              await signOut();
              navigate('/login', { replace: true });
            }}
            className="flex-1 rounded-xl border border-slate-200 bg-white text-slate-900 py-3 font-semibold hover:bg-slate-50 transition"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};

