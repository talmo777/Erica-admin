import { crawlNotices } from '../crawl.ts';
import type { SourceAdapter, CrawlParams } from './types.ts';

/** 한양대 전체공지 (Liferay). 본부/행정 중심 채널. 캠퍼스 필터 + 목록단 날짜 지원. */
export const noticeAllSource: SourceAdapter = {
  id: 'notice_all',
  label: '전체공지',
  homepage: 'https://www.hanyang.ac.kr/web/www/notice_all',
  supportsCampus: true,
  dateSource: 'list',
  enabled: true,
  note: '한양대 통합 전체공지 (본부·센터 중심)',

  async crawl(p: CrawlParams) {
    const { records } = await crawlNotices({
      source: 'notice_all',
      pages: p.pages,
      from: p.from,
      to: p.to,
      campusFilter: p.campus,
      withDetail: p.withDetail,
      delayMs: p.delayMs,
      limit: p.limit,
      onLog: p.onLog,
    });
    return records;
  },
};
