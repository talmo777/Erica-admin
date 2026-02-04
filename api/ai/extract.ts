// services/aiExtract.ts

export type AiExtractResult = {
  titleSummary: string;         // 제목요약
  description: string;          // 본문
  organizer: string | null;     // 주최/주관
  target: string | null;        // 대상(학과/학년/전공 등)
  scheduleStart: string | null; // YYYY-MM-DD
  scheduleEnd: string | null;   // YYYY-MM-DD
};

const API_BASE_RAW = import.meta.env.VITE_API_BASE_URL as string | undefined;
const API_BASE = (API_BASE_RAW ?? '').replace(/\/+$/, ''); // 
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN_AI as string | undefined;

type BackendResponse = {
  ok?: boolean;
  result?: Partial<AiExtractResult> & {
    // 과거/혼재 대응(혹시 다른 키로 올 때)
    summaryTitle?: string;
    host?: string;
    targetSummary?: string;
    applyStartDate?: string;
    applyEndDate?: string;
  };
  raw?: string;
};

function normStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function normNullable(v: unknown): string | null {
  const s = normStr(v);
  return s ? s : null;
}

export async function extractContestInfo(file: File): Promise<AiExtractResult> {
  if (!API_BASE) return {
    titleSummary: '',
    description: '',
    organizer: null,
    target: null,
    scheduleStart: null,
    scheduleEnd: null,
  };

  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/api/v1/ai/extract`, {
    method: 'POST',
    headers: {
      ...(ADMIN_TOKEN ? { 'X-Admin-Token': ADMIN_TOKEN } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI extract failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as BackendResponse;

  const r = data.result ?? {};

  // ✅ 백엔드 result의 키를 고정 형태로 normalize
  const titleSummary = normStr((r as any).titleSummary ?? (r as any).summaryTitle);
  const description = normStr((r as any).description);

  const organizer = normNullable((r as any).organizer ?? (r as any).host);
  const target = normNullable((r as any).target ?? (r as any).targetSummary);

  const scheduleStart = normNullable((r as any).scheduleStart ?? (r as any).applyStartDate);
  const scheduleEnd = normNullable((r as any).scheduleEnd ?? (r as any).applyEndDate);

  return {
    titleSummary,
    description,
    organizer,
    target,
    scheduleStart,
    scheduleEnd,
  };
}
