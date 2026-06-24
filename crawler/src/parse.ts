import * as cheerio from 'cheerio';
import type { ListRow, DetailParts } from './types.ts';

export const ORIGIN = 'https://www.hanyang.ac.kr';
export const PORTLET = 'kr_ac_hanyang_noticeBoard_web_portlet_NoticeBoardPortlet';
const PREFIX = '_' + PORTLET;

/** 한양 캠퍼스 badge 값 화이트리스트 (category badge와 구분용 fallback) */
const CAMPUS_VALUES = new Set(['한양', '서울', 'ERICA']);

/** 목록 페이지 URL (cur = 1-base 페이지 번호) */
export function listUrl(page: number): string {
  const q = new URLSearchParams({
    p_p_id: PORTLET,
    p_p_lifecycle: '0',
    p_p_state: 'normal',
    p_p_mode: 'view',
    [`${PREFIX}_cur`]: String(page),
  });
  return `${ORIGIN}/web/www/notice_all?${q.toString()}`;
}

/** 상세 페이지 URL (action=view_message&entryId=) */
export function detailUrl(entryId: string): string {
  const q = new URLSearchParams({
    p_p_id: PORTLET,
    p_p_lifecycle: '0',
    p_p_state: 'normal',
    p_p_mode: 'view',
    [`${PREFIX}_action`]: 'view_message',
    [`${PREFIX}_entryId`]: entryId,
  });
  return `${ORIGIN}/web/www/notice_all?${q.toString()}`;
}

/** 상대/인코딩 URL → 절대 URL */
export function absolutize(href: string | undefined | null): string | null {
  if (!href) return null;
  const h = href.trim();
  if (!h) return null;
  if (/^https?:\/\//i.test(h)) return h;
  if (h.startsWith('//')) return 'https:' + h;
  if (h.startsWith('/')) return ORIGIN + h;
  return ORIGIN + '/' + h;
}

/** "2026. 6. 22" / "&nbsp;/&nbsp;2026. 6. 22" → "2026-06-22" (실패 시 원문 trim) */
export function normalizeDate(raw: string): string {
  const m = raw.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (!m) return raw.replace(/ /g, ' ').replace(/[\s/]+/g, ' ').trim();
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/**
 * 목록 페이지 HTML → ListRow[]
 * 셀렉터(실측 검증):
 *   행      div.hyu-list-body-item[role="listitem"]
 *   제목/링크 h4 > a  (href 안 ..._entryId={숫자})
 *   게시일   span.date
 *   캠퍼스   span.hyu-badge.custom-bg[data-itemvalue]
 *   카테고리 span.hyu-badge[data-itemvalue]:not(.custom-bg)
 *   부서     p 안의 class 없는 일반 <span>
 */
export function parseList(html: string): ListRow[] {
  const $ = cheerio.load(html);
  const rows: ListRow[] = [];

  $('div.hyu-list-body-item[role="listitem"]').each((_, el) => {
    const row = $(el);
    const a = row.find('h4 > a').first();
    const href = a.attr('href') ?? '';
    const idMatch = href.match(/_entryId=(\d+)/);
    if (!idMatch) return; // 공지 행이 아니면 skip
    const post_id = idMatch[1];
    const title = a.text().replace(/\s+/g, ' ').trim();
    const link = absolutize(href) ?? detailUrl(post_id);

    const date_posted = normalizeDate(row.find('span.date').first().text());

    // 캠퍼스: custom-bg badge 우선, 없으면 화이트리스트 매칭
    let campus: string | null =
      row.find('span.hyu-badge.custom-bg[data-itemvalue]').first().attr('data-itemvalue')?.trim() ?? null;

    // 카테고리: 나머지 data-itemvalue badge
    let category: string | null = null;
    row.find('span.hyu-badge[data-itemvalue]').each((__, b) => {
      const v = $(b).attr('data-itemvalue')?.trim();
      if (!v) return;
      if (campus === null && CAMPUS_VALUES.has(v)) {
        campus = v;
        return;
      }
      if (v !== campus && category === null) category = v;
    });

    // 부서: <p> 안의 class 없는 일반 span (badge/date/separator 제외)
    let dept: string | null = null;
    row.find('p > span').each((__, s) => {
      const sp = $(s);
      if (sp.attr('class')) return; // badge/date/separator 등은 class 있음
      const t = sp.text().replace(/\s+/g, ' ').trim();
      if (t && dept === null) dept = t;
    });

    rows.push({ post_id, title, link, date_posted, dept, campus, category });
  });

  return rows;
}

/**
 * 상세 페이지 HTML → 본문/이미지/첨부
 * 본문 컨테이너: .noticeBoard-view-message  (※ .board-view 아님 — 실측 수정)
 * 이미지: img[src*="/documents/"] (png/jpg/jpeg/gif)
 * 첨부:   a[href*="portlet_file_entry"]
 */
export function parseDetail(html: string): DetailParts {
  const $ = cheerio.load(html);
  const msg = $('.noticeBoard-view-message').first();
  const scope = msg.length ? msg : $('body');

  const bodyText = scope.text().replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

  const image_urls: string[] = [];
  scope.find('img[src]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    if (/\/documents\//i.test(src) || /\.(png|jpe?g|gif)(\?|$)/i.test(src)) {
      const abs = absolutize(src);
      if (abs && !image_urls.includes(abs)) image_urls.push(abs);
    }
  });

  const file_urls: string[] = [];
  scope.find('a[href*="portlet_file_entry"]').each((_, el) => {
    const abs = absolutize($(el).attr('href'));
    if (abs && !file_urls.includes(abs)) file_urls.push(abs);
  });

  const notice_period = pickPeriod(bodyText, '공지기간');
  const event_period = pickPeriod(bodyText, '행사기간');

  return { body: bodyText, image_urls, file_urls, notice_period, event_period };
}

/** "공지기간 2026. 6. 22 ~ 2026. 7. 5" 형태에서 기간 추출 */
function pickPeriod(text: string, label: string): string | null {
  const d = '\\d{4}\\.\\s*\\d{1,2}\\.\\s*\\d{1,2}';
  const re = new RegExp(`${label}\\s*(${d})\\s*~\\s*(${d})`);
  const m = text.match(re);
  if (!m) return null;
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  return `${norm(m[1])} ~ ${norm(m[2])}`;
}
