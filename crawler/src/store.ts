import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RawNotice } from './types.ts';

export type NoticeStatus = 'new' | 'reviewed' | 'ignored' | 'promoted';

export interface StoredNotice extends RawNotice {
  status: NoticeStatus;
  first_seen: string; // 최초 수집 시각 (ISO)
}

/**
 * inbox.jsonl 누적 스토어.
 * post_id 기준 upsert: 기존 항목은 status/first_seen 보존하고 본문/자산만 갱신.
 */
export class InboxStore {
  private path: string;
  private map = new Map<string, StoredNotice>();

  constructor(path: string) {
    this.path = path;
    this.load();
  }

  private load(): void {
    if (!existsSync(this.path)) return;
    const raw = readFileSync(this.path, 'utf8').trim();
    if (!raw) return;
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line) as StoredNotice;
        this.map.set(rec.post_id, rec);
      } catch {
        /* skip corrupt line */
      }
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const out = [...this.map.values()].map((r) => JSON.stringify(r)).join('\n');
    writeFileSync(this.path, out ? out + '\n' : '');
  }

  /** 새 크롤 결과 병합. 신규 건수 반환. */
  upsertMany(records: RawNotice[]): number {
    let added = 0;
    for (const rec of records) {
      const prev = this.map.get(rec.post_id);
      if (prev) {
        this.map.set(rec.post_id, {
          ...rec,
          status: prev.status,
          first_seen: prev.first_seen,
        });
      } else {
        this.map.set(rec.post_id, {
          ...rec,
          status: 'new',
          first_seen: rec.crawled_at,
        });
        added++;
      }
    }
    this.persist();
    return added;
  }

  setStatus(post_id: string, status: NoticeStatus): boolean {
    const rec = this.map.get(post_id);
    if (!rec) return false;
    rec.status = status;
    this.persist();
    return true;
  }

  /** 최신 게시일 → 최신 수집일 순 정렬 목록 */
  list(): StoredNotice[] {
    return [...this.map.values()].sort((a, b) => {
      if (a.date_posted !== b.date_posted) return a.date_posted < b.date_posted ? 1 : -1;
      return a.crawled_at < b.crawled_at ? 1 : -1;
    });
  }

  get size(): number {
    return this.map.size;
  }
}
