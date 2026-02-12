import { Contest, ContestStatus, DailyMetric, EmergencyTicket, InternalFeedback, KPIData, ContestCategory, TicketSeverity, TicketStatus } from '../types';
import { TOTAL_STUDENTS_ESTIMATE } from '../constants';

// --- Helpers ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Contests Repository ---
const STORAGE_KEY_CONTESTS = 'erica_contests_v1';

export const ContestRepository = {
  getAll: async (): Promise<Contest[]> => {
    await delay(300); // Simulate network
    
    const stored = localStorage.getItem(STORAGE_KEY_CONTESTS);
    if (!stored) return [];
    return JSON.parse(stored);
  },

  create: async (contest: Partial<Contest>): Promise<Contest> => {
    await delay(300);
    
    const contests = await ContestRepository.getAll();
    const newContest: Contest = {
      id: generateId(),
      title: contest.title || '',
      description: contest.description || '',
      imageUrl: contest.imageUrl || '',
      applyUrl: contest.applyUrl || '',
      category: contest.category || ContestCategory.CAMPUS,
      status: contest.status || ContestStatus.DRAFT,
      targets: contest.targets || [],
      startDate: contest.startDate || '',
      endDate: contest.endDate || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 0,
    };

    contests.unshift(newContest);
    localStorage.setItem(STORAGE_KEY_CONTESTS, JSON.stringify(contests));
    return newContest;
  },

  update: async (id: string, updates: Partial<Contest>): Promise<Contest | null> => {
    await delay(300);
    
    const contests = await ContestRepository.getAll();
    const index = contests.findIndex(c => c.id === id);
    if (index === -1) return null;

    contests[index] = {
      ...contests[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY_CONTESTS, JSON.stringify(contests));
    return contests[index];
  },

  delete: async (id: string): Promise<boolean> => {
    await delay(300);
    
    const contests = await ContestRepository.getAll();
    const filtered = contests.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY_CONTESTS, JSON.stringify(filtered));
    return true;
  },
};

// --- Metrics Repository ---
const STORAGE_KEY_METRICS = 'erica_metrics_v1';

export const MetricsRepository = {
  getDailyMetrics: async (): Promise<DailyMetric[]> => {
    await delay(200);
    
    const stored = localStorage.getItem(STORAGE_KEY_METRICS);
    return stored ? JSON.parse(stored) : [];
  },

  getKPI: async (): Promise<KPIData> => {
    await delay(200);
    
    // Mock KPI data
    const totalApplies = Math.floor(Math.random() * 1000) + 500;
    const activeUsersToday = Math.floor(Math.random() * 200) + 50;

    return {
      participationRate: (totalApplies / TOTAL_STUDENTS_ESTIMATE) * 100,
      totalStudents: TOTAL_STUDENTS_ESTIMATE,
      totalApplies,
      activeUsersToday,
    };
  },
};

// --- Emergency Tickets Repository ---
const STORAGE_KEY_TICKETS = 'erica_tickets_v1';

export const TicketRepository = {
  getAll: async (): Promise<EmergencyTicket[]> => {
    await delay(200);
    const stored = localStorage.getItem(STORAGE_KEY_TICKETS);
    return stored ? JSON.parse(stored) : [];
  },

  create: async (ticket: Partial<EmergencyTicket>): Promise<EmergencyTicket> => {
    await delay(200);
    
    const tickets = await TicketRepository.getAll();
    const newTicket: EmergencyTicket = {
      id: generateId(),
      type: ticket.type || '기타',
      severity: ticket.severity || TicketSeverity.NORMAL,
      status: ticket.status || TicketStatus.OPEN,
      description: ticket.description || '',
      reproductionSteps: ticket.reproductionSteps,
      contact: ticket.contact,
      createdAt: new Date().toISOString(),
    };

    tickets.unshift(newTicket);
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
    return newTicket;
  },

  updateStatus: async (id: string, status: TicketStatus): Promise<EmergencyTicket | null> => {
    await delay(200);
    
    const tickets = await TicketRepository.getAll();
    const index = tickets.findIndex(t => t.id === id);
    if (index === -1) return null;

    tickets[index] = { ...tickets[index], status };
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
    return tickets[index];
  },
};

// --- Internal Feedback Repository ---
const STORAGE_KEY_FEEDBACK = 'erica_feedback_v1';

export const FeedbackRepository = {
  getAll: async (): Promise<InternalFeedback[]> => {
    await delay(200);
    const stored = localStorage.getItem(STORAGE_KEY_FEEDBACK);
    return stored ? JSON.parse(stored) : [];
  },

  create: async (feedback: Partial<InternalFeedback>): Promise<InternalFeedback> => {
    await delay(200);
    
    const feedbacks = await FeedbackRepository.getAll();
    const newFeedback: InternalFeedback = {
      id: generateId(),
      title: feedback.title || '',
      content: feedback.content || '',
      type: feedback.type || '요청',
      importance: feedback.importance || '중',
      createdAt: new Date().toISOString(),
      isResolved: false,
    };

    feedbacks.unshift(newFeedback);
    localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(feedbacks));
    return newFeedback;
  },

  resolve: async (id: string): Promise<InternalFeedback | null> => {
    await delay(200);
    
    const feedbacks = await FeedbackRepository.getAll();
    const index = feedbacks.findIndex(f => f.id === id);
    if (index === -1) return null;

    feedbacks[index] = { ...feedbacks[index], isResolved: true };
    localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(feedbacks));
    return feedbacks[index];
  },
};
