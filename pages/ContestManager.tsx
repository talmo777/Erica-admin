import React, { useEffect, useMemo, useState } from 'react';
import { Send, RefreshCw, Plus, Trash2, Download, Image, ImageOff } from 'lucide-react';
import { Contest, ContestCategory, ContestStatus, TARGET_OPTIONS } from '../types';
import { extractContestInfo, AiExtractResult } from '../services/aiExtract';
import {
  getContests,
  createContest,
  patchContest,
  deleteContest,
  uploadPoster,
  triggerCrawl,
  extractFromUrlApi,
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
      body?: React.ReactNode;
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
  sourceUrl: '',
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

function getSourceSiteName(sourceUrl?: string): string {
  if (!sourceUrl) return '-';
  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./, '');
    const map: Record<string, string> = {
      'computing.hanyang.ac.kr': '소프트웨어융합대학',
      'newshyu.com': '한양뉴스',
      'hylu-e.hanyang.ac.kr': '비교과시스템',
      'global.hanyang.ac.kr': '국제처',
      'eec.hanyang.ac.kr': '창업교육센터',
      'icpbl.hanyang.ac.kr': 'IC-PBL',
      'information.hanyang.ac.kr': '학술정보관',
    };
    return map[hostname] ?? hostname;
  } catch {
    return sourceUrl;
  }
}

function toApiStatus(s: ContestStatus): 'draft' | 'published' | 'archived' {
  if (s === ContestStatus.PUBLISHED) return 'published';
  if (s === ContestStatus.ARCHIVED) return 'archived';
  return 'draft';
}

