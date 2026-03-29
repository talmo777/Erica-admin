import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Contest } from '../types';

type Props = {
  isOpen: boolean;
  contest: Contest | null;
  onClose: () => void;
};

const btnBase =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-2';
const btnSecondary = btnBase + ' bg-white border border-slate-200 hover:bg-slate-50 text-slate-900';
const btnPrimary = btnBase + ' bg-slate-900 text-white hover:bg-slate-800';

const ContestModal: React.FC<Props> = ({ isOpen, contest, onClose }) => {
  if (!isOpen || !contest) return null;

  const endLabel = contest.endDate ? new Date(contest.endDate).toLocaleDateString() : '미정';
  const startLabel = contest.startDate ? new Date(contest.startDate).toLocaleDateString() : null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* 어두운 배경 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* 모달 컨테이너 - 화면 중앙, 최대 높이 제한 */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
        <div
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col"
          style={{ maxHeight: 'calc(100vh - 64px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 - 고정 */}
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-snug">
                {contest.title}
              </h3>
              <div className="flex items-center gap-3 mt-1.5">
                {startLabel && (
                  <span className="text-xs text-slate-500">시작: {startLabel}</span>
                )}
                <span className="text-xs text-slate-500">마감: {endLabel}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition shrink-0"
              aria-label="close"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* 본문 - 스크롤 가능 */}
          <div className="overflow-y-auto flex-1 min-h-0">
            <div className="p-5 space-y-4">
              {contest.imageUrl && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <img
                    src={contest.imageUrl}
                    alt="poster"
                    className="w-full max-h-64 object-contain"
                  />
                </div>
              )}

              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {contest.description || '설명이 없습니다.'}
              </div>
            </div>
          </div>

          {/* 푸터 - 고정 */}
          <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 shrink-0 bg-slate-50/50 rounded-b-2xl">
            <button onClick={onClose} className={btnSecondary}>
              닫기
            </button>
            {contest.applyUrl && (
              <a href={contest.applyUrl} target="_blank" rel="noreferrer" className={btnPrimary}>
                <ExternalLink className="w-4 h-4" />
                신청/원문
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestModal;
