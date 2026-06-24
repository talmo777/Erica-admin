/**
 * 일괄 수집 raw 스키마.
 * "분류는 나중, 원본만" — 정제된 contests 테이블이 아니라 raw 스테이징용.
 * 이미지/첨부 URL을 반드시 함께 저장 → 나중 OCR/PDF파싱 분류 시 재크롤 방지.
 */
export interface RawNotice {
  source: string;          // 수집 소스 식별자 (예: "hanyang-notice_all")
  post_id: string;         // 고유키 (= entryId)
  date_posted: string;     // 게시일 YYYY-MM-DD (파싱 실패 시 원문)
  title: string;
  body: string;            // 상세 본문 텍스트 (대부분 메타+포스터뿐일 수 있음)
  link: string;            // 상세 페이지 절대 URL
  image_urls: string[];    // 포스터/본문 이미지 절대 URL
  file_urls: string[];     // 첨부(hwpx/pdf 등) 절대 URL
  crawled_at: string;      // ISO timestamp

  // --- 보너스 (목록에서 추출, 분류 힌트용) ---
  dept?: string | null;        // 부서/작성팀
  campus?: string | null;      // 한양 | 서울 | ERICA ...
  category?: string | null;    // 모집/채용, 학사 ...
  notice_period?: string | null; // 공지기간 (상세에서 best-effort)
  event_period?: string | null;  // 행사기간 (상세에서 best-effort)
}

/** 목록 행만 파싱한 1차 결과 (상세 방문 전) */
export interface ListRow {
  post_id: string;
  title: string;
  link: string;
  date_posted: string;
  dept: string | null;
  campus: string | null;
  category: string | null;
}

/** 상세 페이지에서 추출한 본문/자산 */
export interface DetailParts {
  body: string;
  image_urls: string[];
  file_urls: string[];
  notice_period: string | null;
  event_period: string | null;
}
