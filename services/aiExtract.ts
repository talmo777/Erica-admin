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
    // 혼재 키 대응
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

export async function extractContestInfo(file: File): Promise<AiExtractResult> {
  const form = new FormData();
  form.append("file", file);

  // ✅ 이제 Board-API 직접 호출 금지. Admin의 프록시로만 호출
  const res = await fetch("/api/ai/extract", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI extract failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as BackendResponse;

  if (data?.ok === false) {
    throw new Error(data.error || "AI extract failed (ok=false).");
  }

  const r = data.result ?? {};

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
