import { TargetCollege, ContestCategory } from './types';

export const TARGET_COLLEGES: TargetCollege[] = [
  '공학대학',
  '소프트웨어융합대학',
  '첨단융합대학',
  '약학대학',
  '글로벌문화통상대학',
  '커뮤니케이션&컬쳐대학',
  '경상대학',
  '디자인대학',
  '예체능대학',
  'LIONS칼리지',
  '교수학습센터'
];

export const CONTEST_CATEGORIES: ContestCategory[] = [
  ContestCategory.SUPPORTERS,
  ContestCategory.ICPBL,
  ContestCategory.CAMPUS,
  ContestCategory.EXTERNAL
];

export const TOTAL_STUDENTS_ESTIMATE = 9000; // ERICA undergraduate estimate

// Placeholder for images
// constants.ts

export const HYU_LOGO_URL =
  "https://image2url.com/r2/default/images/1769933134031-861058ef-560f-4e86-8eeb-a56dc816cbc0.png";

export const MOYEON_LOGO_URL =
  "https://image2url.com/r2/default/images/1769933187730-7b885fbb-7460-4a99-96a2-477a9d1d53f3.png";

export const MOYEON_LINK_URL = "https://moyeon-landing-page-v2.vercel.app/";
export const USER_WEB_URL = "https://hyu-erica-board.vercel.app/";

// ✅ iframe용(권장): embed URL
// 보통 /form -> /embed 로 바꾸면 iframe에서 동작
export const AIRTABLE_FEEDBACK_EMBED_URL =
  "https://airtable.com/embed/appNU81TMufdHbQiE/pagmS8nM7XdHTdTzW/form";
export const DEFAULT_IMAGE_PLACEHOLDER = ""; // 이미지 없을 때 fallback (원하면 placeholder 이미지 URL로 교체)

export const AIRTABLE_FEEDBACK_FORM_URL =
  "https://airtable.com/appNU81TMufdHbQiE/pagmS8nM7XdHTdTzW/form";
