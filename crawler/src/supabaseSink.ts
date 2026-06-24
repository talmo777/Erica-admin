import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { StoredNotice } from './store.ts';

// 크롤러는 Node → process.env에서 읽음. 서버를 `node --env-file=../.env.local ...`로 띄우면
// 프론트용 VITE_SUPABASE_* 가 그대로 주입됨.
const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export const supabaseEnabled = Boolean(URL && KEY);
const sb: SupabaseClient | null = supabaseEnabled ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

let tableMissingWarned = false;

function toRow(n: StoredNotice) {
  return {
    source: n.source,
    post_id: n.post_id,
    date_posted: n.date_posted || null,
    title: n.title,
    body: n.body,
    link: n.link,
    image_urls: n.image_urls,
    file_urls: n.file_urls,
    dept: n.dept ?? null,
    campus: n.campus ?? null,
    category: n.category ?? null,
    notice_period: n.notice_period ?? null,
    event_period: n.event_period ?? null,
    status: n.status,
    first_seen: n.first_seen || null,
    crawled_at: n.crawled_at || null,
    updated_at: new Date().toISOString(),
  };
}

/** raw_notices upsert (source,post_id 충돌 시 갱신). 청크 단위. */
export async function pushToSupabase(rows: StoredNotice[]): Promise<{ ok: boolean; count: number; error?: string }> {
  if (!sb) return { ok: false, count: 0, error: 'SUPABASE env 없음' };
  if (rows.length === 0) return { ok: true, count: 0 };

  let count = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map(toRow);
    const { error } = await sb.from('raw_notices').upsert(chunk, { onConflict: 'source,post_id' });
    if (error) {
      const msg = error.message || String(error);
      if (/raw_notices/.test(msg) && /(not find|does not exist|schema cache)/i.test(msg)) {
        if (!tableMissingWarned) {
          console.warn('[supabase] raw_notices 테이블 없음 → DB 적재 건너뜀. sql/raw_notices.sql 실행 필요.');
          tableMissingWarned = true;
        }
        return { ok: false, count, error: 'raw_notices 테이블 없음' };
      }
      return { ok: false, count, error: msg };
    }
    count += chunk.length;
  }
  return { ok: true, count };
}
