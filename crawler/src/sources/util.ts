import { fetchHtml, sleep } from '../fetchPage.ts';
import type { CrawlParams } from './types.ts';
import type { RawNotice } from '../types.ts';

/** "2026.06.23" / "2026-06-23" / "2026. 6. 23" → "2026-06-23" (실패 시 원문) */
export function normDate(raw: string): string {
  const m = (raw || '').match(/(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/);
  if (!m) return (raw || '').trim();
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

export function inRange(d: string, from: string | null, to: string | null): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return true; // 날짜 모르면 포함
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export interface SimpleRow {
  post_id: string;
  title: string;
  link: string;
  date: string;            // YYYY-MM-DD (정규화됨)
  category?: string | null;
  dept?: string | null;
  campus?: string | null;
  image_urls?: string[];
}

export interface DetailParts {
  body: string;
  image_urls: string[];
  file_urls: string[];
}

/** origin 기준 상대→절대 URL 변환기 */
export function makeAbs(origin: string) {
  return (href: string | undefined | null): string | null => {
    if (!href) return null;
    const h = href.trim();
    if (!h || h.startsWith('data:') || h.startsWith('javascript:')) return null;
    if (/^https?:\/\//i.test(h)) return h;
    if (h.startsWith('//')) return 'https:' + h;
    if (h.startsWith('/')) return origin + h;
    return origin + '/' + h;
  };
}

/** 아이콘/스페이서/이모지 등 콘텐츠 아닌 이미지 제외 */
export function isContentImage(src: string): boolean {
  if (/gstatic\.com|notoemoji|\/emoji\/|googleapis\.com/i.test(src)) return false;
  return !/(icon|btn|blank|spacer|emoticon|favicon|emblem|logo|loading|\.gif)(\?|$)/i.test(src);
}

/**
 * 목록단에 날짜가 있는 게시판용 공통 러너.
 * 페이지 순회 + from/to 필터 + from 이전 페이지 도달 시 조기 중단.
 */
export async function runListBoard(
  params: CrawlParams,
  cfg: {
    source: string;
    listUrl: (page: number) => string;
    parse: (html: string) => SimpleRow[];
    detailUrl?: (row: SimpleRow) => string;   // 기본 row.link
    parseDetail?: (html: string) => DetailParts;
    unsortedDates?: boolean;                   // 목록이 날짜 내림차순이 아니면 조기중단 끔
  }
): Promise<RawNotice[]> {
  const log = params.onLog ?? (() => {});
  const out: RawNotice[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= params.pages; page++) {
    log(`[${cfg.source}] page ${page}/${params.pages}`);
    let rows: SimpleRow[];
    try {
      rows = cfg.parse(await fetchHtml(cfg.listUrl(page)));
    } catch (e) {
      log(`[${cfg.source}] page ${page} FAIL: ${String(e)}`);
      break;
    }
    if (rows.length === 0) break;

    let inRangeOnPage = 0;
    for (const r of rows) {
      const key = `${cfg.source}:${r.post_id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const dated = /^\d{4}-\d{2}-\d{2}$/.test(r.date);
      if (!params.from || !dated || r.date >= params.from) inRangeOnPage++;
      if (!inRange(r.date, params.from, params.to)) continue;
      if (params.limit != null && out.length >= params.limit) return out;

      const rec: RawNotice = {
        source: cfg.source,
        post_id: r.post_id,
        date_posted: r.date,
        title: r.title,
        body: '',
        link: r.link,
        image_urls: r.image_urls ?? [],
        file_urls: [],
        crawled_at: new Date().toISOString(),
        dept: r.dept ?? null,
        campus: r.campus ?? null,
        category: r.category ?? null,
        notice_period: null,
        event_period: null,
      };

      // 상세 방문 (본문/이미지/첨부)
      if (params.withDetail && cfg.parseDetail) {
        await sleep(params.delayMs);
        try {
          const d = cfg.parseDetail(await fetchHtml(cfg.detailUrl ? cfg.detailUrl(r) : r.link));
          rec.body = d.body;
          rec.image_urls = [...new Set([...rec.image_urls, ...d.image_urls])];
          rec.file_urls = d.file_urls;
        } catch (e) {
          log(`[${cfg.source}] detail ${r.post_id} FAIL: ${String(e)}`);
        }
      }

      out.push(rec);
    }

    if (!cfg.unsortedDates && params.from && inRangeOnPage === 0) {
      log(`[${cfg.source}] page ${page} 전부 ${params.from} 이전 → 중단`);
      break;
    }
    if (page < params.pages) await sleep(params.delayMs);
  }
  return out;
}
