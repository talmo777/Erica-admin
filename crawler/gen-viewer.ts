/**
 * JSONL → 자체완결형 viewer.html 생성 (데이터 인라인 → file:// 로 바로 열림).
 * 사용: node gen-viewer.ts [입력.jsonl] [출력.html]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const input = process.argv[2] ?? './out/viewer-data.jsonl';
const output = process.argv[3] ?? './out/viewer.html';

const records = readFileSync(input, 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ERICA 공지 수집 결과 (${records.length}건)</title>
<style>
  :root{--bg:#0f1115;--card:#1a1d24;--bd:#2a2f3a;--fg:#e6e8ec;--mut:#9aa3b2;--accent:#4f9cf9;}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 -apple-system,'Segoe UI',Roboto,'Malgun Gothic',sans-serif}
  header{position:sticky;top:0;background:#0f1115ee;backdrop-filter:blur(6px);border-bottom:1px solid var(--bd);padding:14px 20px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
  header h1{font-size:16px;margin:0}
  header .count{color:var(--mut)}
  header input{margin-left:auto;background:var(--card);border:1px solid var(--bd);color:var(--fg);padding:7px 11px;border-radius:8px;min-width:220px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px;padding:20px;max-width:1500px;margin:0 auto}
  .card{background:var(--card);border:1px solid var(--bd);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
  .poster{width:100%;aspect-ratio:4/3;object-fit:cover;background:#0b0d11;border-bottom:1px solid var(--bd)}
  .noimg{width:100%;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;color:var(--mut);background:repeating-linear-gradient(45deg,#14171d,#14171d 10px,#171b22 10px,#171b22 20px);border-bottom:1px solid var(--bd);font-size:12px}
  .body{padding:13px 14px;display:flex;flex-direction:column;gap:8px;flex:1}
  .badges{display:flex;gap:6px;flex-wrap:wrap}
  .b{font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--bd);color:var(--mut)}
  .b.campus{color:#7ee0a1;border-color:#2e5b3f}
  .b.cat{color:#f5c46b;border-color:#5b4a2e}
  .title{font-weight:600;font-size:14.5px;line-height:1.4}
  .meta{color:var(--mut);font-size:12px;display:flex;flex-wrap:wrap;gap:4px 10px}
  .files{display:flex;flex-direction:column;gap:4px;margin-top:2px}
  .files a{color:var(--accent);font-size:12px;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .files a:hover{text-decoration:underline}
  .foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;padding-top:6px;border-top:1px solid var(--bd)}
  .foot a{color:var(--accent);font-size:12px;text-decoration:none}
  .pid{color:var(--mut);font-size:11px;font-family:ui-monospace,monospace}
  .clip{font-size:11px;color:#d98e8e}
</style></head>
<body>
<header>
  <h1>ERICA 공지 수집 결과</h1>
  <span class="count" id="count">${records.length}건</span>
  <input id="q" placeholder="제목·부서·카테고리 검색…" oninput="filter()">
</header>
<div class="grid" id="grid"></div>
<script>
const DATA = ${JSON.stringify(records)};
const fileName = (u)=>{ try{ const p=decodeURIComponent(u).split('?')[0].split('/'); return p.filter(Boolean).slice(-2,-1)[0]||p.pop(); }catch{ return u; } };
function card(r){
  const poster = (r.image_urls&&r.image_urls[0])
    ? '<img class="poster" loading="lazy" src="'+r.image_urls[0]+'" onerror="this.outerHTML=\\'<div class=noimg>이미지 로드 실패</div>\\'">'
    : '<div class="noimg">포스터 없음</div>';
  const files = (r.file_urls||[]).map(u=>'<a href="'+u+'" target="_blank" title="'+fileName(u)+'">📎 '+fileName(u)+'</a>').join('');
  const badges = [
    r.campus?'<span class="b campus">'+r.campus+'</span>':'',
    r.category?'<span class="b cat">'+r.category+'</span>':'',
    r.image_urls&&r.image_urls.length?'<span class="b">🖼 '+r.image_urls.length+'</span>':'',
    r.file_urls&&r.file_urls.length?'<span class="b">📎 '+r.file_urls.length+'</span>':'',
  ].join('');
  return '<div class="card">'+poster+'<div class="body">'
    +'<div class="badges">'+badges+'</div>'
    +'<div class="title">'+r.title+'</div>'
    +'<div class="meta"><span>📅 '+r.date_posted+'</span>'+(r.dept?'<span>🏢 '+r.dept+'</span>':'')+'</div>'
    +(r.notice_period?'<div class="meta">공지 '+r.notice_period+'</div>':'')
    +(files?'<div class="files">'+files+'</div>':'')
    +'<div class="foot"><span class="pid">#'+r.post_id+'</span><a href="'+r.link+'" target="_blank">원문 ↗</a></div>'
    +'</div></div>';
}
function render(list){
  document.getElementById('grid').innerHTML = list.map(card).join('');
  document.getElementById('count').textContent = list.length+'건';
}
function filter(){
  const q=document.getElementById('q').value.toLowerCase().trim();
  render(!q?DATA:DATA.filter(r=>((r.title||'')+(r.dept||'')+(r.category||'')+(r.campus||'')).toLowerCase().includes(q)));
}
render(DATA);
</script>
</body></html>`;

writeFileSync(output, html);
console.log(`viewer 생성: ${output} (${records.length}건)`);
