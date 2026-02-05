// src/services/api.ts
const API_BASE_RAW = import.meta.env.BOARD_API_BASE_URL as string | undefined;
// trailing slash 제거해서 "//api/..." 같은 CORS/리다이렉트 이슈 방지
const API_BASE = API_BASE_RAW?.replace(/\/+$/, "");

// (선택) Board API에서 관리자 토큰을 요구하는 경우에만 세팅
// Vercel env에 BOARD_API_ADMIN_TOKEN 추가해서 사용
const ADMIN_TOKEN = (import.meta.env.BOARD_API_ADMIN_TOKEN as string | undefined) ?? undefined;

export type ApiContest = {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  apply_url: string;
  source_url: string | null;
  category: string;
  targets: string[] | null;
  start_date: string | null;
  end_date: string | null; // API에선 end_date가 마감일로 쓰이는 중
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ApiContestUpsertBody = {
  title: string;
  description: string;
  applyUrl: string;
  sourceUrl?: string | null;
  posterUrl?: string | null;
  category: string; // 예: "ICPBL" | "서포터즈" | "교내 공모전" | "대외활동"
  status: "draft" | "published" | "archived";
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null;   // YYYY-MM-DD (마감일)
  targets: string[];
};

function requireBase() {
  if (!API_BASE) throw new Error("BOARD_API_BASE_URL is not set");
}

function authHeaders(): Record<string, string> {
  return ADMIN_TOKEN ? { "x-admin-token": ADMIN_TOKEN } : {};
}

async function readError(res: Response) {
  const text = await res.text().catch(() => "");
  return `HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`;
}

export async function getContests(params?: {
  status?: "draft" | "published" | "archived";
}): Promise<ApiContest[]> {
  requireBase();

  const qs = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
  const res = await fetch(`${API_BASE}/api/v1/contests${qs}`);

  if (!res.ok) {
    throw new Error(`GET /contests failed: ${await readError(res)}`);
  }

  const data = (await res.json()) as { items: ApiContest[] };
  return data.items ?? [];
}

export async function createContest(body: ApiContestUpsertBody): Promise<ApiContest> {
  requireBase();

  const res = await fetch(`${API_BASE}/api/v1/contests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`POST /contests failed: ${await readError(res)}`);
  }

  return (await res.json()) as ApiContest;
}

export async function patchContest(id: string, body: Partial<ApiContestUpsertBody>): Promise<ApiContest> {
  requireBase();

  const res = await fetch(`${API_BASE}/api/v1/contests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`PATCH /contests/${id} failed: ${await readError(res)}`);
  }

  return (await res.json()) as ApiContest;
}

export async function deleteContest(id: string): Promise<{ ok: boolean }> {
  requireBase();

  const res = await fetch(`${API_BASE}/api/v1/contests/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(`DELETE /contests/${id} failed: ${await readError(res)}`);
  }

  return (await res.json()) as { ok: boolean };
}
