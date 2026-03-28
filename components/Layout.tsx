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
        {/* Scrollbar hide (sidebar/nav 내부 스크롤바 안 보이게) */}
        <style>{`
          .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          .hide-scrollbar::-webkit-scrollbar { width: 0px; height: 0px; }
        `}</style>

        {/* ✅ Brand header: grid(로고/텍스트/핀)로 안정 정렬 */}
        <div className="px-4 py-4 border-b border-slate-200">
          <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
            {/* Left: Logo */}
            <a
              href={USER_WEB_URL}
              target="_blank"
              rel="noreferrer"
              className="w-11 h-11 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition"
            >
              <img src={HYU_LOGO_URL} alt="HYU" className="w-10 h-10 rounded-xl" />
            </a>

            {/* Middle: Text (expanded only) */}
            <a
              href={USER_WEB_URL}
              target="_blank"
              rel="noreferrer"
              className={cx('min-w-0', isDesktopExpanded ? 'hidden md:block' : 'hidden')}
            >
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900 truncate tracking-tight">HY-LINK</div>
                <div className="text-xs text-slate-500 truncate">관리자 시스템</div>
              </div>
            </a>

            {/* Right: Pin (항상 우측 고정) */}
            <button
              className="hidden md:flex w-11 h-11 rounded-2xl hover:bg-slate-100 items-center justify-center transition"
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
        </div>

        {/* Navigation */}
        <nav className={cx('flex-1 px-3 py-3 space-y-1 overflow-y-auto hide-scrollbar')}>
          {navItems.map((item) => {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cx(
                    'group relative w-full rounded-2xl transition-all duration-150',
                    'focus:outline-none',
                    // 접힘 상태에서는 아이콘 중앙정렬이 핵심이라 padding 최소/일관 유지
                    isDesktopExpanded ? 'px-3 py-2' : 'px-2 py-2',
                    isActive
                      ? 'bg-sky-50 text-sky-900 ring-1 ring-sky-200'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* ✅ 파란 세로 바(Active indicator) 제거 */}

                    <div
                      className={cx(
                        'flex items-center',
                        isDesktopExpanded ? 'justify-start gap-3' : 'justify-center'
                      )}
                    >
                      {/* Icon box: 항상 동일 크기/중앙 */}
                      <div
                        className={cx(
                          'w-10 h-10 rounded-2xl flex items-center justify-center',
                          isActive ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'bg-transparent'
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                      </div>

                      {/* Label (expanded only) */}
                      {isDesktopExpanded && (
                        <div className="hidden md:block min-w-0">
                          <div className="text-sm font-semibold truncate">{item.label}</div>
                        </div>
                      )}
                    </div>

                    {/* Tooltip (collapsed only) */}
                    <Tooltip show={!isDesktopExpanded} text={item.label} />
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-slate-200 space-y-2">
          {/* User */}
          <div
            className={cx(
              'rounded-2xl px-2 py-2 flex items-center',
              isDesktopExpanded ? 'justify-start gap-3' : 'justify-center'
            )}
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-700" />
            </div>
            {isDesktopExpanded && (
              <div className="hidden md:block min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">{user?.name ?? '관리자'}</div>
                <div className="text-xs text-slate-500 truncate">{user?.role ?? ''}</div>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className={cx(
              'w-full rounded-2xl px-2 py-2 transition',
              'text-slate-700 hover:bg-slate-100 hover:text-rose-700',
              isDesktopExpanded ? 'flex items-center justify-start gap-3' : 'flex items-center justify-center'
            )}
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            {isDesktopExpanded && <div className="hidden md:block text-sm font-semibold">로그아웃</div>}
            {/* ✅ 하단 툴팁 제거 */}
          </button>

          {/* Powered by */}
          <a
            href={MOYEON_LINK_URL}
            target="_blank"
            rel="noreferrer"
            className={cx(
              'w-full rounded-2xl px-2 py-2 transition',
              'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
              isDesktopExpanded ? 'flex items-center justify-start gap-3' : 'flex items-center justify-center'
            )}
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center">
              <img src={MOYEON_LOGO_URL} alt="모두의연구소" className="w-5 h-5 rounded" />
            </div>
            {isDesktopExpanded && <div className="hidden md:block text-xs font-semibold truncate">Powered by 모두의연구소</div>}
            {/* ✅ 하단 툴팁 제거 */}
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
