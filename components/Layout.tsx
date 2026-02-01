import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Calendar, 
  MessageSquare, 
  AlertTriangle, 
  Send, 
  LogOut, 
  User,
  Menu
} from 'lucide-react';
import { HYU_LOGO_URL, MOYEON_LOGO_URL, MOYEON_LINK_URL, USER_WEB_URL } from '../constants';

export const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { path: '/admin', label: '대시보드', icon: LayoutDashboard, end: true },
    { path: '/admin/calendar', label: '캘린더', icon: Calendar, end: false },
    { path: '/admin/feedback', label: '실무자 피드백', icon: MessageSquare, end: false },
    { path: '/admin/emergency', label: '긴급 지원', icon: AlertTriangle, end: false },
    { path: '/admin/contests', label: '공모전 게시/배포', icon: Send, end: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src={HYU_LOGO_URL} alt="Hanyang Logo" className="w-8 h-8 rounded" />
          <span className="font-bold text-gray-800">ERICA Admin</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 w-64 h-screen bg-white border-r border-gray-200 flex flex-col transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand */}
        <a href={USER_WEB_URL} target="_blank" rel="noreferrer" className="flex items-center gap-3">
         <img src={HYU_LOGO_URL} alt="Hanyang Logo" className="w-8 h-8 rounded" />
         <div>
          <h1 className="font-bold text-lg text-gray-900 leading-tight">ERICA Board</h1>
          <p className="text-xs text-gray-500">관리자 시스템</p>
         </div>
        </a>


        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-center text-gray-400">
         <a
           href={MOYEON_LINK_URL}
           target="_blank"
           rel="noreferrer"
           className="inline-flex items-center gap-2 hover:text-gray-600"
         >
           <img src={MOYEON_LOGO_URL} alt="모두의연구소" className="w-4 h-4" />
           <span>Powered by 모두의연구소</span>
         </a>
        </div>

          <button 
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 w-full px-2 py-1 transition-colors"
          >
            <LogOut size={16} />
            로그아웃
          </button>
          <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-center text-gray-400">
            <p>Powered by 모두의연구소</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
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