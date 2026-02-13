import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthCallbackPage: React.FC = () => {
  const { refreshApproval } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    (async () => {
      await refreshApproval();
      navigate('/admin', { replace: true });
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-600">로그인 처리 중...</div>
    </div>
  );
};
