import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HYU_LOGO_URL } from '../constants';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex justify-between items-center p-6 border-b">
        <div className="flex items-center gap-2">
           <img src={LOGO_PLACEHOLDER} alt="Logo" className="w-8 h-8" />
           <span className="font-bold text-xl tracking-tight text-blue-900">HYU ERICA Board</span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="px-5 py-2 bg-blue-900 text-white rounded-full text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          관리자 로그인
        </button>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center text-center p-4">
        <div className="max-w-2xl space-y-8">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
            ERICA 공모전을<br />
            <span className="text-blue-600">한 곳에서 관리하세요</span>
          </h1>
          <p className="text-lg text-gray-600">
            학과, 단과대, 행정부서에 흩어진 공모전 정보를 통합 관리하고,<br className="hidden md:block"/>
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
      </main>

      <footer className="p-8 text-center text-gray-400 text-sm border-t">
        <p>&copy; 2024 Hanyang University ERICA. All rights reserved.</p>
        <p className="mt-2">Created with 모두의연구소</p>
      </footer>
    </div>
  );
};
