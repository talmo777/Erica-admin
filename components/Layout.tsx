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
  X,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { HYU_LOGO_URL, MOYEON_LOGO_URL, MOYEON_LINK_URL, USER_WEB_URL } from '../constants';
import { ProfileSetupModal } from './ProfileSetupModal';

type NavItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export const AdminLayout: React.FC = () => {
  const { signOut, user, profile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = React.useState(false);
  const [isHovering, setIsHovering] = React.useState(false);
  const isDesktopExpanded = isPinnedOpen || isHovering;

  // 프로필 미완성 시 설정 모달 표시 (관리자 영역에서만)
  const profileIncomplete = !profile?.name || !profile?.role || !profile?.contact;

  const navItems: NavItem[] = [
    { path: '/admin', label: '대시보드', icon: LayoutDashboard, end: true },
    { path: '/admin/calendar', label: '캘린더', icon: Calendar },
    { path: '/admin/feedback', label: '실무자 피드백', icon: MessageSquare },
    { path: '/admin/emergency', label: '긴급 지원', icon: AlertTriangle },
    { path: '/admin/contests', label: '공모전 게시/배포', icon: Send },
  ];

  const initials = user?.name
    ? user.name.slice(0, 1).toUpperCase()
    : user?.email
    ? user.email.slice(0, 1).toUpperCase()
    : 'A';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile header */}
      <div className="md:hidden bg-slate-950 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <img src={HYU_LOGO_URL} alt="HYU" className="w-7 h-7 rounded-lg" />
          <span className="text-sm font-bold text-white tracking-tight">HY-LINK</span>
          <span className="text-xs text-slate-500">관리자</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen((v) => !v)}
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition"
          aria-label="toggle mobile menu"
        >
          {isMobileMenuOpen
            ? <X className="w-4 h-4 text-slate-300" />
            : <Menu className="w-4 h-4 text-slate-300" />
          }
        </button>
      </div>

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cx(
          'fixed md:sticky top-0 left-0 z-40 h-screen',
          'bg-slate-950 flex flex-col',
          'transition-all duration-200 ease-out',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          isDesktopExpanded ? 'md:w-60' : 'md:w-[68px]',
          'w-60'
        )}
      >
        <style>{`
          .hide-scrollbar{scrollbar-width:none;-ms-overflow-style:none}
          .hide-scrollbar::-webkit-scrollbar{display:none}
        `}</style>

        {/* Brand */}
        <div className="h-14 px-3 flex items-center gap-3 border-b border-slate-800/60 shrink-0">
          <a
            href={USER_WEB_URL}
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0 transition"
          >
            <img src={HYU_LOGO_URL} alt="HYU" className="w-5 h-5 rounded-md" />
          </a>
          {isDesktopExpanded && (
            <a
              href={USER_WEB_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex flex-col flex-1 min-w-0"
            >
              <span className="text-[13px] font-bold text-white tracking-tight truncate leading-none">HY-LINK</span>
              <span className="text-[11px] text-slate-500 truncate leading-none mt-0.5">관리자 시스템</span>
            </a>
          )}
          <button
            className="hidden md:flex ml-auto w-6 h-6 rounded-md shrink-0 items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition"
            onClick={() => setIsPinnedOpen((v) => !v)}
            aria-label="toggle sidebar pin"
          >
            {isPinnedOpen
              ? <ChevronsLeft className="w-3.5 h-3.5" />
              : <ChevronsRight className="w-3.5 h-3.5" />
            }
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setIsMobileMenuOpen(false)}
              title={!isDesktopExpanded ? item.label : undefined}
              className={({ isActive }) =>
                cx(
                  'group relative w-full flex items-center rounded-xl transition-all duration-150',
                  'focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/50',
                  isDesktopExpanded ? 'px-3 py-2.5 gap-3' : 'px-0 py-2.5 justify-center',
                  isActive
                    ? 'bg-sky-500/[0.12] text-sky-400'
                    : 'text-slate-500 hover:bg-slate-800/70 hover:text-slate-200'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 inset-y-0 w-0.5 rounded-r-full bg-sky-500 my-2" />
                  )}
                  <item.icon
                    className={cx(
                      'w-[17px] h-[17px] shrink-0',
                      !isDesktopExpanded && 'mx-auto'
                    )}
                  />
                  {isDesktopExpanded && (
                    <span className="hidden md:block text-[13px] font-medium truncate">
                      {item.label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-slate-800/60 px-2 py-3 space-y-0.5 shrink-0">
          {/* User */}
          <div className={cx('flex items-center px-2 py-2 rounded-xl', isDesktopExpanded ? 'gap-3' : 'justify-center')}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-white leading-none">{initials}</span>
            </div>
            {isDesktopExpanded && (
              <div className="hidden md:flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-slate-200 truncate leading-none">
                  {user?.name ?? user?.email?.split('@')[0] ?? '관리자'}
                </span>
                <span className="text-[11px] text-slate-500 truncate leading-none mt-0.5">
                  {user?.role ?? '관리자'}
                </span>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={signOut}
            title={!isDesktopExpanded ? '로그아웃' : undefined}
            className={cx(
              'w-full flex items-center rounded-xl px-2 py-2.5 transition',
              'text-slate-500 hover:bg-slate-800/70 hover:text-rose-400',
              isDesktopExpanded ? 'gap-3' : 'justify-center'
            )}
          >
            <LogOut className={cx('w-[17px] h-[17px] shrink-0', !isDesktopExpanded && 'mx-auto')} />
            {isDesktopExpanded && (
              <span className="hidden md:block text-[13px] font-medium">로그아웃</span>
            )}
          </button>

          {/* Powered by */}
          <a
            href={MOYEON_LINK_URL}
            target="_blank"
            rel="noreferrer"
            title={!isDesktopExpanded ? 'Powered by 모두의연구소' : undefined}
            className={cx(
              'w-full flex items-center rounded-xl px-2 py-2 transition',
              'text-slate-600 hover:bg-slate-800/60 hover:text-slate-400',
              isDesktopExpanded ? 'gap-3' : 'justify-center'
            )}
          >
            <img
              src={MOYEON_LOGO_URL}
              alt="모두의연구소"
              className={cx('w-[17px] h-[17px] rounded shrink-0', !isDesktopExpanded && 'mx-auto')}
            />
            {isDesktopExpanded && (
              <span className="hidden md:block text-[11px] text-slate-500 truncate">
                Powered by 모두의연구소
              </span>
            )}
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 프로필 미설정 시 설정 모달 (관리자 영역에서만 표시) */}
      <ProfileSetupModal open={profileIncomplete} />
    </div>
  );
};
