import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthCallbackPage: React.FC = () => {
  const { approval, loading } = useAuth();
  const navigate = useNavigate();
  const navigatedRef = React.useRef(false);

  React.useEffect(() => {
    if (loading || navigatedRef.current) return;
    navigatedRef.current = true;
    if (approval === 'APPROVED') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [loading, approval]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-600">로그인 처리 중...</div>
    </div>
  );
};
