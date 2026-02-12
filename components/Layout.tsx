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
  User,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { HYU_LOGO_URL, MOYEON_LOGO_URL, MOYEON_LINK_URL, USER_WEB_URL } from '../constants';

type NavItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

const Tooltip: React.FC<{ show: boolean; text: string }> = ({ show, text }) => {
  if (!show) return null;
  return (
    <span
      className={cx(
        'hidden md:block',
        'absolute left-[72px] top-1/2 -translate-y-1/2',
        'px-2 py-1 rounded-md',
        'bg-slate-900 text-white text-xs',
        'shadow-lg whitespace-nowrap'
      )}
    >
      {text}
    </span>
  );
};

export const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Desktop sidebar behavior
  const [isPinnedOpen, setIsPinnedOpen] = React.useState(false);
  const [isHovering, setIsHovering] = React.useState(false);
  const isDesktopExpanded = isPinnedOpen || isHovering;

  const navItems: NavItem[] = [
    { path: '/admin', label: '대시보드', icon: LayoutDashboard, end: true },
    { path: '/admin/calendar', label: '캘린더', icon: Calendar },
    { path: '/admin/feedback', label: '실무자 피드백', icon: MessageSquare },
    { path: '/admin/emergency', label: '긴급 지원', icon: AlertTriangle },
    { path: '/admin/contests', label: '공모전 게시/배포', icon: Send },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile header */}
      <div className="md:hidden bg-white/80 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={HYU_LOGO_URL} alt="HYU" className="w-8 h-8 rounded-lg" />
          <div className="leading-tight">
            <div className="font-bold text-slate-900">HY-LINK</div>
            <div className="text-xs text-slate-500">관리자 시스템</div>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen((v) => !v)}
          className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center"
          aria-label="toggle mobile menu"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cx(
          'fixed md:sticky top-0 left-0 z-40 h-screen',
          'bg-white border-r border-slate-200',
          'flex flex-col',
          'transition-all duration-200 ease-out',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          isDesktopExpanded ? 'md:w-72' : 'md:w-20',
          'w-72' // mobile width
        )}
      >
        {/* Brand header (grid to keep pin aligned) */}
        <div className="px-4 py-4 border-b border-slate-200 grid grid-cols-[40px_1fr_40px] items-center gap-2">
          <a href={USER_WEB_URL} target="_blank" rel="noreferrer" className="w-10 h-10">
            <img src={HYU_LOGO_URL} alt="HYU" className="w-10 h-10 rounded-xl" />
          </a>

          <a
            href={USER_WEB_URL}
            target="_blank"
            rel="noreferrer"
            className={cx(
              'min-w-0',
              isDesktopExpanded ? 'hidden md:block' : 'hidden md:hidden',
              'md:block'
            )}
          >
            {/* We show this only when expanded */}
            {isDesktopExpanded && (
              <div className="min-w-0">
                <div className="font-bold text-slate-900 truncate">HY-LINK</div>
                <div className="text-xs text-slate-500 truncate">관리자 시스템</div>
              </div>
            )}
          </a>

          <button
            className="hidden md:flex w-10 h-10 rounded-xl hover:bg-slate-100 items-center justify-center"
            onClick={() => setIsPinnedOpen((v) => !v)}
            aria-label="toggle sidebar pin"
            title={isPinnedOpen ? '사이드바 접기' : '사이드바 고정 펼치기'}
          >
            {isPinnedOpen ? (
              <ChevronsLeft className="w-5 h-5 text-slate-700" />
            ) : (
              <ChevronsRight className="w-5 h-5 text-slate-700" />
            )}
          </button>
        </div>

        {/* Navigation (Rail style) */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cx(
                    'group relative',
                    'w-full',
                    'rounded-2xl',
                    'transition-all duration-150',
                    'focus:outline-none',
                    'px-2 py-2',
                    isActive
                      ? 'bg-sky-50 text-sky-900 ring-1 ring-sky-200'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                    isDesktopExpanded ? 'md:px-3' : 'md:px-2'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-sky-500" />
                    )}

                    <div
                      className={cx(
                        'grid items-center gap-3',
                        isDesktopExpanded ? 'md:grid-cols-[40px_1fr]' : 'md:grid-cols-[40px]',
                        'grid-cols-[40px_1fr]'
                      )}
                    >
                      {/* Icon box */}
                      <div
                        className={cx(
                          'w-10 h-10 rounded-2xl',
                          'flex items-center justify-center',
                          isActive ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'bg-transparent'
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                      </div>

                      {/* Label */}
                      <div className={cx('min-w-0', isDesktopExpanded ? 'hidden md:block' : 'hidden md:hidden', 'md:block')}>
                        {isDesktopExpanded && (
                          <div className="text-sm font-medium truncate">{item.label}</div>
                        )}
                      </div>
                    </div>

                    {/* Tooltip in collapsed state */}
                    <Tooltip show={!isDesktopExpanded} text={item.label} />
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 py-3 border-t border-slate-200 space-y-2">
          {/* User */}
          <div
            className={cx(
              'rounded-2xl px-2 py-2',
              'flex items-center gap-3',
              isDesktopExpanded ? 'md:px-3' : 'md:px-2'
            )}
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-700" />
            </div>
            {isDesktopExpanded && (
              <div className="min-w-0 hidden md:block">
                <div className="text-sm font-semibold text-slate-900 truncate">{user?.name ?? '관리자'}</div>
                <div className="text-xs text-slate-500 truncate">{user?.role ?? ''}</div>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className={cx(
              'group relative w-full rounded-2xl',
              'px-2 py-2 md:px-2',
              'text-slate-700 hover:bg-slate-100 hover:text-rose-700',
              'transition-all duration-150'
            )}
          >
            <div
              className={cx(
                'grid items-center gap-3',
                isDesktopExpanded ? 'md:grid-cols-[40px_1fr]' : 'md:grid-cols-[40px]',
                'grid-cols-[40px_1fr]'
              )}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              {isDesktopExpanded && (
                <div className="hidden md:block text-sm font-medium text-left">로그아웃</div>
              )}
            </div>
            <Tooltip show={!isDesktopExpanded} text="로그아웃" />
          </button>

          {/* Powered by */}
          <a
            href={MOYEON_LINK_URL}
            target="_blank"
            rel="noreferrer"
            className={cx(
              'group relative w-full rounded-2xl px-2 py-2',
              'text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition'
            )}
          >
            <div
              className={cx(
                'grid items-center gap-3',
                isDesktopExpanded ? 'md:grid-cols-[40px_1fr]' : 'md:grid-cols-[40px]',
                'grid-cols-[40px_1fr]'
              )}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center">
                <img src={MOYEON_LOGO_URL} alt="모두의연구소" className="w-5 h-5 rounded" />
              </div>
              {isDesktopExpanded && (
                <div className="hidden md:block text-xs font-medium truncate">Powered by 모두의연구소</div>
              )}
            </div>
            <Tooltip show={!isDesktopExpanded} text="Powered by 모두의연구소" />
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
