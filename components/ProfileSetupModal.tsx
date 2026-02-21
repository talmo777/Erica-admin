import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminProfile } from '../types';
import { UserCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
}

export const ProfileSetupModal: React.FC<Props> = ({ open }) => {
  const { user, profile, saveProfile } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [contact, setContact] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // sync fields when profile loads
  useEffect(() => {
    if (profile) {
      if (profile.name) setName(profile.name);
      if (profile.role) setRole(profile.role);
      if (profile.contact) setContact(profile.contact);
    }
  }, [profile]);

  const email = user?.email ?? profile?.email ?? '';

  const handleSave = async () => {
    if (!name.trim()) return setError('이름은 필수입니다.');
    if (!role.trim()) return setError('직책은 필수입니다.');
    if (!contact.trim()) return setError('연락처는 필수입니다.');

    setSaving(true);
    setError(null);
    try {
      const p: AdminProfile = {
        name: name.trim(),
        role: role.trim(),
        contact: contact.trim(),
        email,
      };
      await saveProfile(p);
    } catch (e: any) {
      setError(e?.message ?? '저장에 실패했습니다. 다시 시도해주세요.');
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shrink-0">
            <UserCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900">프로필 설정</div>
            <p className="mt-0.5 text-xs text-slate-500">
              게시 이력 관리를 위해 기본 정보를 입력해주세요.
              <br />이 정보는 관리자 전용이며 사용자 웹에 노출되지 않습니다.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">이메일</label>
            <input
              value={email}
              readOnly
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              이름 <span className="text-rose-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              직책 <span className="text-rose-500">*</span>
            </label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="담당자 / 팀장 / 교수 등"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              연락처 <span className="text-rose-500">*</span>
            </label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="010-1234-5678"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
};