function toApiCategory(c: ContestCategory): string {
  return c; // enum value는 모두 API가 받는 필드와 일치
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
  const [processing, setProcessing] = useState(false);
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={processing ? undefined : onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <div className="font-semibold text-slate-900">{state.title}</div>
          </div>
          <div className="px-6 py-5 text-sm text-slate-700">
            {processing ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
                <span>처리 중입니다...</span>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap">{state.message}</p>
                {state.body && <div className="mt-3">{state.body}</div>}
              </>
            )}
          </div>
          <div className="px-6 py-4 border-t flex gap-2 justify-end">
            <button onClick={onClose} disabled={processing} className={cx(btnSecondary, 'disabled:opacity-40')}>
              취소
            </button>
            <button
              disabled={processing}
              onClick={async () => {
                setProcessing(true);
                try {
                  await state.onConfirm();
                } catch (e: any) {
                  console.error('작업 실패:', e);
                  alert(e?.message ?? '작업 중 오류가 발생했습니다.');
                } finally {
                  setProcessing(false);
                  onClose();
                }
              }}
              className={cx(state.danger ? btnDanger : btnPrimary, 'disabled:opacity-40')}
            >
              {processing ? '처리 중…' : (state.confirmText ?? '확인')}
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

  const [applyUrlError, setApplyUrlError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initial);
    setUploadFile(null);
    // 크롤링된 항목의 source_url을 AI 추출 URL로 자동 채우기
    setAiUrl(initial.sourceUrl || '');
    setAiResult(null);
    setAiDraft(null);
    setApplyUrlError(null);
    setDateError(null);
  }, [initial.id]);

  async function onSubmit() {
    if (!form.title.trim()) return alert('공모전 제목은 필수입니다.');
    if (!form.applyUrl.trim()) return alert('신청 URL(Deep Link)은 필수입니다.');
    if (!form.targets.length) return alert('게시 대상을 최소 1개 선택하세요.');

    // Validate applyUrl format
    const applyUrlTrimmed = form.applyUrl.trim();
    if (applyUrlTrimmed && !/^https?:\/\/.+/.test(applyUrlTrimmed)) {
      setApplyUrlError('신청 URL은 http:// 또는 https://로 시작해야 합니다.');
      return;
    } else {
      setApplyUrlError(null);
    }

    // Validate dates
    const startVal = form.startDate.trim();
    const endVal = form.endDate.trim();
    if (endVal) {
      const endParsed = new Date(endVal);
      if (Number.isNaN(endParsed.getTime())) {
        setDateError('마감일이 올바른 날짜 형식이 아닙니다. (예: YYYY-MM-DD)');
        return;
      }
      if (startVal) {
        const startParsed = new Date(startVal);
        if (!Number.isNaN(startParsed.getTime()) && endParsed < startParsed) {
          setDateError('마감일은 시작일보다 같거나 늦어야 합니다.');
          return;
        }
      }
    }
    setDateError(null);

    try {
      const description = aiDraft ? buildDescriptionOptionA(aiDraft) : form.description;

      let posterUrlToSave: string | null = form.imageUrl?.trim() ? form.imageUrl.trim() : null;
      if (!posterUrlToSave && uploadFile && uploadFile.type.startsWith('image/')) {
        const up = await uploadPoster(uploadFile);
        posterUrlToSave = typeof up === 'string' ? up : null;
      }

      const body: ApiContestUpsertBody = {
        title: form.title.trim(),
        description: description ?? '',
        applyUrl: form.applyUrl.trim(),
        posterUrl: posterUrlToSave,
        category: toApiCategory(form.category),
        targets: form.targets,
        startDate: dateOnlyOrNull(form.startDate),
        endDate: dateOnlyOrNull(form.endDate),
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

  // 포스터 이미지 파일을 AI로 분석 또는 URL에서 추출
  async function runAiExtract() {
    setAiLoading(true);
    setAiResult(null);
    setAiDraft(null);
    try {
      if (uploadFile) {
        // 포스터 파일이 있으면 AI 이미지 분석
        const res = await extractContestInfo(uploadFile);
        setAiResult(res);

        const draft: AiDraft = {
          titleSummary: res.titleSummary ?? '',
          organizer: res.organizer ?? '',
          target: res.target ?? '',
          scheduleStart: res.scheduleStart ?? '',
          scheduleEnd: res.scheduleEnd ?? '',
          body: res.description ?? '',
        };
        setAiDraft(draft);

        setForm((prev) => ({
          ...prev,
          title: res.titleSummary || prev.title,
          startDate: res.scheduleStart || prev.startDate,
          endDate: res.scheduleEnd || prev.endDate,
        }));
      } else if (aiUrl.trim()) {
        // URL만 있으면 웹페이지에서 추출
        const res = await extractFromUrlApi(aiUrl.trim());

        setForm((prev) => ({
          ...prev,
          imageUrl: res.posterUrl || prev.imageUrl,
          description: res.description || prev.description,
          startDate: res.startDate || prev.startDate,
          endDate: res.endDate || prev.endDate,
        }));

        const summary = [
          res.posterUrl ? '포스터 추출됨' : '포스터 없음',
          res.description ? `설명 ${res.description.length}자` : '설명 없음',
          res.endDate ? `마감일: ${res.endDate}` : '',
        ].filter(Boolean).join(', ');
        alert(`원문 추출 완료: ${summary}`);
      } else {
        alert('원문 URL을 입력하거나 포스터 이미지를 업로드하세요.');
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? '추출 실패');
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
            {aiLoading ? '추출중…' : uploadFile ? 'AI 추출' : '원문 추출'}
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
            onChange={(e) => {
              setForm({ ...form, applyUrl: e.target.value });
              if (applyUrlError) setApplyUrlError(null);
            }}
            className={cx(
              'w-full px-4 py-3 rounded-2xl border bg-white focus:outline-none focus:ring-2',
              applyUrlError
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-200 focus:ring-sky-200'
            )}
          />
          {applyUrlError && (
            <p className="text-xs text-rose-600 mt-1">{applyUrlError}</p>
          )}
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
            <option value={ContestCategory.EXTERNAL}>{ContestCategory.EXTERNAL}</option>
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
            onChange={(e) => {
              setForm({ ...form, startDate: e.target.value });
              if (dateError) setDateError(null);
            }}
            className={cx(
              'w-full px-4 py-3 rounded-2xl border bg-white focus:outline-none focus:ring-2',
              dateError
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-200 focus:ring-sky-200'
            )}
            placeholder="YYYY-MM-DD"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800">마감일</label>
          <input
            value={form.endDate}
            onChange={(e) => {
              setForm({ ...form, endDate: e.target.value });
              if (dateError) setDateError(null);
            }}
            className={cx(
              'w-full px-4 py-3 rounded-2xl border bg-white focus:outline-none focus:ring-2',
              dateError
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-200 focus:ring-sky-200'
            )}
            placeholder="YYYY-MM-DD"
          />
          {dateError && (
            <p className="text-xs text-rose-600 mt-1 col-span-2">{dateError}</p>
          )}
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
  const [crawling, setCrawling] = useState(false);

  // Fix 1: search / filter state
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'draft' | 'published' | 'archived'>('');
  const [unknownDeadlineOnly, setUnknownDeadlineOnly] = useState(false);

  // 마감일 미확인 항목 수 (빠른 뱃지 표시용)
  const unknownDeadlineCount = useMemo(
    () => list.filter((c) => c.description?.startsWith('[마감일 미확인]')).length,
    [list]
  );

  const filteredList = useMemo(() => {
    return list.filter((c) => {
      const matchesText = !searchText || c.title.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = !statusFilter || toApiStatus(c.status) === statusFilter;
      const matchesUnknown = !unknownDeadlineOnly || c.description?.startsWith('[마감일 미확인]');
      return matchesText && matchesStatus && matchesUnknown;
    });
  }, [list, searchText, statusFilter, unknownDeadlineOnly]);

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

  async function handleCrawl() {
    setCrawling(true);
    try {
      const result = await triggerCrawl();
      const count = result?.inserted ?? result?.count ?? 0;
      alert(`크롤링 완료! ${count > 0 ? `${count}건 새로 수집됨` : '새로운 데이터 없음'}`);
      await refresh();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? '크롤링 실패');
    } finally {
      setCrawling(false);
    }
  }

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
    setSelectedIds(new Set(filteredList.map((x) => x.id)));
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
        try { await refresh(); } catch { /* ignore */ }
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
    if (ids.length === 0) {
      alert('삭제할 항목을 선택하세요.');
      return;
    }

    setConfirm({
      open: true,
      title: '선택 삭제',
      message: `선택한 ${ids.length}건을 삭제하시겠습니까?\n(이 작업은 되돌릴 수 없습니다.)`,
      confirmText: '선택 삭제',
      danger: true,
      onConfirm: async () => {
        const errors: string[] = [];
        for (const id of ids) {
          try {
            await deleteContest(id);
          } catch (e: any) {
            errors.push(id);
            console.error(`삭제 실패: ${id}`, e);
          }
        }
        try { await refresh(); } catch { /* ignore */ }
        setSelectedIds(new Set());
        if (errors.length > 0) {
          alert(`${ids.length - errors.length}건 삭제 완료, ${errors.length}건 실패`);
        } else {
          alert(`${ids.length}건 삭제 완료`);
        }
      },
    });
  }

  const allChecked = filteredList.length > 0 && filteredList.every((c) => selectedIds.has(c.id));

  // Status counts derived from filteredList
  const filteredStatusCounts = useMemo(() => {
    let published = 0, draft = 0, archived = 0;
    for (const c of filteredList) {
      const s = toApiStatus(c.status);
      if (s === 'published') published++;
      else if (s === 'draft') draft++;
      else if (s === 'archived') archived++;
    }
    return { total: filteredList.length, published, draft, archived };
  }, [filteredList]);

  // Fix 2: bulk publish for draft items
  const selectedDraftIds = useMemo(
    () => Array.from(selectedIds).filter((id) => {
      const c = list.find((x) => x.id === id);
      return c && toApiStatus(c.status) === 'draft';
    }),
    [selectedIds, list]
  );

  function askBulkPublish() {
    if (selectedDraftIds.length === 0) return;

    const draftContests = selectedDraftIds
      .map((id) => list.find((x) => x.id === id))
      .filter((c): c is Contest => !!c);

    const previewItems = draftContests.slice(0, 5);
    const overflow = draftContests.length - previewItems.length;

    const previewBody = (
      <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
          게시 예정 목록
        </div>
        <ul className="divide-y divide-slate-100">
          {previewItems.map((c) => (
            <li key={c.id} className="px-3 py-2 flex items-start justify-between gap-3">
              <span className="text-slate-800 font-medium truncate max-w-[240px]">
                {c.title.length > 40 ? c.title.slice(0, 40) + '…' : c.title}
              </span>
              <div className="flex items-center gap-2 shrink-0 text-slate-500">
                <span>{c.category}</span>
                {c.endDate && <span className="text-slate-400">~ {c.endDate}</span>}
              </div>
            </li>
          ))}
          {overflow > 0 && (
            <li className="px-3 py-2 text-slate-400 italic">+ {overflow}개 더</li>
          )}
        </ul>
      </div>
    );

    setConfirm({
      open: true,
      title: '일괄 게시',
      message: `선택한 ${selectedDraftIds.length}개 공고를 게시하시겠습니까?`,
      body: previewBody,
      confirmText: '게시',
      danger: false,
      onConfirm: async () => {
        const errors: string[] = [];
        for (const id of selectedDraftIds) {
          try {
            await patchContest(id, { status: 'published' });
          } catch (e: any) {
            errors.push(id);
            console.error(`게시 실패: ${id}`, e);
          }
        }
        try { await refresh(); } catch { /* ignore */ }
        setSelectedIds(new Set());
        if (errors.length > 0) {
          alert(`${selectedDraftIds.length - errors.length}건 게시 완료, ${errors.length}건 실패`);
        } else {
          alert(`${selectedDraftIds.length}건 게시 완료`);
        }
      },
    });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">공모전 게시/배포</h1>
            <p className="text-xs text-slate-500">목록 조회 · 신규 등록 · 수정 · 삭제</p>
          </div>
        </div>

        {view === 'list' ? (
          <div className="flex gap-2">
            <button onClick={handleCrawl} disabled={crawling} className={cx(btnSecondary, 'gap-1.5 disabled:opacity-50')}>
              <Download className={cx('w-4 h-4', crawling && 'animate-bounce')} />
              {crawling ? '수집 중…' : '정보 가져오기'}
            </button>
            <button onClick={refresh} className={cx(btnSecondary, 'gap-1.5')}>
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
            <button onClick={openCreate} className={cx(btnPrimary, 'gap-1.5')}>
              <Plus className="w-4 h-4" />
              새 공모전
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* 검색/필터 바 */}
          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="제목 검색..."
              className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="">전체</option>
              <option value="draft">검수 대기</option>
              <option value="published">게시됨</option>
              <option value="archived">보관</option>
            </select>
            {/* 마감일 미확인 필터 토글 */}
            <button
              onClick={() => setUnknownDeadlineOnly((v) => !v)}
              className={cx(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition',
                unknownDeadlineOnly
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200'
              )}
            >
              ⚠️ 마감일 미확인
              {unknownDeadlineCount > 0 && (
                <span className="ml-1 bg-amber-200 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {unknownDeadlineCount}
                </span>
              )}
            </button>
          </div>

          {/* 툴바 */}
          <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                전체 선택
              </label>
              <span className="text-xs text-slate-400">
                {selectedIds.size > 0 ? (
                  <span className="text-sky-600 font-semibold">{selectedIds.size}개 선택됨</span>
                ) : (
                  `총 ${filteredList.length}개${filteredList.length !== list.length ? ` (전체 ${list.length}개)` : ''}`
                )}
              </span>
              {/* 상태별 요약 */}
              <span className="text-xs text-slate-400 select-none">
                전체 {filteredStatusCounts.total}개
                <span className="mx-1 text-slate-300">|</span>
                <span className="text-emerald-600 font-medium">게시됨 {filteredStatusCounts.published}개</span>
                <span className="mx-1 text-slate-300">|</span>
                <span className="text-amber-600 font-medium">대기 {filteredStatusCounts.draft}개</span>
                <span className="mx-1 text-slate-300">|</span>
                <span className="text-slate-500 font-medium">보관 {filteredStatusCounts.archived}개</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Fix 2: 선택 일괄 게시 버튼 */}
              {selectedDraftIds.length > 0 && (
                <button onClick={askBulkPublish} className={cx(btnPrimary, 'text-xs px-3 py-1.5 gap-1.5')}>
                  선택 일괄 게시 ({selectedDraftIds.length})
                </button>
              )}
              {selectedIds.size > 0 && (
                <button onClick={askDeleteSelected} className={cx(btnDanger, 'text-xs px-3 py-1.5 gap-1.5')}>
                  <Trash2 className="w-3.5 h-3.5" />
                  선택 삭제 ({selectedIds.size})
                </button>
              )}
            </div>
          </div>

          {/* 리스트 */}
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="px-6 py-12 text-center text-slate-400">불러오는 중…</div>
            ) : filteredList.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                {list.length === 0 ? '데이터가 없습니다.' : '검색 결과가 없습니다.'}
              </div>
            ) : (
              filteredList.map((c) => {
                const checked = selectedIds.has(c.id);
                const statusTone = c.status === ContestStatus.PUBLISHED ? 'sky' : c.status === ContestStatus.ARCHIVED ? 'rose' : 'slate';

                return (
                  <div
                    key={c.id}
                    className={cx(
                      'px-5 py-4 flex items-center gap-4 transition-colors',
                      'hover:bg-slate-50',
                      checked && 'bg-sky-50/50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleSelect(c.id, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 shrink-0"
                    />

                    {/* 포스터 썸네일 or 상태 */}
                    <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                      {c.imageUrl ? (
                        <>
                          <img
                            src={c.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                              const fallback = img.nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.style.display = '';
                            }}
                          />
                          <ImageOff className="w-4 h-4 text-slate-300" style={{ display: 'none' }} />
                        </>
                      ) : (
                        <ImageOff className="w-4 h-4 text-slate-300" />
                      )}
                    </div>

                    <button className="flex-1 text-left min-w-0" onClick={() => openEdit(c.id)}>
                      <div className="font-semibold text-slate-900 truncate">{c.title}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Chip>{c.category}</Chip>
                        <Chip tone={statusTone as any}>{c.status}</Chip>
                        {/* 데이터 출처 chip */}
                        {c.sourceUrl ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                            자동수집
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                            수동등록
                          </span>
                        )}
                        {/* Fix 3: source site */}
                        {c.sourceUrl && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ring-1 ring-slate-200">
                            {getSourceSiteName(c.sourceUrl)}
                          </span>
                        )}
                        {c.imageUrl ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Image className="w-3 h-3" />포스터</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400"><ImageOff className="w-3 h-3" />포스터 없음</span>
                        )}
                        {c.targets?.length ? <Chip tone="slate">대상 {c.targets.length}개</Chip> : null}
                        {c.endDate && <span className="text-xs text-slate-400">마감: {c.endDate}</span>}
                      </div>
                    </button>

                    <button
                      onClick={() => askDeleteOne(c.id)}
                      className="shrink-0 w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
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
  );
};

export default ContestManager;
