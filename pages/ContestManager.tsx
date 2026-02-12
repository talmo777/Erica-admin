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

type View = 'list' | 'create';
type EditModalState = { open: boolean; id: string | null };
type ConfirmState =
  | { open: false }
  | { open: true; title: string; message: string; confirmText?: string; danger?: boolean; onConfirm: () => Promise<void> };

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

function Modal({
  open,
  title,
  children,
  onClose,
  size = 'lg',
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const width =
    size === 'md' ? 'max-w-xl' : size === 'xl' ? 'max-w-5xl' : 'max-w-3xl';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={`w-full ${width} bg-white rounded-2xl shadow-xl border overflow-hidden`}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="font-semibold">{title}</div>
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg hover:bg-slate-100">
              닫기
            </button>
          </div>
          <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <div className="font-semibold">{state.title}</div>
          </div>
          <div className="px-6 py-5 text-sm text-slate-700 whitespace-pre-wrap">{state.message}</div>
          <div className="px-6 py-4 border-t flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border bg-white hover:bg-slate-50">
              취소
            </button>
            <button
              onClick={async () => {
                await state.onConfirm();
                onClose();
              }}
              className={[
                'px-4 py-2 rounded-xl text-white',
                state.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-sky-600 hover:bg-sky-700',
              ].join(' ')}
            >
              {state.confirmText ?? '확인'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContestForm({
  mode,
  initial,
  onCancel,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initial: Contest;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<Contest>(initial);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [aiUrl, setAiUrl] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiExtractResult | null>(null);
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);

  useEffect(() => {
    setForm(initial);
    setUploadFile(null);
    setAiUrl('');
    setAiResult(null);
    setAiDraft(null);
  }, [initial.id]);

  async function onSubmit() {
    if (!form.title.trim()) return alert('공모전 제목은 필수입니다.');
    if (!form.applyUrl.trim()) return alert('신청 URL(Deep Link)은 필수입니다.');
    if (!form.targets.length) return alert('게시 대상을 최소 1개 선택하세요.');

    try {
      const description = aiDraft ? buildDescriptionOptionA(aiDraft) : form.description;

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

      if (mode === 'edit') {
        await patchContest(form.id, body);
      } else {
        await createContest(body);
      }

      await onSaved();
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

      const draft: AiDraft = {
        titleSummary: res.title_summary ?? '',
        organizer: res.organizer ?? '',
        target: res.target ?? '',
        scheduleStart: res.schedule_start ?? '',
        scheduleEnd: res.schedule_end ?? '',
        body: res.body ?? '',
      };
      setAiDraft(draft);

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
    <div className="space-y-5">
      {/* AI Extract */}
      <div className="p-4 rounded-xl border bg-slate-50">
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

      {/* Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">제목</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">신청 URL(Deep Link)</label>
          <input
            value={form.applyUrl}
            onChange={(e) => setForm({ ...form, applyUrl: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">포스터 URL(선택)</label>
          <input
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">포스터 업로드(선택)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="w-full"
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
          className="w-full min-h-[160px] px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
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

      <div className="pt-2 flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-3 rounded-xl bg-white border hover:bg-slate-50">
          취소
        </button>
        <button onClick={onSubmit} className="px-5 py-3 rounded-xl bg-sky-600 text-white hover:bg-sky-700">
          {mode === 'edit' ? '수정 저장' : '등록'}
        </button>
      </div>
    </div>
  );
}

export const ContestManager: React.FC = () => {
  const [view, setView] = useState<View>('list');

  const [list, setList] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(false);

  // selection for bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // edit modal
  const [editModal, setEditModal] = useState<EditModalState>({ open: false, id: null });

  // create page form state
  const [createSeed, setCreateSeed] = useState<Contest>(emptyContest);

  // confirm modal state
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });

  const selectedContest = useMemo(
    () => (editModal.id ? list.find((x) => x.id === editModal.id) ?? null : null),
    [editModal.id, list]
  );

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

  function openCreate() {
    setCreateSeed(emptyContest);
    setView('create');
    setSelectedIds(new Set());
    setEditModal({ open: false, id: null });
  }

  function openEdit(id: string) {
    setEditModal({ open: true, id });
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(list.map((x) => x.id)));
  }

  function askDeleteOne(id: string) {
    const c = list.find((x) => x.id === id);
    setConfirm({
      open: true,
      title: '삭제 확인',
      message: `정말 삭제하시겠습니까?\n\n- ${c?.title ?? id}`,
      confirmText: '삭제',
      danger: true,
      onConfirm: async () => {
        await deleteContest(id);
        await refresh();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
    });
  }

  function askDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setConfirm({
      open: true,
      title: '선택 삭제',
      message: `선택한 ${ids.length}건을 삭제하시겠습니까?\n(이 작업은 되돌릴 수 없습니다.)`,
      confirmText: '선택 삭제',
      danger: true,
      onConfirm: async () => {
        // 단순/안전: 순차 삭제
        for (const id of ids) {
          await deleteContest(id);
        }
        await refresh();
        setSelectedIds(new Set());
      },
    });
  }

  const allChecked = list.length > 0 && selectedIds.size === list.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">공모전 게시/배포</h1>
            <p className="text-slate-600 mt-1">목록 조회 · 신규 등록 · 수정 · 삭제</p>
          </div>

          {view === 'list' ? (
            <div className="flex gap-2">
              <button
                onClick={refresh}
                className="px-4 py-2 rounded-xl bg-white border hover:bg-slate-100"
              >
                새로고침
              </button>
              <button
                onClick={openCreate}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
              >
                새 공모전 작성
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView('list')}
              className="px-4 py-2 rounded-xl bg-white border hover:bg-slate-100"
            >
              목록으로
            </button>
          )}
        </div>

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                  전체 선택
                </label>

                <div className="text-sm text-slate-500">
                  선택: <span className="font-semibold">{selectedIds.size}</span> / {list.length}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={selectedIds.size === 0}
                  onClick={askDeleteSelected}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40"
                >
                  선택 삭제
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-slate-500">불러오는 중...</div>
            ) : list.length === 0 ? (
              <div className="text-slate-500">데이터가 없습니다.</div>
            ) : (
              <div className="space-y-3">
                {list.map((c) => {
                  const checked = selectedIds.has(c.id);
                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl border hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleSelect(c.id, e.target.checked)}
                            className="mt-1"
                          />
                          <div
                            className="cursor-pointer"
                            onClick={() => openEdit(c.id)}
                          >
                            <div className="font-medium">{c.title}</div>
                            <div className="text-sm text-slate-500 mt-1">
                              {c.category} · {c.status}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => askDeleteOne(c.id)}
                          className="text-sm text-rose-600 hover:underline"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CREATE VIEW */}
        {view === 'create' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">새 공모전 등록</h2>
            </div>

            <ContestForm
              mode="create"
              initial={createSeed}
              onCancel={() => setView('list')}
              onSaved={async () => {
                await refresh();
                setView('list');
              }}
            />
          </div>
        )}

        {/* EDIT MODAL */}
        <Modal
          open={editModal.open && !!selectedContest}
          title="공모전 수정"
          onClose={() => setEditModal({ open: false, id: null })}
          size="xl"
        >
          {selectedContest && (
            <ContestForm
              mode="edit"
              initial={selectedContest}
              onCancel={() => setEditModal({ open: false, id: null })}
              onSaved={async () => {
                await refresh();
                setEditModal({ open: false, id: null });
              }}
            />
          )}
        </Modal>

        {/* CONFIRM MODAL (centered) */}
        <ConfirmModal state={confirm} onClose={() => setConfirm({ open: false })} />
      </div>
    </div>
  );
};

export default ContestManager;
