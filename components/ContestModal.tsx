import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Contest } from '../types';

type Props = {
  isOpen: boolean;
  contest: Contest | null;
  onClose: () => void;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

const btnBase =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-2';
const btnSecondary = btnBase + ' bg-white border border-slate-200 hover:bg-slate-50 text-slate-900';
const btnPrimary = btnBase + ' bg-slate-900 text-white hover:bg-slate-800';

const ContestModal: React.FC<Props> = ({ isOpen, contest, onClose }) => {
  if (!isOpen || !contest) return null;

  const endLabel = contest.endDate ? new Date(contest.endDate).toLocaleDateString() : '미정';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200">
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900 truncate">{contest.title}</h3>
              <p className="text-xs text-slate-500 mt-1">마감일: {endLabel}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition"
              aria-label="close"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {contest.imageUrl ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                <img src={contest.imageUrl} alt="poster" className="w-full max-h-[360px] object-contain" />
              </div>
            ) : null}

            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {contest.description || '설명이 없습니다.'}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button onClick={onClose} className={btnSecondary}>
              닫기
            </button>
            <a href={contest.applyUrl} target="_blank" rel="noreferrer" className={btnPrimary}>
              <ExternalLink className="w-4 h-4" />
              신청/원문 열기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestModal;
