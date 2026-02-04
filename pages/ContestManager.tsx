import React, { useMemo, useState } from 'react';
import { Contest, ContestCategory, ContestStatus, TARGET_OPTIONS } from '../types';
import { ContestRepository } from '../services/repository';
import { extractContestInfo } from '../services/aiExtract';

const contestRepository = new ContestRepository();

type Mode = 'create' | 'edit';

const emptyContest: Contest = {
  id: '',
  title: '',
  description: '',
  category: '교내 공모전',
  targets: [],
  applyUrl: '',
  posterUrl: '',
  startDate: '',
  endDate: '',
  status: 'draft',
  createdAt: '',
  updatedAt: '',
};

export const ContestManager: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>(() => contestRepository.getAll());
  const [mode, setMode] = useState<Mode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // form state
  const [form, setForm] = useState<Contest>({ ...emptyContest });
  const [step, setStep] = useState<1 | 2>(1);

  // upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);

  // ai state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const isEditing = mode === 'edit' && editingId;

  const sorted = useMemo(() => {
    return [...contests].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }, [contests]);

  const resetForm = () => {
    setMode('create');
    setEditingId(null);
    setForm({ ...emptyContest });
    setStep(1);
    setUploadFile(null);
    setUploadPreviewUrl(null);
    setAiLoading(false);
    setAiError(null);
  };

  const startEdit = (c: Contest) => {
    setMode('edit');
    setEditingId(c.id);
    setForm({ ...c });
    setStep(1);
    setUploadFile(null);
    setUploadPreviewUrl(null);
    setAiLoading(false);
    setAiError(null);
  };

  const onPickFile = (file: File | null) => {
    setUploadFile(file);
    setAiError(null);

    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    if (!file) {
      setUploadPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setUploadPreviewUrl(url);
  };

  const runAi = async () => {
    if (!uploadFile) {
      setAiError('파일을 먼저 업로드하세요.');
      return;
    }
    setAiLoading(true);
    setAiError(null);

    try {
      const r = await extractContestInfo(uploadFile);

      // ✅ AI가 채우는 대상: 제목요약/설명/주최주관/대상요약/일정(시작/마감)
      // 네 데이터 스키마에 organizer/host가 없어서 description에 넣는 구조로 합침.
      const blocks: string[] = [];
      if (r.host) blocks.push(`**주최/주관**: ${r.host}`);
      if (r.targetSummary) blocks.push(`**대상**: ${r.targetSummary}`);
      const dates: string[] = [];
      if (r.applyStartDate) dates.push(`신청 시작: ${r.applyStartDate}`);
      if (r.applyEndDate) dates.push(`신청 마감: ${r.applyEndDate}`);
      if (dates.length) blocks.push(`**일정**: ${dates.join(' / ')}`);
      if (blocks.length) blocks.push(''); // blank line

      const mergedDescription =
        (blocks.join('\n') + (r.description ? r.description : '')).trim();

      setForm((prev) => ({
        ...prev,
        // 제목은 실무자가 입력하는 게 원칙이지만, 추천이 있으면 title이 비어있을 때만 자동 채움
        title: prev.title?.trim() ? prev.title : (r.summaryTitle ?? prev.title),
        description: mergedDescription || prev.description,
        startDate: r.applyStartDate ?? prev.startDate,
        endDate: r.applyEndDate ?? prev.endDate,
      }));

      // STEP2(미리보기)로 이동
      setStep(2);
    } catch (e: any) {
      setAiError(e?.message ?? 'AI 내용 작성 중 오류');
    } finally {
      setAiLoading(false);
    }
  };

  const save = () => {
    // 최소 검증
    if (!form.title.trim()) return alert('공모전 제목은 필수입니다.');
    if (!form.applyUrl.trim()) return alert('신청 URL(Deep Link)은 필수입니다.');
    if (!form.category) return alert('카테고리를 선택하세요.');

    const now = new Date().toISOString();

    if (isEditing && editingId) {
      const updated: Contest = {
        ...form,
        id: editingId,
        updatedAt: now,
      };
      contestRepository.update(editingId, updated);
      setContests(contestRepository.getAll());
      resetForm();
      return;
    }

    const created: Contest = {
      ...form,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    contestRepository.create(created);
    setContests(contestRepository.getAll());
    resetForm();
  };

  const remove = (id: string) => {
    const ok = confirm('삭제할까요?');
    if (!ok) return;
    contestRepository.delete(id);
    setContests(contestRepository.getAll());
    if (editingId === id) resetForm();
  };

  const toggleTarget = (t: string) => {
    setForm((prev) => {
      const has = prev.targets.includes(t);
      return { ...prev, targets: has ? prev.targets.filter(x => x !== t) : [...prev.targets, t] };
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">공모전 게시/배포</h1>
        <button
          onClick={resetForm}
          className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50"
        >
          새 공모전 등록
        </button>
      </div>

      {/* ===== FORM ===== */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {step === 1 ? '1) 기본정보 + 파일 업로드' : '2) 미리보기/검토 후 게시'}
          </div>
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50"
            >
              ← 이전
            </button>
          )}
        </div>

        {step === 1 && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Title */}
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-medium">공모전 제목 *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder="예) ERICA 창업 경진대회"
              />
            </div>

            {/* Apply URL */}
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-medium">신청 URL (Deep Link) *</label>
              <input
                value={form.applyUrl}
                onChange={(e) => setForm({ ...form, applyUrl: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder="https://..."
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">카테고리</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ContestCategory })}
                className="w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="교내 공모전">교내 공모전</option>
                <option value="교외 공모전">교외 공모전</option>
                <option value="장학/지원">장학/지원</option>
                <option value="교육/프로그램">교육/프로그램</option>
                <option value="기타">기타</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">게시 상태</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ContestStatus })}
                className="w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="draft">DRAFT</option>
                <option value="published">PUBLISHED</option>
                <option value="archived">ARCHIVED</option>
              </select>
            </div>

            {/* Targets */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">게시 대상 (복수 선택 가능) *</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {TARGET_OPTIONS.map((t) => {
                  const checked = form.targets.includes(t);
                  return (
                    <label
                      key={t}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-slate-50/40 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTarget(t)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-800">{t}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Optional: poster URL */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">포스터 URL (선택)</label>
              <input
                value={form.posterUrl || ''}
                onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder="https://... (이미지 URL)"
              />
              <p className="text-xs text-slate-500">
                * 파일 업로드는 “AI 내용 작성”을 위한 입력이고, 실제 포스터 저장/호스팅은 별도(추후 스토리지 업로드로 연결 권장).
              </p>
            </div>

            {/* Upload */}
            <div className="md:col-span-2 rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">안내문/포스터 업로드</div>
                  <div className="text-xs text-slate-500">
                    이미지/ PDF/ 문서 업로드 → “내용 작성(AI)” 누르면 자동 정리 후 미리보기로 이동
                  </div>
                </div>

                <button
                  onClick={runAi}
                  disabled={aiLoading}
                  className={[
                    'px-4 py-2 rounded-xl text-sm font-semibold text-white',
                    aiLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-sky-700 hover:bg-sky-600'
                  ].join(' ')}
                >
                  {aiLoading ? '정리 중...' : '내용 작성(AI)'}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm"
                  />
                  {aiError && <div className="text-sm text-red-600">{aiError}</div>}
                </div>

                <div className="rounded-xl border bg-slate-50 p-3 min-h-[140px]">
                  <div className="text-xs text-slate-600 mb-2">미리보기(로컬)</div>
                  {!uploadPreviewUrl && (
                    <div className="text-sm text-slate-400">업로드하면 여기서 미리 볼 수 있어요.</div>
                  )}
                  {uploadPreviewUrl && uploadFile?.type.startsWith('image/') && (
                    <img src={uploadPreviewUrl} className="max-h-[220px] rounded-lg border" />
                  )}
                  {uploadPreviewUrl && uploadFile?.type === 'application/pdf' && (
                    <embed src={uploadPreviewUrl} type="application/pdf" className="w-full h-[220px] rounded-lg border bg-white" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Preview left */}
            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900 mb-3">미리보기</div>
              {uploadPreviewUrl ? (
                <>
                  {uploadFile?.type.startsWith('image/') && (
                    <img src={uploadPreviewUrl} className="w-full rounded-xl border bg-white" />
                  )}
                  {uploadFile?.type === 'application/pdf' && (
                    <embed src={uploadPreviewUrl} type="application/pdf" className="w-full h-[520px] rounded-xl border bg-white" />
                  )}
                </>
              ) : (
                <div className="text-sm text-slate-500">업로드된 파일이 없어요. (STEP1에서 업로드)</div>
              )}
            </div>

            {/* Editable right */}
            <div className="space-y-4">
              <div className="rounded-2xl border bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">AI가 정리한 본문(수정 가능)</div>
                <div className="text-xs text-slate-500 mt-1">
                  주최/주관, 대상 요약, 일정(시작/마감)을 상단에 붙여넣고 본문을 생성하는 방식
                </div>

                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-3 w-full min-h-[360px] px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-200 text-sm"
                  placeholder="AI 내용이 여기에 채워집니다."
                />

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">신청 시작(선택)</div>
                    <input
                      value={form.startDate || ''}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border text-sm"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">신청 마감(선택)</div>
                    <input
                      value={form.endDate || ''}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border text-sm"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl border text-sm hover:bg-slate-50"
                >
                  다시 추출/수정
                </button>
                <button
                  onClick={save}
                  className="px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
                >
                  {isEditing ? '수정 저장' : (form.status === 'published' ? '게시' : '저장')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== LIST ===== */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-sm font-semibold text-slate-900 mb-4">등록된 공모전</div>
        <div className="space-y-3">
          {sorted.length === 0 && <div className="text-sm text-slate-500">아직 등록된 공모전이 없습니다.</div>}
          {sorted.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-4 rounded-xl border p-4 hover:bg-slate-50">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">{c.title}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {c.category} · {c.status.toUpperCase()} · 대상 {c.targets.length}개 · 업데이트 {c.updatedAt?.slice(0, 10)}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => startEdit(c)}
                  className="px-3 py-2 rounded-lg border text-sm hover:bg-white"
                >
                  수정
                </button>
                <button
                  onClick={() => remove(c.id)}
                  className="px-3 py-2 rounded-lg border text-sm text-red-600 hover:bg-white"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
