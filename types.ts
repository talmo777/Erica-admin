// --- Domain Enums & Types ---

/**
 * 관리자 웹에서 사용하는 카테고리
 * - 교내 공모전
 * - 서포터즈
 * - IC-PBL
 * - 대외활동
 */
export enum ContestCategory {
  CAMPUS = '교내 공모전',
  SUPPORTERS = '서포터즈',
  ICPBL = 'IC-PBL',
  EXTERNAL = '대외활동',
}

export enum ContestStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * 관리자 웹 "게시 대상" 옵션 (향후 권한/연동 시 배포 타겟으로 사용)
 * - 지금 단계에서는 실제 자동 업로드는 하지 않고, 선택값을 레코드에 저장해 둠
 */
export type TargetSite =
  | '한양대학교 포털'
  | '한양대학교 ERICA 학술정보관'
  | 'ERICA IC-PBL 교수학습센터'
  | '뉴스H'
  | '한양대학교 ERICA 창업교육센터'
  | '한양대학교 ERICA 비교과 통합관리시스템 (게시판)'
  | '한양대학교 에리카 국제처'
  | '한양대학교 에리카캠퍼스 (에리카 산업협력단지)'
  | '디자인대학'
  | '한양대학교 ERICA 경상대학'
  | '한양대학교 에리카 LIONS 칼리지'
  | '한양대학교 소프트웨어융합대학'
  | 'ERICA 공학대학'
  | '한양대학교 커뮤니케이션&컬쳐대학'
  | '글로벌문화통상대학'
  | '한양대학교 에리카 첨단융합대학'
  | '한양대 약학대학'
  | '한양대 예체능대학';

export interface Contest {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  applyUrl: string;
  sourceUrl: string; // 크롤링 원문 URL (AI 추출 자동 채우기용)
  category: ContestCategory;
  status: ContestStatus;
  targets: TargetSite[];
  startDate: string; // ISO Date
  endDate: string;   // ISO Date
  createdAt: string;
  updatedAt: string;
  viewCount: number;
}

// --- Metrics & Analytics ---

export interface DailyMetric {
  date: string;
  visitors: number;
  clicks: number;
  applyClicks: number;
}

export interface KPIData {
  participationRate: number; // percentage
  totalStudents: number; // Configurable constant
  totalApplies: number;
  activeUsersToday: number;
}

// --- Support & Feedback ---

export enum TicketSeverity {
  CRITICAL = '치명',
  HIGH = '높음',
  NORMAL = '보통',
  LOW = '낮음'
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = '진행중',
  RESOLVED = '해결됨'
}

export interface EmergencyTicket {
  id: string;
  type: '로그인' | '게시' | '통계' | '크롤링' | '기타';
  severity: TicketSeverity;
  status: TicketStatus;
  description: string;
  reproductionSteps?: string;
  contact?: string;
  createdAt: string;
}

export interface InternalFeedback {
  id: string;
  title: string;
  content: string;
  type: '버그' | '개선' | '요청';
  importance: '상' | '중' | '하';
  createdAt: string;
  isResolved: boolean;
}

// --- UI constants ---

export const TARGET_OPTIONS: TargetSite[] = [
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
