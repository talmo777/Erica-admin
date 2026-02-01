import React, { useState, useEffect } from 'react';
import { SupportRepository } from '../services/repository';
import { EmergencyTicket, InternalFeedback, TicketSeverity, TicketStatus } from '../types';

export const SupportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'emergency' | 'feedback'>('emergency');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">지원 및 피드백</h2>
      
      <div className="flex border-b border-gray-200">
        <button 
          className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'emergency' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('emergency')}
        >
          긴급 지원 (에러 신고)
        </button>
        <button 
          className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'feedback' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
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
  const [form, setForm] = useState<Partial<EmergencyTicket>>({ severity: TicketSeverity.NORMAL, type: '기타' });

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
        <button onClick={() => setIsFormOpen(!isFormOpen)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
          + 긴급 에러 신고
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <select 
              className="border p-2 rounded" 
              value={form.type} 
              onChange={e => setForm({...form, type: e.target.value as any})}
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
              onChange={e => setForm({...form, severity: e.target.value as any})}
            >
              {Object.values(TicketSeverity).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <textarea 
            placeholder="증상 및 재현 절차를 자세히 적어주세요." 
            className="w-full border p-2 rounded h-24"
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
            required
          />
          <button type="submit" className="w-full bg-gray-900 text-white py-2 rounded">제출하기</button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {tickets.map(t => (
           <div key={t.id} className="p-4 border-b last:border-0 flex justify-between items-start">
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${t.severity === TicketSeverity.CRITICAL ? 'bg-red-600' : 'bg-gray-500'}`}>{t.severity}</span>
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
  const [feedbacks, setFeedbacks] = useState<InternalFeedback[]>([]);
  const [description, setDescription] = useState('');

  useEffect(() => {
    SupportRepository.getFeedback().then(setFeedbacks);
  }, [description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await SupportRepository.saveFeedback({
      title: '새 피드백',
      content: description,
      type: '개선',
      importance: '중'
    });
    setDescription('');
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          type="text" 
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="관리자 페이지에 대한 건의사항을 남겨주세요." 
          className="flex-1 border p-3 rounded-lg"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-6 rounded-lg font-medium">등록</button>
      </form>

      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        {feedbacks.map(f => (
          <div key={f.id} className="p-3 bg-gray-50 rounded border border-gray-100">
             <p className="text-gray-800">{f.content}</p>
             <div className="mt-2 flex gap-2 text-xs text-gray-500">
               <span>{f.type}</span>
               <span>•</span>
               <span>{new Date(f.createdAt).toLocaleDateString()}</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};