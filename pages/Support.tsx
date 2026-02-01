import React, { useState, useEffect } from 'react';
import { SupportRepository } from '../services/repository';
import { EmergencyTicket, TicketSeverity } from '../types';
import { useLocation } from 'react-router-dom';
import { AIRTABLE_FEEDBACK_EMBED_URL, AIRTABLE_FEEDBACK_FORM_URL } from '../constants';

export const SupportPage: React.FC = () => {
  const location = useLocation();
  const initialTab = location.pathname.includes('feedback') ? 'feedback' : 'emergency';
  const [activeTab, setActiveTab] = useState<'emergency' | 'feedback'>(initialTab);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">지원 및 피드백</h2>

      <div className="flex border-b border-gray-200">
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 ${
            activeTab === 'emergency'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('emergency')}
        >
          긴급 지원 (에러 신고)
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 ${
            activeTab === 'feedback'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('feedback')}
        >
          실무자 피드백
        </button>
      </div>

      {activeTab === 'emergency' ? <EmergencySection /> : <FeedbackSection />}
    </div>
  );
};

// --- Emergency Section ---
const EmergencySection = () => {
  const [tickets, setTickets] = useState<EmergencyTicket[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<Partial<EmergencyTicket>>({
    severity: TicketSeverity.NORMAL,
    type: '기타',
  });

  useEffect(() => {
    SupportRepository.getTickets().then(setTickets);
  }, [isFormOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description) return;
    await SupportRepository.saveTicket(form as any);
    setIsFormOpen(false);
    setForm({ severity: TicketSeverity.NORMAL, type: '기타', description: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
        >
          + 긴급 에러 신고
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <select
              className="border p-2 rounded"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
            >
              <option value="로그인">로그인 문제</option>
              <option value="게시">게시 오류</option>
              <option value="통계">통계 오류</option>
              <option value="크롤링">크롤링 오류</option>
              <option value="기타">기타</option>
            </select>
            <select
              className="border p-2 rounded"
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value as any })}
            >
              {Object.values(TicketSeverity).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <textarea
            placeholder="증상 및 재현 절차를 자세히 적어주세요."
            className="w-full border p-2 rounded h-24"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />

          <button type="submit" className="w-full bg-gray-900 text-white py-2 rounded">
            제출하기
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {tickets.map((t) => (
          <div key={t.id} className="p-4 border-b last:border-0 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                    t.severity === TicketSeverity.CRITICAL ? 'bg-red-600' : 'bg-gray-500'
                  }`}
                >
                  {t.severity}
                </span>
                <span className="font-bold text-gray-800">[{t.type}]</span>
                <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-gray-600 text-sm">{t.description}</p>
            </div>
            <span className="px-2 py-1 bg-gray-100 text-xs rounded">{t.status}</span>
          </div>
        ))}
        {tickets.length === 0 && <p className="p-4 text-center text-gray-500">접수된 티켓이 없습니다.</p>}
      </div>
    </div>
  );
};

// --- Feedback Section ---
const FeedbackSection = () => {
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg border flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800">실무자 피드백 접수</p>
          <p className="text-sm text-gray-500">아래 폼에 제목/내용/접수일시/작성자를 남겨주세요.</p>
        </div>
        <a
          href={AIRTABLE_FEEDBACK_FORM_URL}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          새 창으로 열기
        </a>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <iframe
          title="관리자 피드백 폼"
          src={AIRTABLE_FEEDBACK_EMBED_URL}
          className="w-full"
          style={{ height: 'calc(100vh - 260px)' }}
          frameBorder={0}
        />
      </div>
    </div>
  );
};

