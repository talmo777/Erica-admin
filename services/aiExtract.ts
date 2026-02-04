// services/aiExtract.ts
export type AiExtractResult = {
  summaryTitle?: string;      // 제목 요약/추천 (선택)
  description?: string;       // 설명(본문)
  host?: string;              // 주최/주관
  targetSummary?: string;     // 대상(학과/학년/전공 등 요약)
  applyStartDate?: string;    // YYYY-MM-DD (선택)
  applyEndDate?: string;      // YYYY-MM-DD (선택)
};

const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN as string | undefined;

/**
 * 백엔드에 multipart/form-data로 파일 업로드 → 추출 결과 JSON 받기
 * 백엔드 엔드포인트 예시: POST {API_BASE}/api/v1/ai/extract
 */
export async function extractContestInfo(file: File): Promise<AiExtractResult> {
  if (!API_BASE) {
    // API_BASE 없으면 개발 중이라는 뜻 → 안전하게 빈 값 반환
    return {};
  }

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/api/v1/ai/extract`, {
    method: "POST",
    headers: {
      ...(ADMIN_TOKEN ? { "x-admin-token": ADMIN_TOKEN } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI extract failed: ${res.status} ${text}`);
  }

  return (await res.json()) as AiExtractResult;
}
