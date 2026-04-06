import React from 'react';
import { X, ExternalLink, FileText } from 'lucide-react';
import { Contest } from '../types';

type Props = {
  isOpen: boolean;
  contest: Contest | null;
  onClose: () => void;
};

const ContestModal: React.FC<Props> = ({ isOpen, contest, onClose }) => {
  if (!isOpen || !contest) return null;

  const endLabel = contest.endDate ? new Date(contest.endDate).toLocaleDateString() : '미정';
  const startLabel = contest.startDate ? new Date(contest.startDate).toLocaleDateString() : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/50" />

      {/* 모달 */}
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'min(90vh, 700px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
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
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition shrink-0"
            aria-label="close"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* 본문 - 스크롤 */}
        <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">
          <div className="p-5 space-y-4">
            {contest.imageUrl && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                <img
                  src={contest.imageUrl}
                  alt="poster"
                  className="w-full max-h-52 object-contain"
                />
              </div>
            )}

            {(() => {
              const ATTACHMENT_MARKER = '\n[[ATTACHMENTS]]\n';
              const raw = contest.description ?? '';
              const [bodyPart, attachPart] = raw.split(ATTACHMENT_MARKER);
              const pdfUrls = attachPart
                ? attachPart.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'))
                : [];
              const getFileName = (url: string) => {
                try { return decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? url); }
                catch { return url; }
              };
              return (
                <>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {bodyPart || '설명이 없습니다.'}
                  </div>
                  {pdfUrls.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">첨부파일</p>
                      {pdfUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm text-slate-700 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                          <span className="truncate flex-1">{getFileName(url)}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 shrink-0 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            닫기
          </button>
          {contest.applyUrl && (
            <a
              href={contest.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
            >
              <ExternalLink className="w-4 h-4" />
              신청/원문
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContestModal;
