import * as cheerio from 'cheerio';
import type { SourceAdapter, CrawlParams } from './types.ts';
import { runListBoard, normDate, makeAbs, isContentImage, type SimpleRow, type DetailParts } from './util.ts';

const PORTLET = 'kr_ac_hanyang_bbs_web_portlet_BbsPortlet';
const PREFIX = '_' + PORTLET;

interface CollegeCfg {
  id: string;
  label: string;
  origin: string;     // 예: https://ieng.hanyang.ac.kr
  boardPath: string;  // 예: /-2  (게시판 메뉴 경로)
  dept: string;       // 예: 공학대학
  note?: string;
}

/**
 * 한양 공용 Liferay BBS(BbsPortlet)를 쓰는 ERICA 단과대 공지용 제네릭 어댑터 팩토리.
 * notice_all과 동일한 hyu-list-body-item 구조. 단 링크가 href 대신
 * onclick="..._viewMessage(messageId)" 이고 페이지네이션은 BbsPortlet_cur.
 */
export function makeLiferayCollege(cfg: CollegeCfg): SourceAdapter {
  const abs = makeAbs(cfg.origin);

  // BbsPortlet 상세: 본문 .bbs-view-message, 첨부 portlet_file_entry, 이미지 /documents/*
  // (notice_all의 .noticeBoard-view-message와 동일 구조)
  function parseDetail(html: string): DetailParts {
    const $ = cheerio.load(html);
    const msg = $('.bbs-view-message').first();
    const scope = msg.length ? msg : $('body');
    const body = scope.text().replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
    const image_urls: string[] = [];
    scope.find('img[src]').each((_, el) => {
      const src = $(el).attr('src') ?? '';
      if (!isContentImage(src)) return;
      if (!/\/documents\//i.test(src) && !/\.(png|jpe?g|gif)(\?|$)/i.test(src)) return;
      const a = abs(src);
      if (a && !image_urls.includes(a)) image_urls.push(a);
    });
    const file_urls: string[] = [];
    scope.find('a[href*="portlet_file_entry"]').each((_, el) => {
      const a = abs($(el).attr('href'));
      if (a && !file_urls.includes(a)) file_urls.push(a);
    });
    return { body, image_urls, file_urls };
  }

  const listUrl = (page: number) =>
    `${cfg.origin}${cfg.boardPath}?p_p_id=${PORTLET}&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&${PREFIX}_cur=${page}`;
  const detailUrl = (id: string) =>
    `${cfg.origin}${cfg.boardPath}?p_p_id=${PORTLET}&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&${PREFIX}_action=view_message&${PREFIX}_messageId=${id}`;

  function parse(html: string): SimpleRow[] {
    const $ = cheerio.load(html);
    const rows: SimpleRow[] = [];
    $('div.hyu-list-body-item[role="listitem"]').each((_, el) => {
      const row = $(el);
      const a = row.find('h4 a').first();
      // post_id: onclick="..._viewMessage(193906, true, false)" 또는 href의 messageId=
      const onclick = a.attr('onclick') ?? '';
      const href = a.attr('href') ?? '';
      const m = onclick.match(/viewMessage\((\d+)/) ?? href.match(/messageId=(\d+)/);
      if (!m) return;
      const post_id = m[1];
      const title = a.text().replace(/\s+/g, ' ').trim();
      if (!title) return;
      const category = row.find('span.hyu-badge[data-itemvalue]').first().attr('data-itemvalue')?.trim() ?? null;
      // 날짜: span.date 중 날짜 형식인 것
      let date = '';
      row.find('span.date').each((__, s) => {
        const t = $(s).text();
        if (!date && /\d{4}\.\s*\d{1,2}\.\s*\d{1,2}/.test(t)) date = normDate(t);
      });
      rows.push({
        post_id,
        title,
        link: detailUrl(post_id),
        date,
        category,
        dept: cfg.dept,
        campus: 'ERICA',
      });
    });
    return rows;
  }

  return {
    id: cfg.id,
    label: cfg.label,
    homepage: `${cfg.origin}${cfg.boardPath}`,
    supportsCampus: false,
    dateSource: 'list',
    enabled: true,
    note: cfg.note ?? `ERICA ${cfg.dept} 공지 (Liferay BBS)`,
    crawl(p: CrawlParams) {
      return runListBoard(p, { source: cfg.id, listUrl, parse, detailUrl: (r) => r.link, parseDetail });
    },
  };
}

/** ERICA 단과대 (Liferay BBS 공용). 새 단과대는 여기에 한 줄 추가. */
export const collegeSources: SourceAdapter[] = [
  makeLiferayCollege({ id: 'ieng', label: '공학대학', origin: 'https://ieng.hanyang.ac.kr', boardPath: '/-2', dept: '공학대학' }),
  makeLiferayCollege({ id: 'comm', label: '언론정보대학', origin: 'https://comm.hanyang.ac.kr', boardPath: '/news2', dept: '언론정보대학' }),
  makeLiferayCollege({ id: 'gcc', label: '글로벌콘텐츠융합학부', origin: 'https://gcc.hanyang.ac.kr', boardPath: '/-12', dept: '글로벌콘텐츠융합학부' }),
];
