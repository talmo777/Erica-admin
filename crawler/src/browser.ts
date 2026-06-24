import { chromium, type Browser } from 'playwright';

// JS 렌더/포스트백 사이트(LIONS 등)용 공유 헤드리스 브라우저. 프로세스당 1개 재사용.
let _browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await chromium.launch({ headless: true });
  return _browser;
}

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    try { await _browser.close(); } catch { /* ignore */ }
    _browser = null;
  }
}
