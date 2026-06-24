/**
 * notice_all 커버리지 분석.
 * "전체공지가 단과대/학과/사업단 공지를 얼마나 폭넓게 모아주는가"를 부서(dept) 분포로 측정.
 * 사용: node coverage.ts [샘플.jsonl]
 */
import { readFileSync } from 'node:fs';

const input = process.argv[2] ?? './out/coverage-sample.jsonl';
const rows = readFileSync(input, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

const N = rows.length;
function tally(key: string) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = (r[key] ?? '(없음)') as string;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

// 부서명을 출처 유형으로 분류 (커버리지 핵심)
function classifyDept(d: string | null): string {
  if (!d) return '미상';
  if (/대학$|학부|학과|전공/.test(d)) return '단과대/학과';       // Gemini 2번
  if (/사업단|중심대학|LINC|SW|단$/.test(d)) return '사업단/단';   // Gemini 3번
  if (/센터/.test(d)) return '센터';
  if (/팀|처|과$|원$|실$/.test(d)) return '본부/행정';
  return '기타';
}

console.log(`=== notice_all 커버리지 분석 (표본 ${N}건) ===\n`);

console.log('● 캠퍼스 분포');
for (const [k, c] of tally('campus')) console.log(`   ${k.padEnd(8)} ${c}건 (${((c / N) * 100).toFixed(0)}%)`);

console.log('\n● 카테고리 분포');
for (const [k, c] of tally('category')) console.log(`   ${String(k).padEnd(10)} ${c}건`);

// 출처 유형 분포
const typeMap = new Map<string, number>();
const typeDepts = new Map<string, Set<string>>();
for (const r of rows) {
  const t = classifyDept(r.dept);
  typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
  if (!typeDepts.has(t)) typeDepts.set(t, new Set());
  if (r.dept) typeDepts.get(t)!.add(r.dept);
}
console.log('\n● 출처 유형 분포 (← 커버리지 핵심)');
for (const [t, c] of [...typeMap.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${t.padEnd(12)} ${c}건 (${((c / N) * 100).toFixed(0)}%) · 고유부서 ${typeDepts.get(t)!.size}개`);
}

console.log('\n● 단과대/학과 출처 부서 목록 (전체공지에 이미 등장 = 따로 안 긁어도 됨)');
const colleges = [...(typeDepts.get('단과대/학과') ?? [])];
console.log('   ', colleges.length ? colleges.join(', ') : '(없음)');

console.log('\n● 사업단/단 출처 부서 목록 (Gemini 3번 후보)');
const programs = [...(typeDepts.get('사업단/단') ?? [])];
console.log('   ', programs.length ? programs.join(', ') : '(없음)');

console.log('\n● 상위 부서 Top 15');
for (const [k, c] of tally('dept').slice(0, 15)) console.log(`   ${String(k).padEnd(20)} ${c}건`);

const erica = rows.filter((r) => r.campus === 'ERICA').length;
console.log(`\n● ERICA 캠퍼스 비중: ${erica}/${N} (${((erica / N) * 100).toFixed(0)}%)`);
console.log(`● 고유 부서 총수: ${new Set(rows.map((r) => r.dept).filter(Boolean)).size}개`);
const dates = rows.map((r) => r.date_posted).sort();
console.log(`● 날짜 범위: ${dates[0]} ~ ${dates[dates.length - 1]}`);
