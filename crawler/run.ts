/**
 * ERICA 공지 일괄 수집 CLI (멀티소스)
 *
 * 사용:
 *   node run.ts                              # 전체 소스, 기본 3페이지, ERICA, 상세포함
 *   node run.ts --source notice_all,eec      # 특정 소스만
 *   node run.ts --from 2026-06-13            # 날짜 범위 (이상)
 *   node run.ts --from 2026-06-01 --to 2026-06-20
 *   node run.ts --campus all                 # 캠퍼스 필터 해제 (notice_all)
 *   node run.ts --no-detail                  # 목록만 (빠름)
 *   node run.ts --out ./out/inbox.jsonl
 */
import { InboxStore } from './src/store.ts';
import { SOURCES, getSource } from './src/sources/index.ts';
import type { RawNotice } from './src/types.ts';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const pages = Number(arg('pages') ?? 3);
const delayMs = Number(arg('delay') ?? 600);
const limit = arg('limit') ? Number(arg('limit')) : null;
const withDetail = !flag('no-detail');
const from = arg('from') ?? null;
const to = arg('to') ?? null;
const out = arg('out') ?? './out/inbox.jsonl';

const campusRaw = (arg('campus') ?? 'ERICA').trim();
const campus = campusRaw.toLowerCase() === 'all' ? null : campusRaw.split(',').map((s) => s.trim()).filter(Boolean);

const sourceIds = (arg('source') ?? SOURCES.filter((s) => s.enabled).map((s) => s.id).join(','))
  .split(',').map((s) => s.trim()).filter(Boolean);

console.log('=== ERICA bulk crawler (multi-source) ===');
console.log({ sources: sourceIds, pages, from, to, campus: campus ?? 'ALL', withDetail, delayMs, limit, out });

const t0 = Date.now();
let all: RawNotice[] = [];
for (const id of sourceIds) {
  const src = getSource(id);
  if (!src) { console.log(`(skip unknown source: ${id})`); continue; }
  console.log(`\n--- ${src.label} (${id}) ---`);
  const recs = await src.crawl({
    from, to,
    campus: src.supportsCampus ? campus : null,
    pages, withDetail, delayMs, limit,
    onLog: (m) => console.log(m),
  });
  console.log(`  → ${recs.length}건`);
  all = all.concat(recs);
}

const store = new InboxStore(out);
const added = store.upsertMany(all);

console.log('\n=== done ===');
console.log(`crawled=${all.length} added=${added} total=${store.size} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`store → ${out}`);
