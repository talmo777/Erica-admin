# ERICA 공지 일괄 수집 크롤러 (bulk ingestion)

ERICA 공모전/공지 **목록을 쓸어담는** standalone 크롤러. Erica-admin SPA / 외부 Board-API와 **독립** 실행.
1순위 소스: 한양대 전체공지 [`notice_all`](https://www.hanyang.ac.kr/web/www/notice_all) (로그인 불필요, 서버렌더 Liferay).

> 분류는 downstream. 여기서는 **원본만** 수집하고 이미지·첨부 URL을 함께 저장해 재크롤을 방지한다.

## 왜 별도 스크립트인가
- Erica-admin은 클라이언트 React/Vite SPA이고, 서버 코드는 `api/ai/extract.ts`(Board-API 프록시) 하나뿐 → 크롤 로직이 살 곳이 아님.
- 진짜 백엔드(Supabase 쓰기 + 크롤)는 외부 **Board-API**에 있고, `services/api.ts:triggerCrawl()`이 이미 `GET {BOARD_API}/api/cron/crawl`을 호출 → 일괄 크롤러는 원래 거기 사는 게 정석.
- Board-API repo가 이 워크스페이스에 없으므로, **지금 당장 실행/검증 가능한 standalone**으로 만들되 코어를 순수함수(`parseList`/`parseDetail`)로 분리 → 나중에 Board-API `/api/cron/crawl`로 그대로 이식 가능.

## 실행
```bash
cd crawler
npm install          # cheerio (이 폴더에만 격리 설치)
node run.ts          # 기본: notice_all 3페이지, ERICA만, 상세 포함 → out/*.jsonl
```
Node 18+ (내장 fetch). Node 23+/24는 .ts 직접 실행(타입 스트립).

### 옵션
| 플래그 | 기본 | 설명 |
|---|---|---|
| `--pages N` | 3 | 수집할 목록 페이지 수 (페이지당 20행) |
| `--campus X` | `ERICA` | 캠퍼스 필터. `all`=해제, `ERICA,한양`=복수 |
| `--no-detail` | (off) | 목록만 수집(빠름). body/image/file 비움 |
| `--limit N` | 없음 | 최대 수집 건수 |
| `--delay ms` | 600 | 요청 간 딜레이(예의) |
| `--out path` | `./out/notice_all-<날짜>.jsonl` | 출력 경로 |

> ⚠️ **캠퍼스 필터 주의**: 한양대 badge의 캠퍼스 값은 `한양`(공통)·`서울`·`ERICA`. 기본 `ERICA`는 ERICA 전용 공지만 잡고 `한양`(공통, ERICA에도 해당될 수 있음)은 제외한다. 누락이 걱정되면 `--campus ERICA,한양` 또는 `--campus all`로 넓혀 수집하고 분류 단계에서 거른다.

## 출력 스키마 (JSONL, 1줄 = 1공지)
```jsonc
{
  "source": "hanyang-notice_all",
  "post_id": "110701",          // = entryId (고유키)
  "date_posted": "2026-06-23",
  "title": "...",
  "body": "...",                 // 상세 .noticeBoard-view-message 텍스트
  "link": "https://.../notice_all?...entryId=110701",
  "image_urls": ["https://www.hanyang.ac.kr/documents/.../poster.png/..."],
  "file_urls":  ["https://www.hanyang.ac.kr/documents/portlet_file_entry/...hwpx/..."],
  "crawled_at": "2026-06-23T...Z",
  // 보너스(분류 힌트)
  "dept": "학사운영팀", "campus": "ERICA", "category": "학사",
  "notice_period": "2026. 6. 23 ~ 2026. 9. 30",
  "event_period":  "2026. 7. 6 ~ 2026. 9. 4"
}
```

## 구조
```
src/parse.ts      # 순수함수: parseList / parseDetail + URL 빌더 (이식 대상)
src/fetchPage.ts  # IO: UA + 재시도 fetch
src/sink.ts       # 출력 어댑터: JsonlSink (+ SupabaseSink 자리)
src/crawl.ts      # 오케스트레이터: 목록순회→상세방문→sink (entryId 중복 스킵)
run.ts            # CLI
```

## 검증된 셀렉터 (실측, 2026-06)
- 목록 행 `div.hyu-list-body-item[role="listitem"]` (20/페이지)
- 제목/링크 `h4 > a`, 고유키 href의 `_entryId={숫자}`
- 게시일 `span.date`, 캠퍼스 `span.hyu-badge.custom-bg[data-itemvalue]`, 카테고리 그 외 `hyu-badge[data-itemvalue]`
- 페이지네이션 `..._NoticeBoardPortlet_cur={page}`
- **상세 본문 `.noticeBoard-view-message`** (※ 기존 메모의 `.board-view` 아님 — 실측 정정)
- 포스터 `img[src*="/documents/"]`, 첨부 `a[href*="portlet_file_entry"]`

## 다음 단계 (TODO)
- [ ] Supabase `raw_notices` 테이블 + `SupabaseSink`(post_id upsert, SERVICE_ROLE_KEY). 현재는 JSONL만.
- [ ] 보조 소스 어댑터: 단과대 공지, campuspick.com/contest(전국이라 후순위).
- [ ] 비교과/포털: 인증 벽 확인 후 판단.
- [ ] Board-API `/api/cron/crawl`로 `parse.ts` 이식 + Vercel cron 연결.
```
