import type { RawNotice } from '../types.ts';

export interface CrawlParams {
  from: string | null;        // YYYY-MM-DD 이상
  to: string | null;          // YYYY-MM-DD 이하
  campus: string[] | null;    // notice_all 등 캠퍼스 지원 소스용
  pages: number;
  withDetail: boolean;
  delayMs: number;
  limit: number | null;
  onLog?: (m: string) => void;
}

export interface SourceMeta {
  id: string;
  label: string;              // UI 표시 라벨 (출처 뱃지)
  homepage: string;
  supportsCampus: boolean;    // 캠퍼스 필터 지원 여부
  dateSource: 'list' | 'detail'; // 날짜를 목록에서 얻는지/상세에서 얻는지
  note?: string;
  enabled: boolean;           // false면 UI에서 '준비중' 비활성
}

export interface SourceAdapter extends SourceMeta {
  crawl(params: CrawlParams): Promise<RawNotice[]>;
}
