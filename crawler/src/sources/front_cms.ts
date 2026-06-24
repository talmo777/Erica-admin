import * as cheerio from 'cheerio';
import type { SourceAdapter, CrawlParams } from './types.ts';
import { runListBoard, normDate, makeAbs, isContentImage, type SimpleRow, type DetailParts } from './util.ts';

interface FrontCfg {
  id: string;
  label: string;
  origin: string;     // https://ibus.hanyang.ac.kr
  listPath: string;   // /front/community/notice
  dept: string;
  note?: string;
}

/**
 * 한양 ERICA 일부 단과대가 쓰는 자체 CMS(front/.../notice, view?id=) 제네릭 어댑터.
 * 테마에 따라 목록이 table(tr) 또는 li로 다름 → 앵커(a[href*="/notice/view?id="]) 기준으로 추출.
 * 예: 경상대학(ibus, table), 약학대학(pharmacy, li)
 */
export function makeFrontCms(cfg: FrontCfg): SourceAdapter {
  const abs = makeAbs(cfg.origin);

  function parse(html: string): SimpleRow[] {
    const $ = cheerio.load(html);
    const rows: SimpleRow[] = [];
    const seen = new Set<string>();
    $('a[href*="/notice/view?id="]').each((_, el) => {
      const a = $(el);
      const href = a.attr('href') ?? '';
      const m = href.match(/id=(\d+)/);
      if (!m || seen.has(m[1])) return;
      seen.add(m[1]);

      const category = a.find('[class*="label"]').first().text().trim() || null;
      // 제목: .subject 우선, 없으면 앵커 전체. label/날짜/번호 스팬 제거
      const titleScope = a.find('.subject').first();
      const clone = (titleScope.length ? titleScope : a).clone();
      clone.find('[class*="label"], .datetime, .date, .no, .first, .last, time').remove();
      const title = clone.text().replace(/\s+/g, ' ').replace(/\bHit\s*\d+/gi, '').trim();
      if (!title) return;

      // 날짜: 앵커 내부(.datetime/.date) → 없으면 같은 행(tr/li)의 날짜
      let date = '';
      a.find('.datetime, .date, time').each((__, d) => {
        const t = $(d).text(); if (!date && /\d{4}[.\-]\d{1,2}[.\-]\d{1,2}/.test(t)) date = normDate(t);
      });
      if (!date) {
        a.closest('tr, li').find('td, .datetime, .date').each((__, d) => {
          const t = $(d).text().trim(); if (!date && /^\d{4}[.\-]\d{1,2}[.\-]\d{1,2}$/.test(t)) date = normDate(t);
        });
      }

      rows.push({
        post_id: m[1],
        title,
        link: abs(href) ?? `${cfg.origin}${cfg.listPath}/view?id=${m[1]}`,
        date,
        category,
        dept: cfg.dept,
        campus: 'ERICA',
      });
    });
    return rows;
  }

  function parseDetail(html: string): DetailParts {
    const $ = cheerio.load(html);
    const view = $('div.board-view').first();
    const content = view.find('.content').first();
    const bodyScope = content.length ? content : (view.length ? view : $('body'));
    const body = bodyScope.text().replace(/\s+/g, ' ').trim();
    const image_urls: string[] = [];
    bodyScope.find('img[src]').each((_, el) => {
      const src = $(el).attr('src') ?? '';
      if (!isContentImage(src)) return;
      const a = abs(src);
      if (a && !image_urls.includes(a)) image_urls.push(a);
    });
    const file_urls: string[] = [];
    (view.length ? view : $('body')).find('a[href*="file-load"], a[href*="file-down"], a[href*="download"]').each((_, el) => {
      const a = abs($(el).attr('href'));
      if (a && !file_urls.includes(a)) file_urls.push(a);
    });
    return { body, image_urls, file_urls };
  }

  return {
    id: cfg.id,
    label: cfg.label,
    homepage: `${cfg.origin}${cfg.listPath}`,
    supportsCampus: false,
    dateSource: 'list',
    enabled: true,
    note: cfg.note ?? `ERICA ${cfg.dept} 공지`,
    crawl(p: CrawlParams) {
      return runListBoard(p, {
        source: cfg.id,
        listUrl: (page) => `${cfg.origin}${cfg.listPath}?page=${page}`,
        parse,
        parseDetail,
      });
    },
  };
}

/** front-CMS 계열 ERICA 단과대 */
export const frontCmsSources: SourceAdapter[] = [
  makeFrontCms({ id: 'ibus', label: '경상대학', origin: 'https://ibus.hanyang.ac.kr', listPath: '/front/community/notice', dept: '경상대학' }),
  makeFrontCms({ id: 'pharmacy', label: '약학대학', origin: 'https://pharmacy.hanyang.ac.kr', listPath: '/front/information/notice', dept: '약학대학' }),
];
