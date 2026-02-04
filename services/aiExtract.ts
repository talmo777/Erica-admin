// services/aiExtract.ts

export type AiExtractResult = {
  titleSummary: string;         // 제목요약
  description: string;          // 본문
  organizer: string | null;     // 주최/주관
  target: string | null;        // 대상(학과/학년/전공 등)
  scheduleStart: string | null; // YYYY-MM-DD
  scheduleEnd: string | null;   // YYYY-MM-DD
};

type BackendResponse = {
  ok?: boolean;
  result?: Partial<AiExtractResult> & {
    // 혼재 키 대응(과거/다른 버전)
    summaryTitle?: string;
    host?: string;
    targetSummary?: string;
    applyStartDate?: string;
    applyEndDate?: string;
  };
  raw?: string;
  error?: string;
};

function normStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normNullable(v: unknown): string | null {
  const s = normStr(v);
  return s ? s : null;
}

function normalizeBaseUrl(raw?: string) {
  return (raw ?? "").trim().replace(/\/+$/, "");
}

const API_BASE = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
const ADMIN_TOKEN = (import.meta.env.VITE_ADMIN_TOKEN_AI as string | undefined)?.trim();

export async function extractContestInfo(file: File): Promise<AiExtractResult> {
  if (!API_BASE) {
    throw new Error("VITE_API_BASE_URL is missing (admin env).");
  }

  const form = new FormData();
  form.append("file", file);

  const url = `${API_BASE}/api/v1/ai/extract`;

  const res = await fetch(url, {
    method: "POST",
    // ⚠️ multipart/form-data일 때 Content-Type을 직접 지정하면 boundary 깨짐 -> 지정하지 말 것
    headers: {
      ...(ADMIN_TOKEN ? { "X-Admin-Token": ADMIN_TOKEN } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    // 에러 응답이 json일 수도 있고 text일 수도 있음 → 둘 다 방어
    const text = await res.text().catch(() => "");
    throw new Error(`AI extract failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as BackendResponse;

  // 백엔드가 ok:false 형태로 내려도 방어
  if (data?.ok === false) {
    throw new Error(data.error || "AI extract failed (ok=false).");
  }

  const r = data.result ?? {};

  // ✅ 백엔드 result 키 normalize
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
