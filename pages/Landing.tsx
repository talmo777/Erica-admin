import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HYU_LOGO_URL } from '../constants';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  const heroRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    let targetX = 0.5,
      targetY = 0.45;
    let curX = targetX,
      curY = targetY;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      targetX = Math.min(1, Math.max(0, x));
      targetY = Math.min(1, Math.max(0, y));
    };

    const onLeave = () => {
      targetX = 0.5;
      targetY = 0.45;
    };

    const tick = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;

      el.style.setProperty('--mx', String(curX));
      el.style.setProperty('--my', String(curY));

      rafRef.current = requestAnimationFrame(tick);
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex justify-between items-center p-6 border-b">
        <div className="flex items-center gap-2">
          <img src={HYU_LOGO_URL} alt="Logo" className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight text-blue-900">HY-LINK</span>
        </div>

        {/* ✅ 버튼 2개: 로그인 / 승인요청 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/request-access')}
            className="px-5 py-2 border border-slate-200 bg-white text-slate-900 rounded-full text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            승인요청
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2 bg-blue-900 text-white rounded-full text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            로그인
          </button>
        </div>
      </header>

      <main
        ref={heroRef}
        className="hero relative flex-1 flex flex-col justify-center items-center text-center p-4 overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage:
                'radial-gradient(circle at 50% 45%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 75%)',
              WebkitMaskImage:
                'radial-gradient(circle at 50% 45%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 75%)',
            }}
          />

          <div className="blob blob-a" />
          <div className="blob blob-b" />
          <div className="blob blob-c" />
          <div className="spotlight" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-8">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
            ERICA 공모전을
            <br />
            <span className="text-blue-600">한 곳에서 관리하세요</span>
          </h1>

          <p className="text-lg text-gray-600">
            학과, 단과대, 행정부서에 흩어진 공모전 정보를 통합 관리하고,
            <br className="hidden md:block" />
            학생들에게 효과적으로 전달하는 공식 관리자 도구입니다.
          </p>

          {/* ✅ CTA: 시작하기(로그인) + 승인요청 */}
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-10 py-4 bg-gray-900 text-white rounded-lg text-lg font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              시작하기
            </button>
          </div>

        </div>

        <style>{`
          .hero { --mx: 0.5; --my: 0.45; }

          .blob {
            position: absolute;
            border-radius: 9999px;
            filter: blur(40px);
            opacity: 0.34;
            transform: translate3d(0,0,0);
            will-change: transform;
          }

          .blob-a {
            width: 520px; height: 520px;
            left: -180px; top: 60px;
            background: radial-gradient(circle at 30% 30%, rgba(37,99,235,0.95), rgba(37,99,235,0) 60%);
            transform: translate3d(calc((var(--mx) - 0.5) * 70px), calc((var(--my) - 0.5) * 45px), 0);
          }

          .blob-b {
            width: 560px; height: 560px;
            right: -220px; top: 110px;
            background: radial-gradient(circle at 40% 40%, rgba(30,64,175,0.88), rgba(30,64,175,0) 62%);
            transform: translate3d(calc((var(--mx) - 0.5) * -80px), calc((var(--my) - 0.5) * 55px), 0);
          }

          .blob-c {
            width: 520px; height: 520px;
            left: 50%; bottom: -260px;
            margin-left: -260px;
            background: radial-gradient(circle at 50% 50%, rgba(148,163,184,0.78), rgba(148,163,184,0) 65%);
            transform: translate3d(calc((var(--mx) - 0.5) * 40px), calc((var(--my) - 0.5) * -40px), 0);
          }

          .spotlight {
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: radial-gradient(
              720px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%),
              rgba(37,99,235,0.22),
              rgba(255,255,255,0) 60%
            );
          }

          @media (prefers-reduced-motion: reduce) {
            .blob-a, .blob-b, .blob-c { transform: none; }
            .spotlight { background: none; }
          }
        `}</style>
      </main>

      <footer className="p-8 text-center text-gray-400 text-sm border-t">
        <p>&copy; 2026 Hanyang University ERICA. All rights reserved.</p>
        <p className="mt-2">Created with 모두의 문제 연구소</p>
      </footer>
    </div>
  );
};
