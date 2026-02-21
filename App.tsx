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

// ─── Error Boundary ──────────────────────────────────────────────────────────
// Catches any uncaught rendering error and shows a friendly screen instead of
// a blank white page.

interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: unknown): EBState {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }
  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-bold text-slate-900">페이지를 불러올 수 없습니다</h1>
            <p className="text-sm text-slate-500 break-words">{this.state.message || '예기치 않은 오류가 발생했습니다.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Protected Route ──────────────────────────────────────────────────────────

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

// ─── App ──────────────────────────────────────────────────────────────────────

const App: React.FC = () => (
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

const AppWithBoundary: React.FC = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithBoundary;
