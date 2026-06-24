import * as cheerio from 'cheerio';
import type { SourceAdapter, CrawlParams } from './types.ts';
import { normDate, inRange, makeAbs } from './util.ts';
import { getBrowser } from '../browser.ts';
import type { RawNotice } from '../types.ts';

const ORIGIN = 'https://lions.hanyang.ac.kr';
const BOARD = `${ORIGIN}/lions/sub/sub5-1.aspx`;
const abs = makeAbs(ORIGIN);

interface LionRow { post_id: string; title: string; link: string; date: string; category: string | null }

// LIONS num 해시는 로드마다 바뀜 → 제목+날짜로 안정적 post_id 생성 (크롤 간 중복 방지)
function stableId(title: string, date: string): string {
  let h = 5381;
  const s = `${date}|${title}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `${date}_${h.toString(36)}`;
}

function parseList(html: string): LionRow[] {
  const $ = cheerio.load(html);
  const rows: LionRow[] = [];
  $('table.mb-data-table tbody tr').each((_, el) => {
    const tr = $(el);
    const a = tr.find('td[data-label="제목"] a').first();
    if (!a.length) return;
    if (!/moveView\(/.test(a.attr('onclick') ?? '')) return;
    const title = a.text().replace(/\s+/g, ' ').trim();
    if (!title) return;
    const date = normDate(tr.find('td[data-label="등록일"]').first().text());
    rows.push({
      post_id: stableId(title, date),
      title,
      link: BOARD, // 안정 deep-link 불가(해시 휘발) → 게시판 URL
      date,
      category: title.match(/\[([^\]]+)\]/)?.[1] ?? null,
    });
  });
  return rows;
}

function parseDetail(html: string): { body: string; image_urls: string[]; file_urls: string[] } {
  const $ = cheerio.load(html);
  const content = $('#content').first();
  const body = content.text().replace(/\s+/g, ' ').trim();
  const image_urls: string[] = [];
  content.find('img[src]').each((_, el) => {
    const a = abs($(el).attr('src'));
    if (a && !image_urls.includes(a)) image_urls.push(a);
  });
  const file_urls: string[] = [];
  $('a[href*="DownLoadAction.aspx"]').each((_, el) => {
    const a = abs($(el).attr('href'));
    if (a && !file_urls.includes(a)) file_urls.push(a);
  });
  return { body, image_urls, file_urls };
}

/**
 * 한양대 ERICA LIONS칼리지 공지. ASP.NET — 목록은 서버렌더지만 상세는 moveView 포스트백.
 * → Playwright로 목록 로드 후 항목별 moveView 실행해 상세 수집.
 */
export const lionsSource: SourceAdapter = {
  id: 'lions',
  label: 'LIONS칼리지',
  homepage: BOARD,
  supportsCampus: false,
  dateSource: 'list',
  enabled: true,
  note: 'ERICA LIONS 자율전공학부. 상세는 Playwright(포스트백)로 수집.',

  async crawl(p: CrawlParams): Promise<RawNotice[]> {
    const log = p.onLog ?? (() => {});
    const browser = await getBrowser();
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    const out: RawNotice[] = [];
    try {
      await page.goto(BOARD, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const rows = parseList(await page.content());
      log(`[lions] ${rows.length} rows`);

      // 날짜 범위 통과 행 + 원래 위치(index) 보관 → 상세는 위치로 클릭(해시 휘발 대응)
      const targets = rows
        .map((r, idx) => ({ r, idx }))
        .filter(({ r }) => inRange(r.date, p.from, p.to));

      for (const { r, idx } of targets) {
        if (p.limit != null && out.length >= p.limit) break;

        const rec: RawNotice = {
          source: 'lions',
          post_id: r.post_id,
          date_posted: r.date,
          title: r.title,
          body: '',
          link: r.link,
          image_urls: [],
          file_urls: [],
          crawled_at: new Date().toISOString(),
          dept: 'LIONS칼리지',
          campus: 'ERICA',
          category: r.category,
          notice_period: null,
          event_period: null,
        };

        if (p.withDetail) {
          try {
            // idx번째 제목 링크 클릭 (해시 비의존) → moveView 포스트백. #wDate 채워질 때까지 대기.
            await page.locator('table.mb-data-table tbody tr td[data-label="제목"] a').nth(idx).click({ timeout: 10000 });
            await page.waitForFunction(
              () => /\d{4}\.\s*\d{1,2}\.\s*\d{1,2}/.test(document.querySelector('#wDate')?.textContent ?? ''),
              { timeout: 15000 }
            );
            const d = parseDetail(await page.content());
            rec.body = d.body;
            rec.image_urls = d.image_urls;
            rec.file_urls = d.file_urls;
            await page.goto(BOARD, { waitUntil: 'domcontentloaded', timeout: 30000 }); // 목록 복귀(다음 클릭용)
          } catch (e) {
            log(`[lions] detail ${idx} FAIL: ${String(e)}`);
          }
        }
        out.push(rec);
      }
      return out;
    } finally {
      await ctx.close();
    }
  },
};
