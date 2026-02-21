import React, { useEffect, useMemo, useState } from 'react';
import { SupportRepository } from '../services/repository';
import { EmergencyTicket, TicketSeverity } from '../types';
import { useLocation } from 'react-router-dom';
import { AIRTABLE_FEEDBACK_EMBED_URL, AIRTABLE_FEEDBACK_FORM_URL } from '../constants';
import { AlertTriangle, MessageSquare, ExternalLink } from 'lucide-react';

type Tab = 'emergency' | 'feedback';

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

const card = 'bg-white rounded-2xl border border-slate-200 shadow-sm';
const btnBase =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-2';
const btnSecondary = btnBase + ' bg-white border border-slate-200 hover:bg-slate-50 text-slate-900';
const btnDanger =
  btnBase + ' bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600';

export const SupportPage: React.FC = () => {
  const location = useLocation();
  const initialTab: Tab = location.pathname.includes('feedback') ? 'feedback' : 'emergency';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">지원 및 피드백</h2>
        <p className="mt-1 text-sm text-slate-500">긴급 이슈 신고와 실무자 피드백을 한 곳에서 관리합니다.</p>
      </div>

      {/* Tabs */}
      <div className={cx(card, 'p-2 flex items-center gap-2')}>
        <TabButton
          active={activeTab === 'emergency'}
          onClick={() => setActiveTab('emergency')}
          icon={AlertTriangle}
          label="긴급 지원"
          desc="에러 신고"
        />
        <TabButton
          active={activeTab === 'feedback'}
          onClick={() => setActiveTab('feedback')}
          icon={MessageSquare}
          label="실무자 피드백"
          desc="요청/개선"
        />
      </div>

      {activeTab === 'emergency' ? <EmergencySection /> : <FeedbackSection />}
    </div>
  );
};

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex-1 rounded-2xl px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-2',
        active ? 'bg-sky-50 ring-1 ring-sky-200' : 'hover:bg-slate-50'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cx(
            'w-10 h-10 rounded-2xl flex items-center justify-center ring-1',
            active ? 'bg-white ring-slate-200 text-slate-900' : 'bg-slate-100 ring-slate-200 text-slate-700'
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-900">{label}</div>
          <div className="text-xs text-slate-500">{desc}</div>
        </div>
      </div>
    </button>
  );
}

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

  const severityTone = useMemo(() => {
    return (s?: TicketSeverity) =>
      s === TicketSeverity.CRITICAL
        ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : 'bg-slate-100 text-slate-700 ring-slate-200';
  }, []);

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
        <button onClick={() => setIsFormOpen((v) => !v)} className={btnDanger}>
          + 긴급 에러 신고
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className={cx(card, 'p-6 space-y-4')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabeledSelect
              label="유형"
              value={String(form.type ?? '')}
              onChange={(v) => setForm({ ...form, type: v as any })}
              options={[
                { value: '로그인', label: '로그인 문제' },
                { value: '게시', label: '게시 오류' },
                { value: '통계', label: '통계 오류' },
                { value: '크롤링', label: '크롤링 오류' },
                { value: '기타', label: '기타' },
              ]}
            />
            <LabeledSelect
              label="심각도"
              value={String(form.severity ?? '')}
              onChange={(v) => setForm({ ...form, severity: v as any })}
              options={Object.values(TicketSeverity).map((s) => ({ value: s, label: s }))}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-800">내용</div>
            <textarea
              placeholder="증상 및 재현 절차를 자세히 적어주세요. (예: 어떤 화면에서, 어떤 버튼을 눌렀을 때, 어떤 에러가 났는지)"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={5}
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className={cx(btnBase, 'bg-slate-900 text-white hover:bg-slate-800')}>
              제출하기
            </button>
          </div>
        </form>
      )}

      <div className={cx(card, 'overflow-hidden')}>
        {tickets.map((t) => (
          <div key={t.id} className="px-6 py-4 border-b border-slate-200 last:border-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cx('px-2 py-0.5 rounded-full text-xs font-bold ring-1', severityTone(t.severity))}>
                    {t.severity}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">[{t.type}]</span>
                  <span className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{t.description}</p>
              </div>
              <span className="shrink-0 px-2 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {t.status}
              </span>
            </div>
          </div>
        ))}
      {tickets.length === 0 && (
        <p className="p-10 text-center text-slate-400 text-sm">접수된 티켓이 없습니다.</p>
      )}
      </div>
    </div>
  );
};

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-slate-800">{label}</div>
      <select
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// --- Feedback Section ---
const FeedbackSection = () => {
  const [loading, setLoading] = useState(true);

  return (
    <div className="space-y-4">
      <div className={cx(card, 'p-5 flex items-center justify-between gap-4')}>
        <div className="min-w-0">
          <p className="font-extrabold text-slate-900">실무자 피드백 접수</p>
          <p className="text-sm text-slate-500 mt-1">아래 폼에 제목/내용/접수일시/작성자를 남겨주세요.</p>
        </div>
        <a href={AIRTABLE_FEEDBACK_FORM_URL} target="_blank" rel="noreferrer" className={cx(btnSecondary, 'shrink-0')}>
          <ExternalLink className="w-4 h-4" />
          새 창으로 열기
        </a>
      </div>

      <div className={cx(card, 'overflow-hidden relative')}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="flex items-center gap-3 text-slate-600">
              <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
              <div className="text-sm">폼 로딩중…</div>
            </div>
          </div>
        )}

        <iframe
          title="관리자 피드백 폼"
          src={AIRTABLE_FEEDBACK_EMBED_URL}
          className="w-full"
          style={{ height: 'calc(100vh - 280px)' }}
          frameBorder={0}
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
};
