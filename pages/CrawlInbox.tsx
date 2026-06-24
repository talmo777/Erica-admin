import React, { useEffect, useMemo, useState } from 'react';
import {
  Inbox, RefreshCw, Search, Image as ImageIcon, ImageOff, Paperclip,
  ExternalLink, Check, EyeOff, Send, CircleAlert, Calendar as CalendarIcon, Globe,
  History, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  getNotices, getSources, getRuns, runCrawl, setNoticeStatus, pingCrawler,
  daysAgo, todayStr, RawNotice, NoticeStatus, SourceMeta, RunRecord,
} from '../services/crawlerApi';

function cx(...c: Array<string | false | undefined | null>) {
  return c.filter(Boolean).join(' ');
}

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.round(h / 24)}일 전`;
}

const btnBase = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-40';
const btnPrimary = btnBase + ' bg-sky-600 text-white hover:bg-sky-700';
const btnSecondary = btnBase + ' bg-white border border-slate-200 hover:bg-slate-50 text-slate-700';

// "한양" badge = 전 캠퍼스 공통 → ERICA 학생에게도 해당. 기본값은 ERICA+공통.
const CAMPUS_OPTS = [
  { value: 'ERICA,한양', label: 'ERICA + 공통 (권장)' },
  { value: 'ERICA', label: 'ERICA만' },
  { value: 'all', label: '전체 캠퍼스' },
  { value: '서울', label: '서울' },
  { value: '한양', label: '공통(한양)만' },
];

const STATUS_META: Record<NoticeStatus, { label: string; cls: string }> = {
  new: { label: '신규', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  reviewed: { label: '검토함', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  ignored: { label: '무시', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
  promoted: { label: '공모전 후보', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
};

export const CrawlInbox: React.FC = () => {
  const [items, setItems] = useState<RawNotice[]>([]);
  const [sources, setSources] = useState<SourceMeta[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [online, setOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const [campus, setCampus] = useState('ERICA,한양');
  const [from, setFrom] = useState(daysAgo(20));
  const [to, setTo] = useState(todayStr());

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | NoticeStatus>('all');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [srcFilter, setSrcFilter] = useState<string>('all');
  const [detail, setDetail] = useState<RawNotice | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);

  const srcLabel = useMemo(() => {
    const m: Record<string, string> = {};
    sources.forEach((s) => { m[s.id] = s.label; });
    return (id: string) => m[id] ?? id;
  }, [sources]);

  const anyCampusSource = useMemo(
    () => sources.some((s) => selected.has(s.id) && s.supportsCampus),
    [sources, selected]
  );

  const flash = (kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const refresh = async () => {
    try {
      const [its, rs] = await Promise.all([getNotices(), getRuns()]);
      setItems(its);
      setRuns(rs);
    } catch (e: any) { flash('err', `목록 로드 실패: ${e?.message ?? e}`); }
  };

  useEffect(() => {
    (async () => {
      const ok = await pingCrawler();
      setOnline(ok);
      if (ok) {
        try {
          const srcs = await getSources();
          setSources(srcs);
          setSelected(new Set(srcs.filter((s) => s.enabled).map((s) => s.id)));
        } catch { /* ignore */ }
        await refresh();
      }
      setLoading(false);
    })();
  }, []);

  const toggleSource = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const doCrawl = async (f: string | null, t: string | null, label: string) => {
    if (crawling) return;
    if (selected.size === 0) { flash('err', '크롤할 소스를 1개 이상 선택하세요.'); return; }
    setCrawling(true);
    flash('ok', `${label} 크롤링 시작… (소스 ${selected.size}개)`);
    try {
      const r = await runCrawl({ sources: [...selected], from: f, to: t, campus });
      await refresh();
      const per = Object.entries(r.perSource).map(([k, v]) => `${srcLabel(k)} ${v}`).join(', ');
      flash('ok', `${label} 완료 · 신규 ${r.added} / 수집 ${r.crawled} (${per}) · 총 ${r.total}건 ${(r.elapsedMs / 1000).toFixed(1)}s`);
    } catch (e: any) {
      flash('err', `크롤링 실패: ${e?.message ?? e}`);
    } finally {
      setCrawling(false);
    }
  };

  const preset = (days: number | null, label: string) => {
    if (days === null) { setFrom(''); setTo(''); doCrawl(null, null, label); return; }
    const f = days === 0 ? todayStr() : daysAgo(days);
    const t = todayStr();
    setFrom(f); setTo(t);
    doCrawl(f, t, label);
  };

  const changeStatus = async (post_id: string, status: NoticeStatus) => {
    setItems((prev) => prev.map((it) => (it.post_id === post_id ? { ...it, status } : it)));
    try { await setNoticeStatus(post_id, status); }
    catch (e: any) { flash('err', `상태 변경 실패: ${e?.message ?? e}`); await refresh(); }
  };

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))] as string[],
    [items]
  );

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (catFilter !== 'all' && i.category !== catFilter) return false;
      if (srcFilter !== 'all' && i.source !== srcFilter) return false;
      if (kw && !((i.title || '') + (i.dept || '') + (i.category || '')).toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [items, q, statusFilter, catFilter, srcFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    fresh: items.filter((i) => i.status === 'new').length,
    todayCount: items.filter((i) => i.date_posted === todayStr()).length,
  }), [items]);

  // 선택 범위+소스가 이미 수집된 적 있는지 (runs 기반) → 가장 최근 커버 run 반환
  const dupRun = useMemo<RunRecord | null>(() => {
    if (selected.size === 0 || runs.length === 0) return null;
    const sFrom = from || null, sTo = to || null;
    const covers = (r: RunRecord) =>
      (r.from == null || (sFrom != null && r.from <= sFrom)) &&
      (r.to == null || (sTo != null && r.to >= sTo));
    let latest: RunRecord | null = null;
    for (const s of selected) {
      const r = runs.find((rr) => rr.sources.includes(s) && covers(rr)); // runs: 최신순
      if (!r) return null; // 한 소스라도 미커버면 경고 안 함
      if (!latest || r.ran_at > latest.ran_at) latest = r;
    }
    return latest;
  }, [selected, from, to, runs]);

  if (!loading && online === false) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
            <CircleAlert className="w-5 h-5" /> 크롤러 서버에 연결할 수 없습니다
          </div>
          <p className="text-sm text-amber-800/90 mb-3">아래 명령으로 서버를 켜고 새로고침하세요.</p>
          <pre className="bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm text-slate-800 overflow-x-auto">cd crawler{'\n'}npm run serve</pre>
          <button className={cx(btnSecondary, 'mt-3')} onClick={() => location.reload()}>
            <RefreshCw className="w-4 h-4" /> 다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Header online={online} />

      {/* 중복 범위 경고 */}
      {dupRun && !crawling && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-amber-800">
            선택 범위 <b>{from || '전체'} ~ {to || '오늘'}</b>는 이미 수집한 적 있습니다 · 마지막 {ago(dupRun.ran_at)} · 그때 신규 {dupRun.added}건
            <div className="mt-2 flex gap-2">
              <button onClick={() => preset(3, '최근 3일')} className="text-xs font-semibold bg-white border border-amber-300 rounded-lg px-2.5 py-1 hover:bg-amber-100">최근 3일만 수집 (권장)</button>
            </div>
          </div>
        </div>
      )}

      {/* 크롤 컨트롤 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 space-y-4">
        {/* 소스 선택 */}
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" /> 크롤 대상 사이트
          </div>
          <div className="flex flex-wrap gap-2">
            {sources.map((s) => {
              const on = selected.has(s.id);
              return (
                <button
                  key={s.id}
                  disabled={!s.enabled}
                  onClick={() => toggleSource(s.id)}
                  title={s.note}
                  className={cx(
                    'px-3 py-1.5 rounded-xl text-sm font-medium border transition',
                    !s.enabled ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                      : on ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {on && <Check className="w-3.5 h-3.5 inline mr-1" />}
                  {s.label}{!s.enabled && ' (준비중)'}
                </button>
              );
            })}
          </div>
        </div>

        {/* 캠퍼스 + 날짜 범위 */}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <div className={cx(!anyCampusSource && 'opacity-40')}>
            <label className="text-xs font-semibold text-slate-500 block mb-1">캠퍼스 <span className="font-normal">(전체공지)</span></label>
            <select value={campus} onChange={(e) => setCampus(e.target.value)} disabled={!anyCampusSource}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
              {CAMPUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" /> 게시일 범위
            </label>
            <div className="flex items-center gap-2">
              <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <span className="text-slate-400">~</span>
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <button className={btnPrimary} disabled={crawling}
                onClick={() => doCrawl(from || null, to || null, '지정 범위')}>
                {crawling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                이 범위로 수집
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">빠른 선택</label>
            <div className="flex gap-2">
              <button className={btnSecondary} disabled={crawling} onClick={() => preset(0, '오늘')}>오늘</button>
              <button className={btnSecondary} disabled={crawling} onClick={() => preset(10, '최근 10일')}>최근 10일</button>
              <button className={btnSecondary} disabled={crawling} onClick={() => preset(20, '최근 20일')}>최근 20일</button>
              <button className={btnSecondary} disabled={crawling} onClick={() => preset(null, '전체')}>전체</button>
            </div>
          </div>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="총 수집" value={stats.total} />
        <Stat label="신규" value={stats.fresh} accent="text-emerald-600" />
        <Stat label="오늘 게시" value={stats.todayCount} accent="text-sky-600" />
      </div>

      {/* 수집 달력 + 이력 */}
      <CoverageCalendar items={items} runs={runs} sources={sources} />
      {runs.length > 0 && <RunHistory runs={runs} srcLabel={srcLabel} />}

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목·부서·카테고리 검색…"
            className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm" />
        </div>
        <select value={srcFilter} onChange={(e) => setSrcFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
          <option value="all">전체 출처</option>
          {sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
          <option value="all">전체 카테고리</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
          <option value="all">전체 상태</option>
          <option value="new">신규</option>
          <option value="reviewed">검토함</option>
          <option value="promoted">공모전 후보</option>
          <option value="ignored">무시</option>
        </select>
        <button className={btnSecondary} onClick={refresh}><RefreshCw className="w-4 h-4" /> 새로고침</button>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-slate-500 py-12 text-center">로딩 중…</div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-500 py-12 text-center border border-dashed border-slate-200 rounded-2xl">
          {items.length === 0 ? '아직 수집된 공지가 없습니다. 위에서 사이트·날짜를 정해 수집하세요.' : '필터에 맞는 항목이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 px-1">{filtered.length}건 표시</div>
          {filtered.map((it) => <NoticeRow key={`${it.source}:${it.post_id}`} it={it} srcLabel={srcLabel} onStatus={changeStatus} onOpen={setDetail} />)}
        </div>
      )}

      {detail && <DetailModal it={detail} srcLabel={srcLabel} onClose={() => setDetail(null)} onStatus={changeStatus} />}

      {toast && (
        <div className={cx('fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-md',
          toast.kind === 'ok' ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white')}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

const fileName = (u: string) => {
  try { const p = decodeURIComponent(u.split('?')[0]).split('/').filter(Boolean); return p.slice(-2).find((s) => /\.\w{2,5}$/.test(s)) ?? p.pop() ?? u; }
  catch { return u; }
};

const DetailModal: React.FC<{ it: RawNotice; srcLabel: (id: string) => string; onClose: () => void; onStatus: (id: string, s: NoticeStatus) => void }> = ({ it, srcLabel, onClose, onStatus }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white rounded-t-2xl">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <Badge tone="violet"><Globe className="w-3 h-3" /> {srcLabel(it.source)}</Badge>
              {it.campus && <Badge>{it.campus}</Badge>}
              {it.category && <Badge tone="amber">{it.category}</Badge>}
            </div>
            <h2 className="text-lg font-bold text-slate-900">{it.title}</h2>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
              <span>📅 {it.date_posted || '-'}</span>
              {it.dept && <span>🏢 {it.dept}</span>}
              {it.notice_period && <span>공지기간 {it.notice_period}</span>}
              <span className="font-mono text-slate-400">#{it.post_id}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none shrink-0">×</button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* 이미지/포스터 */}
          {it.image_urls.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">이미지/포스터 {it.image_urls.length}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {it.image_urls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="block border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <img src={u} alt="" className="w-full h-40 object-contain" loading="lazy"
                      onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 첨부 */}
          {it.file_urls.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">첨부파일 {it.file_urls.length}</div>
              <div className="flex flex-col gap-1.5">
                {it.file_urls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="text-sm text-sky-600 hover:underline flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{fileName(u)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 본문 */}
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">본문 {it.body ? `(${it.body.length}자)` : ''}</div>
            {it.body
              ? <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{it.body}</p>
              : <p className="text-sm text-slate-400">본문 텍스트 없음 (포스터/첨부 위주 공지일 수 있음)</p>}
          </div>
        </div>

        {/* footer actions */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-2">
          <a href={it.link} target="_blank" rel="noreferrer" className="text-sm text-sky-600 hover:underline flex items-center gap-1">
            원문 페이지 <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <div className="flex gap-2">
            <button onClick={() => { onStatus(it.post_id, 'promoted'); onClose(); }} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700">공모전 후보</button>
            <button onClick={() => { onStatus(it.post_id, 'ignored'); onClose(); }} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50">무시</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Header: React.FC<{ online?: boolean | null }> = ({ online }) => (
  <div className="flex items-start gap-3">
    <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
      <Inbox className="w-6 h-6 text-violet-600" />
    </div>
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-extrabold text-slate-900">수집 인박스</h1>
        {online != null && (
          <span className={cx('text-xs px-2 py-0.5 rounded-full border',
            online ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200')}>
            {online ? '크롤러 연결됨' : '연결 끊김'}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500">여러 사이트 원본 일괄 수집 · 분류/게시 전 단계</p>
    </div>
  </div>
);

const Stat: React.FC<{ label: string; value: number; accent?: string }> = ({ label, value, accent }) => (
  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
    <div className="text-xs text-slate-500">{label}</div>
    <div className={cx('text-2xl font-extrabold', accent ?? 'text-slate-900')}>{value}</div>
  </div>
);

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function tintClass(n: number): string {
  if (n >= 5) return 'bg-emerald-600 text-white';
  if (n >= 3) return 'bg-emerald-400 text-emerald-900';
  if (n >= 1) return 'bg-emerald-200 text-emerald-900';
  return '';
}

const CoverageCalendar: React.FC<{ items: RawNotice[]; runs: RunRecord[]; sources: SourceMeta[] }> = ({ items, runs, sources }) => {
  const [calSrc, setCalSrc] = useState('all');
  const pad = (n: number) => String(n).padStart(2, '0');

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) {
      if (calSrc !== 'all' && it.source !== calSrc) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(it.date_posted)) continue;
      m[it.date_posted] = (m[it.date_posted] || 0) + 1;
    }
    return m;
  }, [items, calSrc]);

  const relevantRuns = useMemo(
    () => runs.filter((r) => calSrc === 'all' || r.sources.includes(calSrc)),
    [runs, calSrc]
  );
  const isCovered = (day: string) =>
    relevantRuns.some((r) =>
      (r.from == null || day >= r.from) &&
      (r.to == null ? day <= r.ran_at.slice(0, 10) : day <= r.to)
    );

  const [monthOffset, setMonthOffset] = useState(0);
  const todayLocal = todayStr();
  const view = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1);
  const vy = view.getFullYear(), vm = view.getMonth();
  const first = new Date(vy, vm, 1).getDay();
  const dim = new Date(vy, vm + 1, 0).getDate();

  const cells: React.ReactNode[] = [];
  let monthTotal = 0;
  for (let i = 0; i < first; i++) cells.push(<div key={'b' + i} />);
  for (let d = 1; d <= dim; d++) {
    const ds = `${vy}-${pad(vm + 1)}-${pad(d)}`;
    const n = counts[ds] || 0;
    monthTotal += n;
    const covered = isCovered(ds);
    const future = ds > todayLocal;
    const tint = tintClass(n);
    cells.push(
      <div key={d} title={`${ds} · 수집 ${n}건${covered ? ' · 크롤함' : ''}`}
        className={cx('aspect-square rounded-md flex flex-col items-center justify-center text-xs leading-none',
          future && 'opacity-30',
          tint ? tint : covered ? 'bg-slate-50 border border-amber-400 text-slate-400' : 'bg-slate-50 text-slate-300')}>
        <span>{d}</span>
        {n > 0 && <span className="text-[10px] mt-0.5 font-semibold">{n}</span>}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> 수집 달력 <span className="font-normal text-slate-400">(날짜별 수집 건수)</span></span>
        <select value={calSrc} onChange={(e) => setCalSrc(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white">
          <option value="all">전체 소스</option>
          {sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setMonthOffset((v) => v - 1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600"><ChevronLeft className="w-4 h-4" /></button>
          <div className="text-sm font-semibold text-slate-700">{vy}. {vm + 1} <span className="font-normal text-slate-400 text-xs">· {monthTotal}건</span></div>
          <button onClick={() => setMonthOffset((v) => Math.min(0, v + 1))} disabled={monthOffset >= 0}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK.map((w) => <div key={w} className="text-[10px] text-slate-400 text-center pb-1">{w}</div>)}
          {cells}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap text-[11px] text-slate-500 mt-3 items-center">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 inline-block" />수집 적음</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-600 inline-block" />많음</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-50 border border-amber-400 inline-block" />긁었으나 0건</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-50 inline-block" />안 긁음</span>
      </div>
    </div>
  );
};

const RunHistory: React.FC<{ runs: RunRecord[]; srcLabel: (id: string) => string }> = ({ runs, srcLabel }) => {
  const [open, setOpen] = useState(false);
  const shown = open ? runs.slice(0, 20) : runs.slice(0, 4);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><History className="w-4 h-4" /> 최근 수집 이력 ({runs.length})</span>
        <span className="text-[11px] text-sky-600">{open ? '접기' : '더보기'}</span>
      </button>
      <div className="space-y-1.5">
        {shown.map((r, i) => (
          <div key={i} className="flex items-center gap-3 text-[13px]">
            <span className="text-slate-400 w-16 shrink-0">{ago(r.ran_at)}</span>
            <span className="flex-1 text-slate-700 truncate">{r.sources.map(srcLabel).join(', ')}</span>
            <span className="text-slate-500 font-mono text-[11px] shrink-0">{r.from ? `${r.from.slice(5)}~${(r.to ?? '').slice(5)}` : '전체'}</span>
            <span className={cx('w-16 text-right shrink-0', r.added > 0 ? 'text-emerald-600' : 'text-slate-400')}>+{r.added} 신규</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const NoticeRow: React.FC<{ it: RawNotice; srcLabel: (id: string) => string; onStatus: (id: string, s: NoticeStatus) => void; onOpen: (it: RawNotice) => void }> = ({ it, srcLabel, onStatus, onOpen }) => {
  const poster = it.image_urls?.[0];
  const sm = STATUS_META[it.status];
  return (
    <div className={cx('bg-white border rounded-2xl p-3 flex gap-3 items-start',
      it.status === 'ignored' ? 'border-slate-100 opacity-60' : 'border-slate-200')}>
      <button onClick={() => onOpen(it)} title="상세 보기"
        className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 hover:ring-2 hover:ring-sky-300">
        {poster
          ? <img src={poster} alt="" className="w-full h-full object-cover" loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          : <ImageOff className="w-5 h-5 text-slate-300" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <span className={cx('text-[11px] px-2 py-0.5 rounded-full border', sm.cls)}>{sm.label}</span>
          <Badge tone="violet"><Globe className="w-3 h-3" /> {srcLabel(it.source)}</Badge>
          {it.campus && <Badge>{it.campus}</Badge>}
          {it.category && <Badge tone="amber">{it.category}</Badge>}
          {it.image_urls?.length > 0 && <Badge tone="slate"><ImageIcon className="w-3 h-3" /> {it.image_urls.length}</Badge>}
          {it.file_urls?.length > 0 && <Badge tone="slate"><Paperclip className="w-3 h-3" /> {it.file_urls.length}</Badge>}
        </div>
        <button onClick={() => onOpen(it)} className="block text-left font-semibold text-slate-900 hover:text-sky-700 line-clamp-2">
          {it.title}
        </button>
        <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          <span>📅 {it.date_posted || '-'}</span>
          {it.dept && <span>🏢 {it.dept}</span>}
          {it.notice_period && <span>공지 {it.notice_period}</span>}
          <span className="font-mono text-slate-400">#{it.post_id}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        <button onClick={() => onOpen(it)} className="text-xs text-violet-600 hover:underline flex items-center gap-1 justify-end">
          상세 보기
        </button>
        <a href={it.link} target="_blank" rel="noreferrer" className="text-xs text-sky-600 hover:underline flex items-center gap-1 justify-end">
          원문 <ExternalLink className="w-3 h-3" />
        </a>
        <div className="flex gap-1">
          <IconBtn title="공모전 후보" active={it.status === 'promoted'} onClick={() => onStatus(it.post_id, 'promoted')}><Send className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn title="검토함" active={it.status === 'reviewed'} onClick={() => onStatus(it.post_id, 'reviewed')}><Check className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn title="무시" active={it.status === 'ignored'} onClick={() => onStatus(it.post_id, 'ignored')}><EyeOff className="w-3.5 h-3.5" /></IconBtn>
        </div>
      </div>
    </div>
  );
};

const Badge: React.FC<{ children: React.ReactNode; tone?: 'sky' | 'amber' | 'slate' | 'violet' }> = ({ children, tone = 'sky' }) => {
  const cls = tone === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : tone === 'slate' ? 'bg-slate-50 text-slate-600 border-slate-200'
    : tone === 'violet' ? 'bg-violet-50 text-violet-700 border-violet-200'
    : 'bg-sky-50 text-sky-700 border-sky-200';
  return <span className={cx('text-[11px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1', cls)}>{children}</span>;
};

const IconBtn: React.FC<{ children: React.ReactNode; title: string; active?: boolean; onClick: () => void }> = ({ children, title, active, onClick }) => (
  <button title={title} onClick={onClick}
    className={cx('w-7 h-7 rounded-lg flex items-center justify-center border transition',
      active ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
    {children}
  </button>
);

export default CrawlInbox;
