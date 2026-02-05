// src/services/api.ts
const API_BASE = import.meta.env.BOARD_API_BASE_URL;

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
  end_date: string | null;   // API에선 end_date가 마감일로 쓰이는 중
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export async function getContests(): Promise<ApiContest[]> {
  if (!API_BASE) throw new Error('BOARD_API_BASE_URL is not set');

  const res = await fetch(`${API_BASE}/api/v1/contests`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET /contests failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { items: ApiContest[] };
  return data.items ?? [];
}

