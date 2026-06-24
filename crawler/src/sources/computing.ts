import * as cheerio from 'cheerio';
import type { SourceAdapter, CrawlParams } from './types.ts';
import { runListBoard, normDate, makeAbs, isContentImage, type SimpleRow, type DetailParts } from './util.ts';

const ORIGIN = 'https://computing.hanyang.ac.kr';
const abs = makeAbs(ORIGIN);

function parseDetail(html: string): DetailParts {
  const $ = cheerio.load(html);
  const view = $('table.bbs_view').first();
  const scope = view.length ? view : $('body');
  const body = scope.text().replace(/\s+/g, ' ').trim();
  const image_urls: string[] = [];
  scope.find('img[src]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    if (!isContentImage(src)) return;
    const a = abs(src);
    if (a && !image_urls.includes(a)) image_urls.push(a);
  });
  const file_urls: string[] = [];
  scope.find('span.upfile a[href], a[href*="down.php"]').each((_, el) => {
    const a = abs($(el).attr('href'));
    if (a && !file_urls.includes(a)) file_urls.push(a);
  });
  return { body, image_urls, file_urls };
}

function parse(html: string): SimpleRow[] {
  const $ = cheerio.load(html);
  const rows: SimpleRow[] = [];
  $('table tbody tr').each((_, el) => {
    const tr = $(el);
    const a = tr.find('td.left a, td.text-left a').first();
    const href = a.attr('href') ?? '';
    const m = href.match(/idx=(\d+)/);
    if (!m) return;
    const title = a.text().replace(/\s+/g, ' ').trim();
    // 카테고리: td.left 텍스트 중 <a> 앞의 "[학사]" 같은 접두
    const tdLeft = tr.find('td.left, td.text-left').first();
    const lead = tdLeft.text().replace(title, '').trim();
    const category = lead.match(/\[([^\]]+)\]/)?.[1] ?? null;
    // 날짜: td 중 날짜 형식
    let date = '';
    tr.find('td').each((__, td) => {
      const t = $(td).text().trim();
      if (!date && /^\d{4}[.\-/]\s*\d{1,2}[.\-/]\s*\d{1,2}/.test(t)) date = normDate(t);
    });
    rows.push({
      post_id: m[1],
      title,
      link: `${ORIGIN}/open/notice.php?ptype=view&idx=${m[1]}&code=notice`,
      date,
      category,
      dept: '소프트웨어융합대학',
      campus: 'ERICA',
    });
  });
  return rows;
}

/** 한양대 ERICA 소프트웨어융합대학 공지 (PHP 게시판, idx 기반). 목록단 날짜 보유. */
export const computingSource: SourceAdapter = {
  id: 'computing',
  label: 'SW융합대학',
  homepage: `${ORIGIN}/open/notice.php`,
  supportsCampus: false,
  dateSource: 'list',
  enabled: true,
  note: 'ERICA 소프트웨어융합대학 공지',
  crawl(p: CrawlParams) {
    return runListBoard(p, {
      source: 'computing',
      listUrl: (page) => `${ORIGIN}/open/notice.php?code=notice&page=${page}`,
      parse,
      parseDetail,
    });
  },
};
