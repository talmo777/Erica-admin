// 로컬 크롤러 제어 서버(crawler/server.ts) 클라이언트.
// 기본 http://localhost:8787, VITE_CRAWLER_API_BASE로 변경 가능.
const BASE = (import.meta.env.VITE_CRAWLER_API_BASE as string | undefined)?.replace(/\/+$/, '')
  ?? 'http://localhost:8787';

export type NoticeStatus = 'new' | 'reviewed' | 'ignored' | 'promoted';

export interface RawNotice {
  source: string;
  post_id: string;
  date_posted: string;
  title: string;
  body: string;
  link: string;
  image_urls: string[];
  file_urls: string[];
  crawled_at: string;
  dept?: string | null;
  campus?: string | null;
  category?: string | null;
  notice_period?: string | null;
  event_period?: string | null;
  status: NoticeStatus;
  first_seen: string;
}

export interface SourceMeta {
  id: string;
  label: string;
  homepage: string;
  supportsCampus: boolean;
  dateSource: 'list' | 'detail';
  note?: string;
  enabled: boolean;
}

export interface CrawlSummary {
  ok: boolean;
  crawled: number;
  added: number;
  total: number;
  perSource: Record<string, number>;
  elapsedMs: number;
}

export interface RunRecord {
  ran_at: string;
  sources: string[];
  from: string | null;
  to: string | null;
  campus: string | null;
  crawled: number;
  added: number;
  perSource: Record<string, number>;
}

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${t}`);
  }
  return res.json() as Promise<T>;
}

export async function pingCrawler(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function getSources(): Promise<SourceMeta[]> {
  const data = await j<{ sources: SourceMeta[] }>(await fetch(`${BASE}/api/sources`));
  return data.sources ?? [];
}

export async function getNotices(): Promise<RawNotice[]> {
  const data = await j<{ items: RawNotice[] }>(await fetch(`${BASE}/api/notices`));
  return data.items ?? [];
}

export async function runCrawl(opts: {
  sources: string[];
  from?: string | null;
  to?: string | null;
  campus?: string;
  detail?: boolean;
}): Promise<CrawlSummary> {
  const res = await fetch(`${BASE}/api/crawl`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(opts),
    signal: AbortSignal.timeout(300_000),
  });
  return j<CrawlSummary>(res);
}

export async function getRuns(): Promise<RunRecord[]> {
  try {
    const data = await j<{ runs: RunRecord[] }>(await fetch(`${BASE}/api/runs`));
    return data.runs ?? [];
  } catch { return []; }
}

export async function setNoticeStatus(post_id: string, status: NoticeStatus): Promise<void> {
  await j(
    await fetch(`${BASE}/api/notices/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ post_id, status }),
    })
  );
}

/** 최근 N일 전 날짜 → YYYY-MM-DD. days=0이면 오늘. */
export function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}
export const todayStr = () => new Date().toISOString().slice(0, 10);
