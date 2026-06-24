import { parseList, parseDetail, listUrl, detailUrl } from './parse.ts';
import { fetchHtml, sleep } from './fetchPage.ts';
import type { RawNotice, ListRow } from './types.ts';

export interface CrawlOptions {
  source: string;          // source 식별자
  pages: number;           // 최대 목록 페이지 수 (from과 함께면 상한선 역할)
  from: string | null;     // YYYY-MM-DD. 이 날짜 이상(>=)만. null이면 하한 없음
  to: string | null;       // YYYY-MM-DD. 이 날짜 이하(<=)만. null이면 상한 없음
  campusFilter: string[] | null; // 예: ['ERICA']. null이면 전체
  withDetail: boolean;     // 상세 방문 여부
  delayMs: number;         // 요청 간 딜레이
  limit: number | null;    // 최대 수집 건수
  onLog?: (msg: string) => void;
}

function matchCampus(row: ListRow, filter: string[] | null): boolean {
  if (!filter || filter.length === 0) return true;
  if (!row.campus) return false;
  return filter.includes(row.campus);
}

/** YYYY-MM-DD 범위 검사. 파싱 불가(형식 다름)면 in-range 취급(true). */
function inRange(date: string, from: string | null, to: string | null): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return true;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

/**
 * 목록 순회 → (옵션) 상세 방문 → RawNotice[] 반환.
 * from/to 범위 필터. from이 있으면 한 페이지 전체가 from 이전이면 중단(목록 최신순 가정).
 */
export async function crawlNotices(
  opts: CrawlOptions
): Promise<{ records: RawNotice[]; skippedCampus: number; pagesFetched: number }> {
  const log = opts.onLog ?? (() => {});
  const records: RawNotice[] = [];
  const seen = new Set<string>();
  let skippedCampus = 0;
  let pagesFetched = 0;

  for (let page = 1; page <= opts.pages; page++) {
    log(`[list] page ${page}/${opts.pages}`);
    const html = await fetchHtml(listUrl(page));
    pagesFetched++;
    const rows = parseList(html);
    if (rows.length === 0) break;

    let inRangeOnPage = 0;

    for (const row of rows) {
      if (seen.has(row.post_id)) continue;
      seen.add(row.post_id);

      if (!inRange(row.date_posted, opts.from, opts.to)) continue; // 범위 밖
      // from 기준 페이지 중단 판단용: from 이상인 항목 카운트
      if (!opts.from || !/^\d{4}-\d{2}-\d{2}$/.test(row.date_posted) || row.date_posted >= opts.from) {
        inRangeOnPage++;
      }

      if (!matchCampus(row, opts.campusFilter)) {
        skippedCampus++;
        continue;
      }
      if (opts.limit != null && records.length >= opts.limit) {
        log(`[limit] reached ${opts.limit}`);
        return { records, skippedCampus, pagesFetched };
      }

      const rec: RawNotice = {
        source: opts.source,
        post_id: row.post_id,
        date_posted: row.date_posted,
        title: row.title,
        body: '',
        link: row.link,
        image_urls: [],
        file_urls: [],
        crawled_at: new Date().toISOString(),
        dept: row.dept,
        campus: row.campus,
        category: row.category,
        notice_period: null,
        event_period: null,
      };

      if (opts.withDetail) {
        await sleep(opts.delayMs);
        try {
          const d = parseDetail(await fetchHtml(detailUrl(row.post_id)));
          rec.body = d.body;
          rec.image_urls = d.image_urls;
          rec.file_urls = d.file_urls;
          rec.notice_period = d.notice_period;
          rec.event_period = d.event_period;
        } catch (e) {
          log(`  [detail] ${row.post_id} FAILED: ${String(e)}`);
        }
      }

      records.push(rec);
    }

    // from 모드: 이 페이지 전체가 from 이전이면 컷오프 통과 → 중단
    if (opts.from && inRangeOnPage === 0) {
      log(`[from] page ${page} 전부 ${opts.from} 이전 → 중단`);
      break;
    }
    if (page < opts.pages) await sleep(opts.delayMs);
  }

  return { records, skippedCampus, pagesFetched };
}
