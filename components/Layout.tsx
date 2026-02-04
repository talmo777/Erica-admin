import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Send,
  LogOut,
  Menu,
  User
} from 'lucide-react';
import { HYU_LOGO_URL, MOYEON_LOGO_URL, MOYEON_LINK_URL, USER_WEB_URL } from '../constants';

export const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { path: '/admin', label: '대시보드', icon: LayoutDashboard, end: true },
    { path: '/admin/calendar', label: '캘린더', icon: Calendar, end: false },
    { path: '/admin/feedback', label: '실무자 피드백', icon: MessageSquare, end: false },
    { path: '/admin/emergency', label: '긴급 지원', icon: AlertTriangle, end: false },
    { path: '/admin/contests', label: '공모전 게시/배포', icon: Send, end: false },
  ];

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-sky-50/80 backdrop-blur border-b border-sky-100 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src={HYU_LOGO_URL} alt="Hanyang Logo" className="w-8 h-8 rounded" />
          <span className="font-bold text-gray-800">HY-LINK</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen((v) => !v)}
          aria-label="toggle mobile menu"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={[
          'fixed md:sticky top-0 left-0 z-40 w-64 h-screen',
          'bg-gradient-to-b from-sky-50 via-white to-white',
          'border-r border-sky-100',
          'flex flex-col transition-transform duration-300',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="p-4 border-b border-sky-100">
          <a
            href={USER_WEB_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3"
          >
            <img src={HYU_LOGO_URL} alt="Hanyang Logo" className="w-8 h-8 rounded" />
            <div>
              <h1 className="font-bold text-lg text-gray-900 leading-tight">HY-LINK</h1>
              <p className="text-xs text-gray-500">관리자 시스템</p>
            </div>
          </a>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-sky-100 text-sky-800' shadow-sm : 'text-slate-700 hover:bg-gray-50 hover:text-slate-900',
                ].join(' ')
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-sky-100 space-y-3">
          {/* User */}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <User className="w-4 h-4 text-gray-500" />
            <div className="leading-tight">
              <div className="font-medium">{user?.name ?? '관리자'}</div>
              <div className="text-xs text-gray-500">{user?.role ?? ''}</div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 w-full px-2 py-2 rounded hover:bg-gray-50 transition-colors"
          >
            <LogOut size={16} />
            로그아웃
          </button>

          {/* Powered by */}
          <a
            href={MOYEON_LINK_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600"
          >
            <img src={MOYEON_LOGO_URL} alt="모두의연구소" className="w-4 h-4" />
            <span>Powered by 모두의연구소</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
