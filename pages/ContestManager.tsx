import React, { useEffect, useMemo, useState } from 'react';
import { Contest, ContestCategory, ContestStatus, TARGET_OPTIONS } from '../types';
import { extractContestInfo, AiExtractResult } from '../services/aiExtract';
import {
  getContests,
  createContest,
  patchContest,
  deleteContest,
  uploadPoster,
  ApiContestUpsertBody,
} from '../services/api';
import { mapApiContestToContest } from '../services/contestMapper';

type Mode = 'create' | 'edit';

const emptyContest: Contest = {
  id: '',
  title: '',
  description: '',
  imageUrl: '',
  applyUrl: '',
  category: ContestCategory.CAMPUS,
  status: ContestStatus.DRAFT,
  targets: [],
  startDate: '',
  endDate: '',
  createdAt: '',
  updatedAt: '',
  viewCount: 0,
};

type AiDraft = {
  titleSummary: string;
  organizer: string;
  target: string;
  scheduleStart: string;
  scheduleEnd: string;
  body: string;
};

function buildDescriptionOptionA(d: AiDraft): string {
  const lines: string[] = [];
  lines.push('[AI 요약]');
  lines.push(`- 제목요약: ${d.titleSummary || '-'}`);
  lines.push(`- 주최/주관: ${d.organizer || '-'}`);
  lines.push(`- 대상: ${d.target || '-'}`);

  const sched = `${d.scheduleStart || ''} ~ ${d.scheduleEnd || ''}`.trim();
  lines.push(`- 일정: ${sched || '-'}`);
  lines.push('');
  lines.push('[본문]');
  lines.push(d.body || '');
  return lines.join('\n').trim();
}

function toApiStatus(s: ContestStatus): 'draft' | 'published' | 'archived' {
  if (s === ContestStatus.PUBLISHED) return 'published';
  if (s === ContestStatus.ARCHIVED) return 'archived';
  return 'draft';
}

function toApiCategory(c: ContestCategory): '서포터즈' | 'ICPBL' | '교내 공모전' {
  return c as any;
}

