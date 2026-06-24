import { readFileSync, existsSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface RunRecord {
  ran_at: string;            // ISO
  sources: string[];
  from: string | null;       // YYYY-MM-DD
  to: string | null;
  campus: string | null;
  crawled: number;
  added: number;
  perSource: Record<string, number>;
}

/** 크롤 실행 이력 (out/crawl-runs.jsonl 누적). */
export class RunsStore {
  private path: string;
  private runs: RunRecord[] = [];

  constructor(path: string) {
    this.path = path;
    if (existsSync(path)) {
      const raw = readFileSync(path, 'utf8').trim();
      if (raw) {
        for (const line of raw.split('\n')) {
          if (!line.trim()) continue;
          try { this.runs.push(JSON.parse(line) as RunRecord); } catch { /* skip */ }
        }
      }
    }
  }

  add(rec: RunRecord): void {
    this.runs.push(rec);
    mkdirSync(dirname(this.path), { recursive: true });
    appendFileSync(this.path, JSON.stringify(rec) + '\n');
  }

  /** 최신순 최근 N개 */
  list(limit = 50): RunRecord[] {
    return [...this.runs].reverse().slice(0, limit);
  }

  get size(): number {
    return this.runs.length;
  }
}
