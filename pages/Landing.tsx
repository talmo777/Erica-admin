import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HYU_LOGO_URL } from '../constants';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex justify-between items-center p-6 border-b">
        <div className="flex items-center gap-2">
          <img src={HYU_LOGO_URL} alt="Logo" className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight text-blue-900">HY-LINK</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="px-5 py-2 bg-blue-900 text-white rounded-full text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          관리자 로그인
        </button>
      </header>

      {/* ✅ HERO */}
      <main className="relative flex-1 flex flex-col justify-center items-center text-center p-4 overflow-hidden">
        {/* ---- background layer ---- */}
        <div className="absolute inset-0 pointer-events-none">
          {/* subtle grid */}
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

          {/* moving blobs (very subtle) */}
          <div className="blob blob-a" />
          <div className="blob blob-b" />
          <div className="blob blob-c" />

          {/* soft vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 45%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 58%, rgba(255,255,255,0.85) 80%, rgba(255,255,255,1) 100%)',
            }}
          />
        </div>

        {/* ---- content layer ---- */}
        <div className="relative max-w-2xl space-y-8">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
            ERICA 공모전을<br />
            <span className="text-blue-600">한 곳에서 관리하세요</span>
          </h1>

          <p className="text-lg text-gray-600">
            학과, 단과대, 행정부서에 흩어진 공모전 정보를 통합 관리하고,
            <br className="hidden md:block" />
            학생들에게 효과적으로 전달하는 공식 관리자 도구입니다.
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-gray-900 text-white rounded-lg text-lg font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              지금 시작하기
            </button>
          </div>
        </div>

        {/* component-scoped css */}
        <style>{`
          .blob {
            position: absolute;
            width: 520px;
            height: 520px;
            border-radius: 9999px;
            filter: blur(60px);
            opacity: 0.16;
            transform: translate3d(0,0,0);
            will-change: transform;
          }

          .blob-a {
            left: -180px;
            top: 60px;
            background: radial-gradient(circle at 30% 30%, rgba(37,99,235,0.65), rgba(37,99,235,0.0) 60%);
            animation: driftA 12s ease-in-out infinite;
          }

          .blob-b {
            right: -200px;
            top: 120px;
            background: radial-gradient(circle at 40% 40%, rgba(30,64,175,0.55), rgba(30,64,175,0.0) 62%);
            animation: driftB 14s ease-in-out infinite;
          }

          .blob-c {
            left: 20%;
            bottom: -220px;
            background: radial-gradient(circle at 50% 50%, rgba(148,163,184,0.55), rgba(148,163,184,0.0) 65%);
            animation: driftC 16s ease-in-out infinite;
          }

          @keyframes driftA {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            50%      { transform: translate(40px, 20px) scale(1.03); }
          }

          @keyframes driftB {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            50%      { transform: translate(-35px, 25px) scale(1.02); }
          }

          @keyframes driftC {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            50%      { transform: translate(18px, -28px) scale(1.04); }
          }
        `}</style>
      </main>

      <footer className="p-8 text-center text-gray-400 text-sm border-t">
        <p>&copy; 2024 Hanyang University ERICA. All rights reserved.</p>
        <p className="mt-2">Created with 모두의연구소</p>
      </footer>
    </div>
  );
};