function dateOnlyOrNull(v?: string): string | null {
  const s = (v ?? '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export const ContestManager: React.FC = () => {
  const [mode, setMode] = useState<Mode>('create');
  const [list, setList] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [form, setForm] = useState<Contest>(emptyContest);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [aiUrl, setAiUrl] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiExtractResult | null>(null);
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);

  const selected = useMemo(() => list.find((x) => x.id === selectedId) ?? null, [list, selectedId]);

  async function refresh() {
    setLoading(true);
    try {
      const rows = await getContests();
      setList(rows.map(mapApiContestToContest));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function resetForm() {
    setMode('create');
    setSelectedId(null);
    setForm(emptyContest);
    setUploadFile(null);
    setAiUrl('');
    setAiResult(null);
    setAiDraft(null);
  }

  function loadForEdit(c: Contest) {
    setMode('edit');
    setSelectedId(c.id);
    setForm({
      ...c,
      imageUrl: c.imageUrl || '',
      description: c.description || '',
    });
    setUploadFile(null);
    setAiDraft(null);
  }

  async function onDelete(id: string) {
    if (!confirm('삭제할까요?')) return;
    await deleteContest(id);
    await refresh();
    resetForm();
  }

  async function onSubmit() {
    if (!form.title.trim()) return alert('공모전 제목은 필수입니다.');
    if (!form.applyUrl.trim()) return alert('신청 URL(Deep Link)은 필수입니다.');
    if (!form.targets.length) return alert('게시 대상을 최소 1개 선택하세요.');

    try {
      const description = aiDraft ? buildDescriptionOptionA(aiDraft) : form.description;

      // ✅ 1) posterUrl 결정:
      // - form.imageUrl에 이미 URL이 있으면 그걸 사용
      // - 없고 uploadFile이 이미지면 업로드해서 URL 생성
      let posterUrlToSave: string | null = form.imageUrl?.trim() ? form.imageUrl.trim() : null;

      if (!posterUrlToSave && uploadFile && uploadFile.type.startsWith('image/')) {
        const up = await uploadPoster(uploadFile);
        posterUrlToSave = up.posterUrl;
      }

      const body: ApiContestUpsertBody = {
        title: form.title.trim(),
        description: description ?? '',
        apply_url: form.applyUrl.trim(),
        poster_url: posterUrlToSave,
        category: toApiCategory(form.category),
        targets: form.targets,
        start_date: dateOnlyOrNull(form.startDate),
        end_date: dateOnlyOrNull(form.endDate),
        status: toApiStatus(form.status),
      };

      if (mode === 'edit' && selectedId) {
        await patchContest(selectedId, body);
      } else {
        await createContest(body);
      }

      await refresh();
      resetForm();
      alert('저장 완료');
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? '저장 실패');
    }
  }

  async function runAiExtract() {
    if (!aiUrl.trim()) return alert('원문 URL을 입력하세요.');
    setAiLoading(true);
    setAiResult(null);
    setAiDraft(null);
    try {
      const res = await extractContestInfo(aiUrl.trim());
      setAiResult(res);

      // AI 결과 → Draft 변환(Option A)
      const draft: AiDraft = {
        titleSummary: res.title_summary ?? '',
        organizer: res.organizer ?? '',
        target: res.target ?? '',
        scheduleStart: res.schedule_start ?? '',
        scheduleEnd: res.schedule_end ?? '',
        body: res.body ?? '',
      };
      setAiDraft(draft);

      // 폼 자동 채우기(필요 최소)
      setForm((prev) => ({
        ...prev,
        title: res.title || prev.title,
        applyUrl: res.apply_url || prev.applyUrl,
        startDate: res.schedule_start || prev.startDate,
        endDate: res.schedule_end || prev.endDate,
      }));
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? 'AI 추출 실패');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">공모전 등록/관리</h1>
            <p className="text-slate-600 mt-1">공모전 생성, 수정, 삭제 및 AI 요약을 지원합니다.</p>
          </div>
          <button
            onClick={resetForm}
            className="px-4 py-2 rounded-xl bg-white border hover:bg-slate-100"
          >
            새로 작성
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: List */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">목록</h2>
              <button
                onClick={refresh}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm"
              >
                새로고침
              </button>
            </div>

            {loading ? (
              <div className="text-slate-500">불러오는 중...</div>
            ) : list.length === 0 ? (
              <div className="text-slate-500">데이터가 없습니다.</div>
            ) : (
              <div className="space-y-3">
                {list.map((c) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-xl border cursor-pointer hover:bg-slate-50 ${
                      selectedId === c.id ? 'ring-2 ring-sky-200 border-sky-200' : ''
                    }`}
                    onClick={() => loadForEdit(c)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium">{c.title}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          {c.category} · {c.status}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(c.id);
                        }}
                        className="text-sm text-rose-600 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Form */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="font-semibold mb-4">{mode === 'edit' ? '수정' : '새 공모전 등록'}</h2>

            {/* AI Extract */}
            <div className="p-4 rounded-xl border bg-slate-50 mb-6">
              <div className="text-sm font-medium mb-2">AI 원문 요약/추출</div>
              <div className="flex gap-2">
                <input
                  value={aiUrl}
                  onChange={(e) => setAiUrl(e.target.value)}
                  placeholder="원문 URL"
                  className="flex-1 px-3 py-2 rounded-lg border bg-white"
                />
                <button
                  onClick={runAiExtract}
                  disabled={aiLoading}
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {aiLoading ? '분석중...' : 'AI 추출'}
                </button>
              </div>

              {aiResult && (
                <div className="mt-3 text-xs text-slate-600 whitespace-pre-wrap">
                  <div className="font-medium mb-1">AI 결과</div>
                  {JSON.stringify(aiResult, null, 2)}
                </div>
              )}
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">제목</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="예: 2026 HY-LINK 아이디어 공모전"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">신청 URL(Deep Link)</label>
                <input
                  value={form.applyUrl}
                  onChange={(e) => setForm({ ...form, applyUrl: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">포스터 URL(선택)</label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">카테고리</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as ContestCategory })}
                  className="w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value={ContestCategory.CAMPUS}>{ContestCategory.CAMPUS}</option>
                  <option value={ContestCategory.SUPPORTERS}>{ContestCategory.SUPPORTERS}</option>
                  <option value={ContestCategory.ICPBL}>{ContestCategory.ICPBL}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">상태</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ContestStatus })}
                  className="w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value={ContestStatus.DRAFT}>DRAFT</option>
                  <option value={ContestStatus.PUBLISHED}>PUBLISHED</option>
                  <option value={ContestStatus.ARCHIVED}>ARCHIVED</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">시작일</label>
                  <input
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">마감일</label>
                  <input
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">설명</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full min-h-[140px] px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="공모전 상세 설명"
                />
              </div>

              {/* Upload poster */}
              <div className="space-y-2">
                <label className="text-sm font-medium">포스터 업로드(선택)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="w-full"
                />
              </div>

              {/* Targets */}
              <div className="space-y-2">
                <label className="text-sm font-medium">게시 대상</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TARGET_OPTIONS.map((t) => {
                    const checked = form.targets.includes(t as any);
                    return (
                      <label
                        key={t}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border bg-white cursor-pointer hover:bg-slate-50 ${
                          checked ? 'ring-2 ring-sky-200 border-sky-200' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...form.targets, t as any]
                              : form.targets.filter((x) => x !== (t as any));
                            setForm({ ...form, targets: next });
                          }}
                        />
                        <span className="text-sm">{t}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={onSubmit}
                  className="flex-1 px-4 py-3 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
                >
                  {mode === 'edit' ? '수정 저장' : '등록'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-3 rounded-xl bg-white border hover:bg-slate-100"
                >
                  초기화
                </button>
              </div>
            </div>

            {selected && (
              <div className="mt-6 p-4 rounded-xl border bg-slate-50">
                <div className="text-sm font-medium mb-2">선택된 공고</div>
                <div className="text-sm text-slate-600 whitespace-pre-wrap">{selected.title}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestManager;
