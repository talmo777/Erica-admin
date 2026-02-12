import { ContestCategory, TargetSite } from './types';

/**
 * (옵션) 관리자 웹에서 별도로 쓰는 상수들.
 * 지금은 types.ts의 TARGET_OPTIONS를 직접 써도 되지만,
 * 기존 구조를 유지하기 위해 남겨둠.
 */
export const TARGET_SITES: TargetSite[] = [
  '한양대학교 포털',
  '한양대학교 ERICA 학술정보관',
  'ERICA IC-PBL 교수학습센터',
  '뉴스H',
  '한양대학교 ERICA 창업교육센터',
  '한양대학교 ERICA 비교과 통합관리시스템 (게시판)',
  '한양대학교 에리카 국제처',
  '한양대학교 에리카캠퍼스 (에리카 산업협력단지)',
  '디자인대학',
  '한양대학교 ERICA 경상대학',
  '한양대학교 에리카 LIONS 칼리지',
  '한양대학교 소프트웨어융합대학',
  'ERICA 공학대학',
  '한양대학교 커뮤니케이션&컬쳐대학',
  '글로벌문화통상대학',
  '한양대학교 에리카 첨단융합대학',
  '한양대 약학대학',
  '한양대 예체능대학',
];

export const CONTEST_CATEGORIES: ContestCategory[] = [
  ContestCategory.CAMPUS,
  ContestCategory.SUPPORTERS,
  ContestCategory.ICPBL,
];

export const TOTAL_STUDENTS_ESTIMATE = 9000; // ERICA undergraduate estimate

export const HYU_LOGO_URL =
  "https://image2url.com/r2/default/images/1769933134031-861058ef-560f-4e86-8eeb-a56dc816cbc0.png";

export const MOYEON_LOGO_URL =
  "https://image2url.com/r2/default/images/1769933187730-7b885fbb-7460-4a99-96a2-477a9d1d53f3.png";

export const MOYEON_LINK_URL = "https://moyeon-landing-page-v2.vercel.app/";
export const USER_WEB_URL = "https://hyu-erica-board.vercel.app/";

// ✅ iframe용(권장): embed URL
export const AIRTABLE_FEEDBACK_EMBED_URL =
  "https://airtable.com/embed/appNU81TMufdHbQiE/pagmS8nM7XdHTdTzW/form";

export const DEFAULT_IMAGE_PLACEHOLDER = ""; // 이미지 없을 때 fallback

export const AIRTABLE_FEEDBACK_FORM_URL =
  "https://airtable.com/appNU81TMufdHbQiE/pagmS8nM7XdHTdTzW/form";

export const LOGO_PLACEHOLDER = HYU_LOGO_URL;
