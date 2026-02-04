// --- Domain Enums & Types ---

export enum ContestCategory {
  SUPPORTERS = '서포터즈',
  ICPBL = 'IC-PBL',
  CAMPUS = '교내 공모전',
  EXTERNAL = '대외활동'
}

export enum ContestStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export type TargetCollege = 
  | '공학대학'
  | '소프트웨어융합대학'
  | '첨단융합대학'
  | '약학대학'
  | '글로벌문화통상대학'
  | '커뮤니케이션&컬쳐대학'
  | '경상대학'
  | '디자인대학'
  | '예체능대학'
  | 'LIONS칼리지'
  | '교수학습센터';

export interface Contest {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  applyUrl: string;
  category: ContestCategory;
  status: ContestStatus;
  targets: TargetCollege[];
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

// --- UI Constants ---

export const TARGET_OPTIONS: TargetCollege[] = [
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
  '교수학습센터',
];
