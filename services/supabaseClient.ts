import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url) throw new Error('VITE_SUPABASE_URL is not set');
if (!anon) throw new Error('VITE_SUPABASE_ANON_KEY is not set');

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',           // Edge 등 다양한 브라우저에서 안정적인 PKCE 방식 사용
    storage: window.localStorage, // 명시적 localStorage 사용 (Edge 쿠키 이슈 방지)
  }
});
