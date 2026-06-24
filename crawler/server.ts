/**
 * 로컬 크롤러 제어 서버 (관리자 UI "수집 인박스" 탭이 호출).
 * 추가 의존성 없이 node:http 사용.
 *
 * 실행: node server.ts   (기본 포트 8787, env CRAWLER_PORT로 변경)
 *
 * 엔드포인트:
 *   GET  /api/health
 *   GET  /api/sources                  → 등록된 크롤 소스 목록
 *   GET  /api/notices                  → 누적 수집 목록
 *   POST /api/crawl  {sources[],from,to,campus,pages?,detail?}  → 멀티소스 크롤 후 누적
 *   POST /api/notices/status {post_id,status}                   → 상태 변경
 */
import { createServer } from 'node:http';
import { InboxStore } from './src/store.ts';
import type { NoticeStatus } from './src/store.ts';
import { SOURCES, getSource, listSourceMeta } from './src/sources/index.ts';
import type { RawNotice } from './src/types.ts';
import { RunsStore } from './src/runsStore.ts';
import { pushToSupabase, supabaseEnabled } from './src/supabaseSink.ts';

const PORT = Number(process.env.CRAWLER_PORT ?? 8787);
const STORE_PATH = process.env.CRAWLER_STORE ?? './out/inbox.jsonl';
const store = new InboxStore(STORE_PATH);
const runs = new RunsStore(process.env.CRAWLER_RUNS ?? './out/crawl-runs.jsonl');

let crawling = false; // 동시 크롤 방지 lock

function send(res: any, status: number, body: unknown) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req: any): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

const VALID_STATUS: NoticeStatus[] = ['new', 'reviewed', 'ignored', 'promoted'];

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    const path = url.pathname;

    if (req.method === 'OPTIONS') return send(res, 204, {});

    if (req.method === 'GET' && path === '/api/health') {
      return send(res, 200, { ok: true, total: store.size, crawling });
    }

    if (req.method === 'GET' && path === '/api/sources') {
      return send(res, 200, { ok: true, sources: listSourceMeta() });
    }

    if (req.method === 'GET' && path === '/api/notices') {
      return send(res, 200, { ok: true, total: store.size, items: store.list() });
    }

    if (req.method === 'GET' && path === '/api/runs') {
      return send(res, 200, { ok: true, runs: runs.list(50) });
    }

    if (req.method === 'POST' && path === '/api/crawl') {
      if (crawling) return send(res, 409, { ok: false, error: '이미 크롤링 중입니다.' });
      const body = await readJson(req);

      // 소스 선택 (없으면 enabled 전체)
      const ids: string[] = Array.isArray(body.sources) && body.sources.length
        ? body.sources
        : SOURCES.filter((s) => s.enabled).map((s) => s.id);

      const from: string | null = body.from ?? null;
      const to: string | null = body.to ?? null;
      const campusRaw: string = (body.campus ?? 'ERICA').trim();
      const campus =
        campusRaw.toLowerCase() === 'all'
          ? null
          : campusRaw.split(',').map((s: string) => s.trim()).filter(Boolean);
      const pages = Number(body.pages ?? (from ? 15 : 3));
      const withDetail = body.detail !== false;
      const delayMs = Number(body.delay ?? 400);

      crawling = true;
      const t0 = Date.now();
      const perSource: Record<string, number> = {};
      try {
        let all: RawNotice[] = [];
        for (const id of ids) {
          const src = getSource(id);
          if (!src || !src.enabled) { perSource[id] = -1; continue; }
          const recs = await src.crawl({
            from, to,
            campus: src.supportsCampus ? campus : null,
            pages, withDetail, delayMs,
            limit: body.limit ?? null,
            onLog: (m) => console.log(`[crawl:${id}]`, m),
          });
          perSource[id] = recs.length;
          all = all.concat(recs);
        }
        const added = store.upsertMany(all);

        // Supabase dual-write (raw_notices) — JSONL은 그대로 유지
        let dbPushed = 0;
        if (supabaseEnabled) {
          const keys = new Set(all.map((r) => `${r.source}:${r.post_id}`));
          const toPush = store.list().filter((s) => keys.has(`${s.source}:${s.post_id}`));
          const res = await pushToSupabase(toPush);
          dbPushed = res.count;
          if (!res.ok) console.warn('[supabase] dual-write 실패:', res.error);
        }

        runs.add({
          ran_at: new Date().toISOString(),
          sources: ids,
          from, to,
          campus: campusRaw,
          crawled: all.length,
          added,
          perSource,
        });
        return send(res, 200, {
          ok: true,
          crawled: all.length,
          added,
          total: store.size,
          perSource,
          dbPushed,
          elapsedMs: Date.now() - t0,
        });
      } finally {
        crawling = false;
      }
    }

    if (req.method === 'POST' && path === '/api/notices/status') {
      const body = await readJson(req);
      const { post_id, status } = body;
      if (!post_id || !VALID_STATUS.includes(status)) {
        return send(res, 400, { ok: false, error: 'post_id/status 필요' });
      }
      const ok = store.setStatus(post_id, status);
      return send(res, ok ? 200 : 404, { ok });
    }

    return send(res, 404, { ok: false, error: 'Not Found' });
  } catch (e: any) {
    console.error('server error:', e);
    return send(res, 500, { ok: false, error: e?.message ?? String(e) });
  }
});

server.listen(PORT, () => {
  console.log(`크롤러 서버 → http://localhost:${PORT}  (store: ${STORE_PATH}, ${store.size}건, 소스 ${SOURCES.length}개)`);
});
