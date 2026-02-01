// components/ContestModal.tsx
import React from 'react';
import { X } from 'lucide-react';
import { Contest } from '../types';

type Props = {
  isOpen: boolean;
  contest: Contest | null;
  onClose: () => void;
};

const ContestModal: React.FC<Props> = ({ isOpen, contest, onClose }) => {
  if (!isOpen || !contest) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="flex items-start justify-between p-4 border-b">
            <div className="pr-6">
              <h3 className="text-lg font-bold text-gray-900">{contest.title}</h3>
              <p className="text-xs text-gray-500 mt-1">
                마감일: {contest.endDate ? new Date(contest.endDate).toLocaleDateString() : '미정'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100"
              aria-label="close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {contest.imageUrl ? (
              <img
                src={contest.imageUrl}
                alt="poster"
                className="w-full max-h-64 object-contain bg-gray-50 rounded border"
              />
            ) : null}

            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {contest.description || '설명이 없습니다.'}
            </div>
          </div>

          <div className="p-4 border-t flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
            >
              닫기
            </button>
            <a
              href={contest.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 text-sm rounded bg-blue-900 text-white hover:bg-blue-800"
            >
              신청/원문 열기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestModal;
