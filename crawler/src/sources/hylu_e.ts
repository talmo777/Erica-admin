import * as cheerio from 'cheerio';
import type { SourceAdapter, CrawlParams } from './types.ts';
import { runListBoard, normDate, makeAbs, type SimpleRow, type DetailParts } from './util.ts';

const ORIGIN = 'https://hylu-e.hanyang.ac.kr';
const abs = makeAbs(ORIGIN);

function parseDetail(html: string): DetailParts {
  const $ = cheerio.load(html);
  // Froala 본문 컨테이너 우선, 없으면 첨부 이미지 전체에서 콘텐츠만
  const fr = $('.fr-view').first();
  const body = (fr.length ? fr.text() : '').replace(/\s+/g, ' ').trim();
  const image_urls: string[] = [];
  $('img[src*="/attachment/view/"]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    // emblem/favicon 류 제외
    if (/emblem|favicon|logo/i.test(src)) return;
    const a = abs(src.split('?')[0]);
    if (a && !image_urls.includes(a)) image_urls.push(a);
  });
  return { body, image_urls, file_urls: [] };
}

function parse(html: string): SimpleRow[] {
  const $ = cheerio.load(html);
  const rows: SimpleRow[] = [];
  $('[data-role="item"]').each((_, el) => {
    const item = $(el);
    const pidx = item.attr('data-pidx');
    if (!pidx) return;
    const title = item.find('.title').first().text().replace(/\s+/g, ' ').trim();
    const dept = item.find('.department').first().text().replace(/\s+/g, ' ').trim() || null;
    const dt = item.find('time[datetime]').first().attr('datetime') ?? '';
    const date = normDate(dt.slice(0, 10));
    // 커버 이미지: div.cover style background-image:url(...)
    const cover = item.find('.cover').first().attr('style') ?? '';
    const cm = cover.match(/url\(([^)]+)\)/);
    const images: string[] = [];
    if (cm) {
      let u = cm[1].replace(/['"]/g, '').trim();
      if (u.startsWith('/')) u = ORIGIN + u;
      images.push(u);
    }
    rows.push({
      post_id: pidx,
      title,
      link: `${ORIGIN}/ko/program/all/view/${pidx}`,
      date,
      category: '비교과프로그램',
      dept,
      campus: 'ERICA',
      image_urls: images,
    });
  });
  return rows;
}

/** 한양대 ERICA 비교과통합관리시스템 (프로그램 그리드, pidx 기반). 목록에 날짜·커버이미지 보유. */
export const hylueSource: SourceAdapter = {
  id: 'hylu_e',
  label: '비교과통합',
  homepage: `${ORIGIN}/ko/program/all`,
  supportsCampus: false,
  dateSource: 'list',
  enabled: true,
  note: 'ERICA 비교과 프로그램 (포스터 포함). 페이지당 12개, 총 ~300개.',
  crawl(p: CrawlParams) {
    // 목록이 등록순(페이지)이고 날짜는 프로그램 일정이라 조기중단 끔. 부하 위해 페이지 상한.
    const pages = Math.min(p.pages, 8);
    return runListBoard({ ...p, pages }, {
      source: 'hylu_e',
      listUrl: (page) => `${ORIGIN}/ko/program/all/list/0/${page}`,
      parse,
      parseDetail,
      unsortedDates: true,
    });
  },
};
