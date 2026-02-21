import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL  as string | undefined) ?? '';
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

// Log missing env vars as a warning (never throw at module level — a module-level
// throw crashes the bundle before React mounts, producing a blank white screen).
if (!url || !anon) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY 가 설정되지 않았습니다. ' +
    'Vercel 환경 변수 설정을 확인하세요.'
  );
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anon || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Edge/Safari 호환: PKCE OAuth 방식 사용
    // storage 옵션 미설정 → supabase 내부의 supportsLocalStorage() 안전 체크 사용
  },
});
