// 한양대 일부 캠퍼스/단과대 사이트는 인증서 체인이 불완전(중간 CA 누락) → 로컬 크롤러에서만 검증 완화.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** UA 지정 + 재시도(지수 백오프) 포함 HTML fetch */
export async function fetchHtml(
  url: string,
  opts: { retries?: number; timeoutMs?: number } = {}
): Promise<string> {
  const retries = opts.retries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 20_000;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (attempt < retries) await sleep(500 * Math.pow(2, attempt));
    }
  }
  throw new Error(`fetch failed after ${retries + 1} tries: ${url} :: ${String(lastErr)}`);
}
