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
export const DEFAULT_IMAGE_PLACEHOLDER = "https://picsum.photos/400/200";
export const LOGO_PLACEHOLDER = "https://picsum.photos/40/40"; // TODO: Replace with ERICA Logo
export const AVATAR_PLACEHOLDER = "https://picsum.photos/32/32";