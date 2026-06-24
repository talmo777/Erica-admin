import * as cheerio from 'cheerio';
import type { SourceAdapter, CrawlParams } from './types.ts';
import { runListBoard, normDate, makeAbs, isContentImage, type SimpleRow, type DetailParts } from './util.ts';

const ORIGIN = 'http://idesign.hanyang.ac.kr';
const BOARD = `${ORIGIN}/bbs/board.php?bo_table=notice`;
const abs = makeAbs(ORIGIN);

function parse(html: string): SimpleRow[] {
  const $ = cheerio.load(html);
  const rows: SimpleRow[] = [];
  const seen = new Set<string>();
  $('a[href*="bo_table=notice"][href*="wr_id="]').each((_, el) => {
    const a = $(el);
    if (!a.find('.subj').length) return; // 실제 목록 행만 (제목 span 보유)
    const href = (a.attr('href') ?? '').replace(/&amp;/g, '&');
    const m = href.match(/wr_id=(\d+)/);
    if (!m || seen.has(m[1])) return;
    seen.add(m[1]);

    const title = a.find('.subj').first().text().replace(/\s+/g, ' ').trim();
    if (!title) return;
    const category = (a.find('.text-gray').first().text().match(/\[([^\]]+)\]/) ?? [])[1] ?? null;
    // 날짜: 같은 행에서 날짜 형식 텍스트
    let date = '';
    a.closest('.bl-list, li, tr, .bl-subj').parent().find('*').each((__, d) => {
      if (date) return;
      const t = $(d).text().trim();
      if (/^\d{4}[.\-]\d{1,2}[.\-]\d{1,2}$/.test(t)) date = normDate(t);
    });
    rows.push({
      post_id: m[1],
      title,
      link: `${BOARD}&wr_id=${m[1]}`,
      date,
      category,
      dept: '디자인대학',
      campus: 'ERICA',
    });
  });
  return rows;
}

function parseDetail(html: string): DetailParts {
  const $ = cheerio.load(html);
  const con = $('#board_view_con').first();
  const scope = con.length ? con : $('body');
  const body = scope.text().replace(/\s+/g, ' ').trim();
  const image_urls: string[] = [];
  scope.find('img[src]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    if (!isContentImage(src)) return;
    const u = abs(src);
    if (u && !image_urls.includes(u)) image_urls.push(u);
  });
  const file_urls: string[] = [];
  $('a[href*="download.php"]').each((_, el) => {
    const u = abs(($(el).attr('href') ?? '').replace(/&amp;/g, '&'));
    if (u && !file_urls.includes(u)) file_urls.push(u);
  });
  return { body, image_urls, file_urls };
}

/** 한양대 ERICA 디자인대학 공지 (idesign, gnuboard). ※ design.hanyang.ac.kr 아님(그쪽은 WAF). */
export const idesignSource: SourceAdapter = {
  id: 'idesign',
  label: '디자인대학',
  homepage: BOARD,
  supportsCampus: false,
  dateSource: 'list',
  enabled: true,
  note: 'ERICA 디자인대학 (idesign gnuboard)',
  crawl(p: CrawlParams) {
    return runListBoard(p, {
      source: 'idesign',
      listUrl: (page) => `${BOARD}&page=${page}`,
      parse,
      parseDetail,
    });
  },
};
