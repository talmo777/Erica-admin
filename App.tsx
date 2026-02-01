import React from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Landing } from './pages/Landing';
import { AdminLayout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ContestManager } from './pages/ContestManager';
import CalendarView from './pages/Calendar';
import { SupportPage } from './pages/Support';

// Mock Login Page Component
const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
       <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
         <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">관리자 로그인</h2>
         <form onSubmit={handleLogin} className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
             <input type="email" placeholder="admin@hanyang.ac.kr" className="w-full border p-2 rounded" />
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
             <input type="password" placeholder="••••••••" className="w-full border p-2 rounded" />
           </div>
           <button className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800">로그인</button>
           <p className="text-xs text-center text-gray-400 mt-4">MVP 버전: 아무 값이나 입력하면 로그인됩니다.</p>
         </form>
       </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="contests" element={<ContestManager />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="feedback" element={<SupportPage />} />
            <Route path="emergency" element={<SupportPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;