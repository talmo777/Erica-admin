/**
 * 기존 inbox.jsonl → Supabase raw_notices 1회 백필.
 * 실행: node --env-file=../.env.local backfill.ts
 *   (SUPABASE_URL/KEY 또는 VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY 필요)
 */
import { InboxStore } from './src/store.ts';
import { pushToSupabase, supabaseEnabled } from './src/supabaseSink.ts';

if (!supabaseEnabled) {
  console.error('SUPABASE env 없음 — `node --env-file=../.env.local backfill.ts` 로 실행하세요.');
  process.exit(1);
}

const store = new InboxStore(process.env.CRAWLER_STORE ?? './out/inbox.jsonl');
const all = store.list();
console.log(`백필 대상 ${all.length}건 → raw_notices`);
const res = await pushToSupabase(all);
if (res.ok) console.log(`✅ 완료: ${res.count}건 적재`);
else console.error(`❌ 실패: ${res.error} (적재 ${res.count}건)`);
