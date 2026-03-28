import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_RAW = import.meta.env.VITE_BOARD_API_BASE_URL as string | undefined;
const API_BASE = API_BASE_RAW?.replace(/\/+$/, '');

export const RequestAccessPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = React.useState(user?.email ?? '');
  const [name, setName] = React.useState('');
  const [org, setOrg] = React.useState('');
  const [contact, setContact] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (!API_BASE) throw new Error('VITE_BOARD_API_BASE_URL is not set');

    setError(null);
    setDone(null);

    const e = email.trim().toLowerCase();
    if (!e) return setError('이메일은 필수입니다.');
    if (!name.trim()) return setError('이름은 필수입니다.');
    if (!org.trim()) return setError('소속은 필수입니다.');
    if (!contact.trim()) return setError('연락처는 필수입니다.');

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: e, name: name.trim(), org: org.trim(), contact: contact.trim() })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message ?? '요청 실패');

      setDone('접수 완료. 승인 후 재시도하시기 바랍니다.');
    } catch (e: any) {
      setError(e?.message ?? '요청 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 flex justify-center">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="text-xl font-extrabold text-slate-900">관리자 승인요청</div>
        <div className="text-sm text-slate-500 mt-1">
          제출하면 운영자가 Airtable에서 승인 처리합니다.
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">이메일</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              placeholder="example@hanyang.ac.kr"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              placeholder="홍길동"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">소속</label>
            <input
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              placeholder="OO팀 / OO학과"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">연락처</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              placeholder="전화번호 또는 메신저"
            />
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-rose-600">{error}</div>}
        {done && <div className="mt-4 text-sm text-emerald-700">{done}</div>}

        <div className="mt-6 flex gap-2">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 rounded-xl bg-slate-900 text-white py-3 font-semibold hover:bg-slate-800 transition disabled:opacity-60"
          >
            {loading ? '제출 중...' : '제출'}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="flex-1 rounded-xl border border-slate-200 bg-white text-slate-900 py-3 font-semibold hover:bg-slate-50 transition"
          >
            돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};
