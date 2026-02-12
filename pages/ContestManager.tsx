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
  | {
      open: true;
      title: string;
      message: string;
      confirmText?: string;
      danger?: boolean;
      onConfirm: () => Promise<void>;
    };

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

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

const btnBase =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition';
const btnSecondary = btnBase + ' bg-white border border-slate-200 hover:bg-slate-50';
const btnPrimary = btnBase + ' bg-sky-600 text-white hover:bg-sky-700';
const btnDanger =
  btnBase + ' bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600';

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

function Chip({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'sky' | 'rose' }) {
  const cls =
    tone === 'sky'
      ? 'bg-sky-50 text-sky-800 ring-1 ring-sky-200'
      : tone === 'rose'
      ? 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
      : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  return <span className={cx('px-2 py-0.5 rounded-full text-xs font-medium', cls)}>{children}</span>;
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
  const width = size === 'md' ? 'max-w-xl' : size === 'xl' ? 'max-w-5xl' : 'max-w-3xl';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={cx('w-full', width, 'bg-white rounded-2xl shadow-xl border overflow-hidden')}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="font-semibold text-slate-900">{title}</div>
            <button onClick={onClose} className={cx(btnSecondary, 'px-3 py-1.5 font-semibold')}>
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
            <div className="font-semibold text-slate-900">{state.title}</div>
          </div>
          <div className="px-6 py-5 text-sm text-slate-700 whitespace-pre-wrap">{state.message}</div>
          <div className="px-6 py-4 border-t flex gap-2 justify-end">
            <button onClick={onClose} className={btnSecondary}>
              취소
            </button>
            <button
              onClick={async () => {
                await state.onConfirm();
                onClose();
              }}
              className={state.danger ? btnDanger : btnPrimary}
            >
              {state.confirmText ?? '확인'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, right, children }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-bold text-slate-900">{title}</div>
          {subtitle && <div className="text-sm text-slate-500 mt-1">{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className="p-6">{children}</div>
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
    <div className="space-y-6">
      {/* AI Extract */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">AI 원문 요약/추출</div>
            <div className="text-xs text-slate-500 mt-1">원문 URL을 넣으면 제목/일정/신청링크 등을 자동 채웁니다.</div>
          </div>
          <Chip tone="sky">Option A</Chip>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={aiUrl}
            onChange={(e) => setAiUrl(e.target.value)}
            placeholder="원문 URL"
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
          <button onClick={runAiExtract} disabled={aiLoading} className={cx(btnPrimary, 'disabled:opacity-50')}>
            {aiLoading ? '분석중…' : 'AI 추출'}
          </button>
        </div>

        {aiResult && (
          <details className="mt-3">
            <summary className="text-xs text-slate-600 cursor-pointer">AI 결과 보기</summary>
            <pre className="mt-2 text-xs bg-white border border-slate-200 rounded-xl p-3 overflow-x-auto">
              {JSON.stringify(aiResult, null, 2)}
            </pre>
          </details>
        )}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800">제목</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800">신청 URL(Deep Link)</label>
          <input
            value={form.applyUrl}
            onChange={(e) => setForm({ ...form, applyUrl: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800">포스터 URL(선택)</label>
          <input
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800">포스터 업로드(선택)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800">카테고리</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ContestCategory })}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value={ContestCategory.CAMPUS}>{ContestCategory.CAMPUS}</option>
            <option value={ContestCategory.SUPPORTERS}>{ContestCategory.SUPPORTERS}</option>
            <option value={ContestCategory.ICPBL}>{ContestCategory.ICPBL}</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800">상태</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as ContestStatus })}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value={ContestStatus.DRAFT}>DRAFT</option>
            <option value={ContestStatus.PUBLISHED}>PUBLISHED</option>
            <option value={ContestStatus.ARCHIVED}>ARCHIVED</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800">시작일</label>
          <input
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="YYYY-MM-DD"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800">마감일</label>
          <input
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="YYYY-MM-DD"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800">설명</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full min-h-[180px] px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
      </div>

      {/* Targets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-800">게시 대상</label>
          <div className="text-xs text-slate-500">최소 1개 선택</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TARGET_OPTIONS.map((t) => {
            const checked = form.targets.includes(t as any);
            return (
              <label
                key={t}
                className={cx(
                  'flex items-center gap-2 px-3 py-2 rounded-2xl border',
                  'bg-white cursor-pointer hover:bg-slate-50 transition',
                  checked ? 'border-sky-300 ring-2 ring-sky-100' : 'border-slate-200'
                )}
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
                <span className="text-sm text-slate-800">{t}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="pt-2 flex gap-2 justify-end">
        <button onClick={onCancel} className={btnSecondary}>
          취소
        </button>
        <button onClick={onSubmit} className={btnPrimary}>
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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editModal, setEditModal] = useState<EditModalState>({ open: false, id: null });
  const [createSeed, setCreateSeed] = useState<Contest>(emptyContest);
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
        for (const id of ids) await deleteContest(id);
        await refresh();
        setSelectedIds(new Set());
      },
    });
  }

  const allChecked = list.length > 0 && selectedIds.size === list.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">공모전 게시/배포</h1>
            <p className="text-slate-500 mt-1">목록 조회 · 신규 등록 · 수정 · 삭제</p>
          </div>

          {view === 'list' ? (
            <div className="flex gap-2">
              <button onClick={refresh} className={btnSecondary}>
                새로고침
              </button>
              <button onClick={openCreate} className={btnPrimary}>
                새 공모전 작성
              </button>
            </div>
          ) : (
            <button onClick={() => setView('list')} className={btnSecondary}>
              목록으로
            </button>
          )}
        </div>

        {/* LIST VIEW */}
        {view === 'list' && (
          <SectionCard
            title="게시 목록"
            subtitle="목록을 클릭하면 팝업에서 바로 수정할 수 있습니다."
            right={
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={allChecked} onChange={(e) => toggleSelectAll(e.target.checked)} />
                  전체 선택
                </label>
                <div className="text-sm text-slate-500">
                  선택 <span className="font-bold text-slate-900">{selectedIds.size}</span> / {list.length}
                </div>
                <button disabled={selectedIds.size === 0} onClick={askDeleteSelected} className={btnDanger}>
                  선택 삭제
                </button>
              </div>
            }
          >
            {loading ? (
              <div className="text-slate-500">불러오는 중…</div>
            ) : list.length === 0 ? (
              <div className="text-slate-500">데이터가 없습니다.</div>
            ) : (
              <div className="space-y-3">
                {list.map((c) => {
                  const checked = selectedIds.has(c.id);
                  const statusTone = c.status === ContestStatus.PUBLISHED ? 'sky' : c.status === ContestStatus.ARCHIVED ? 'rose' : 'slate';

                  return (
                    <div
                      key={c.id}
                      className={cx(
                        'rounded-2xl border border-slate-200 bg-white',
                        'hover:shadow-sm hover:border-slate-300 transition',
                        'px-4 py-4'
                      )}
                    >
                      <div className="grid grid-cols-[24px_1fr_auto] gap-3 items-start">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleSelect(c.id, e.target.checked)}
                          className="mt-1"
                        />

                        <button className="text-left min-w-0" onClick={() => openEdit(c.id)}>
                          <div className="font-semibold text-slate-900 truncate">{c.title}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Chip>{c.category}</Chip>
                            <Chip tone={statusTone as any}>{c.status}</Chip>
                            {c.targets?.length ? <Chip tone="slate">대상 {c.targets.length}개</Chip> : null}
                          </div>
                        </button>

                        <button onClick={() => askDeleteOne(c.id)} className="text-xs font-semibold text-rose-600 hover:underline">
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        )}

        {/* CREATE VIEW */}
        {view === 'create' && (
          <SectionCard
            title="새 공모전 등록"
            subtitle="필수값: 제목, 신청 URL, 게시 대상"
            right={null}
          >
            <ContestForm
              mode="create"
              initial={createSeed}
              onCancel={() => setView('list')}
              onSaved={async () => {
                await refresh();
                setView('list');
              }}
            />
          </SectionCard>
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

        {/* CONFIRM MODAL */}
        <ConfirmModal state={confirm} onClose={() => setConfirm({ open: false })} />
      </div>
    </div>
  );
};

export default ContestManager;
