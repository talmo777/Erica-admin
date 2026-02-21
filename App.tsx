import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLayout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ContestManager } from './pages/ContestManager';
import CalendarView from './pages/Calendar';
import { SupportPage } from './pages/Support';

import { Landing } from './pages/Landing';
import { LoginPage } from './pages/LoginPage';
import { RequestAccessPage } from './pages/RequestAccessPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, approval, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
          <span className="text-sm text-slate-500">로딩 중...</span>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (approval !== 'APPROVED') return <Navigate to="/access-denied" replace />;

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ✅ Public: 기존 첫 화면 유지 */}
          <Route path="/" element={<Landing />} />

          {/* ✅ Public: 로그인/승인요청 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/request-access" element={<RequestAccessPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* ✅ Protected: 승인된 관리자만 */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="contests" element={<ContestManager />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="feedback" element={<SupportPage />} />
            <Route path="emergency" element={<SupportPage />} />
          </Route>

          {/* ✅ fallback은 로그인 강제 X → 첫 화면으로 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
