import * as cheerio from 'cheerio';
import { fetchHtml, sleep } from '../fetchPage.ts';
import type { SourceAdapter, CrawlParams } from './types.ts';
import type { RawNotice } from '../types.ts';

const ORIGIN = 'https://eec.hanyang.ac.kr';
const LIST_URL = `${ORIGIN}/lounge/notice.html`;

function abs(href: string | undefined): string | null {
  if (!href) return null;
  const h = href.trim();
  if (!h) return null;
  if (/^https?:\/\//i.test(h)) return h;
  if (h.startsWith('?')) return `${LIST_URL}${h}`;
  if (h.startsWith('/')) return ORIGIN + h;
  return `${ORIGIN}/lounge/${h}`;
}

/** "2026-06-05" / "2026.06.05" → YYYY-MM-DD */
function normDate(raw: string): string {
  const m = raw.match(/(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/);
  if (!m) return raw.trim();
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

function inRange(d: string, from: string | null, to: string | null): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return true;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

interface EecRow { post_id: string; title: string; link: string }

function parseEecList(html: string): EecRow[] {
  const $ = cheerio.load(html);
  const rows: EecRow[] = [];
  $('ul.board_list > li.list-flex').each((_, el) => {
    const li = $(el);
    const a = li.find('div.title > a').first();
    const href = a.attr('href') ?? '';
    const m = href.match(/No=(\d+)/);
    if (!m) return;
    rows.push({
      post_id: m[1],
      title: a.text().replace(/\s+/g, ' ').trim(),
      link: abs(href) ?? `${LIST_URL}?&mode=view&No=${m[1]}`,
    });
  });
  return rows;
}

function parseEecDetail(html: string): {
  date: string; body: string; images: string[]; files: string[];
} {
  const $ = cheerio.load(html);
  const date = normDate($('tr.view_infor span.date').first().text());
  const content = $('#content').first();
  const scope = content.length ? content : $('td.detail');
  const body = scope.text().replace(/\s+/g, ' ').trim();

  const images: string[] = [];
  scope.find('img[src]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    if (/^data:/i.test(src)) return;
    if (!/\.(png|jpe?g|gif|webp)(\?|$)/i.test(src) && !/upload|editor|board/i.test(src)) return;
    const a = abs(src);
    if (a && !images.includes(a)) images.push(a);
  });

  const files: string[] = [];
  $('.attachment a[href], .file_list a[href], a[href*="download"]').each((_, el) => {
    const a = abs($(el).attr('href'));
    if (a && !files.includes(a)) files.push(a);
  });

  return { date, body, images, files };
}

/** 한양대 창업교육센터 공지 (자체 게시판, ?mode=view&No=). 날짜는 상세에서 취득. */
export const eecSource: SourceAdapter = {
  id: 'eec',
  label: '창업교육센터',
  homepage: LIST_URL,
  supportsCampus: false,
  dateSource: 'detail',
  enabled: true,
  note: '창업/공모전 다수. 목록에 날짜 없어 상세 방문 필요(느림).',

  async crawl(p: CrawlParams) {
    const log = p.onLog ?? (() => {});
    const out: RawNotice[] = [];

    log('[eec] list page 1');
    const rows = parseEecList(await fetchHtml(LIST_URL));
    log(`[eec] ${rows.length} rows`);

    for (const r of rows) {
      if (p.limit != null && out.length >= p.limit) break;
      await sleep(p.delayMs);
      let date = '';
      let body = '';
      let images: string[] = [];
      let files: string[] = [];
      try {
        const d = parseEecDetail(await fetchHtml(r.link));
        date = d.date; body = d.body; images = d.images; files = d.files;
      } catch (e) {
        log(`  [eec detail] ${r.post_id} FAIL: ${String(e)}`);
      }
      // 날짜 범위 필터 (상세 날짜 기준)
      if (!inRange(date || '', p.from, p.to)) continue;

      out.push({
        source: 'eec',
        post_id: r.post_id,
        date_posted: date,
        title: r.title,
        body: p.withDetail ? body : '',
        link: r.link,
        image_urls: p.withDetail ? images : [],
        file_urls: p.withDetail ? files : [],
        crawled_at: new Date().toISOString(),
        dept: '창업교육센터',
        campus: null,
        category: null,
        notice_period: null,
        event_period: null,
      });
    }
    return out;
  },
};
