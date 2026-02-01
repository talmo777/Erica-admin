import { Contest, ContestStatus, DailyMetric, EmergencyTicket, InternalFeedback, KPIData, ContestCategory, TicketSeverity, TicketStatus } from '../types';
import { TOTAL_STUDENTS_ESTIMATE, TARGET_COLLEGES } from '../constants';

// --- Helpers ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Contests Repository ---
const STORAGE_KEY_CONTESTS = 'erica_contests_v1';

export const ContestRepository = {
  getAll: async (): Promise<Contest[]> => {
    await delay(300); // Simulate network
    const data = localStorage.getItem(STORAGE_KEY_CONTESTS);
    if (!data) return _seedContests();
    return JSON.parse(data);
  },

  save: async (contest: Contest): Promise<void> => {
    await delay(300);
    const contests = await ContestRepository.getAll();
    const index = contests.findIndex(c => c.id === contest.id);
    if (index >= 0) {
      contests[index] = { ...contest, updatedAt: new Date().toISOString() };
    } else {
      contests.push({ ...contest, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEY_CONTESTS, JSON.stringify(contests));
  },

  delete: async (id: string): Promise<void> => {
    await delay(300);
    const contests = await ContestRepository.getAll();
    const filtered = contests.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY_CONTESTS, JSON.stringify(filtered));
  }
};

// --- Metrics Repository ---
export const MetricsRepository = {
  getDailyMetrics: async (days: number = 7): Promise<DailyMetric[]> => {
    await delay(200);
    // Generate mock data dynamically based on requested days
    const result: DailyMetric[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      result.push({
        date: d.toISOString().split('T')[0],
        visitors: Math.floor(Math.random() * 200) + 50,
        clicks: Math.floor(Math.random() * 150) + 20,
        applyClicks: Math.floor(Math.random() * 50) + 5,
      });
    }
    return result;
  },

  getKPI: async (): Promise<KPIData> => {
    await delay(200);
    // In a real app, this would aggregate from the DB
    return {
      participationRate: 12.5,
      totalStudents: TOTAL_STUDENTS_ESTIMATE,
      totalApplies: 1125,
      activeUsersToday: 142
    };
  }
};

// --- Support Repository ---
const STORAGE_KEY_TICKETS = 'erica_admin_tickets';
const STORAGE_KEY_FEEDBACK = 'erica_admin_feedback';

export const SupportRepository = {
  getTickets: async (): Promise<EmergencyTicket[]> => {
    const data = localStorage.getItem(STORAGE_KEY_TICKETS);
    return data ? JSON.parse(data) : [];
  },
  saveTicket: async (ticket: Omit<EmergencyTicket, 'id' | 'createdAt' | 'status'>) => {
    const tickets = await SupportRepository.getTickets();
    const newTicket: EmergencyTicket = {
      ...ticket,
      id: generateId(),
      status: TicketStatus.OPEN,
      createdAt: new Date().toISOString()
    };
    tickets.unshift(newTicket);
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
  },
  
  getFeedback: async (): Promise<InternalFeedback[]> => {
    const data = localStorage.getItem(STORAGE_KEY_FEEDBACK);
    return data ? JSON.parse(data) : [];
  },
  saveFeedback: async (feedback: Omit<InternalFeedback, 'id' | 'createdAt' | 'isResolved'>) => {
    const list = await SupportRepository.getFeedback();
    const newItem: InternalFeedback = {
      ...feedback,
      id: generateId(),
      isResolved: false,
      createdAt: new Date().toISOString()
    };
    list.unshift(newItem);
    localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(list));
  }
};


// --- Seeding ---
function _seedContests(): Contest[] {
  const seeds: Contest[] = [
    {
      id: '1',
      title: '2024학년도 1학기 HY-Lion 서포터즈 모집',
      description: '한양대학교 ERICA 홍보대사 모집 공고입니다.',
      imageUrl: 'https://picsum.photos/400/200?random=1',
      applyUrl: 'https://hanyang.ac.kr',
      category: ContestCategory.SUPPORTERS,
      status: ContestStatus.PUBLISHED,
      targets: ['교수학습센터', '커뮤니케이션&컬쳐대학'],
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 1240
    },
    {
      id: '2',
      title: '소프트웨어융합대학 IC-PBL 경진대회',
      description: '창의적인 문제 해결 능력을 기르는 IC-PBL 대회',
      imageUrl: 'https://picsum.photos/400/200?random=2',
      applyUrl: 'https://hanyang.ac.kr',
      category: ContestCategory.ICPBL,
      status: ContestStatus.DRAFT,
      targets: ['소프트웨어융합대학', '공학대학'],
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 14).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 0
    }
  ];
  localStorage.setItem(STORAGE_KEY_CONTESTS, JSON.stringify(seeds));
  return seeds;
}