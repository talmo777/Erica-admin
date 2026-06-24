import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { RawNotice } from './types.ts';

/** JSONL 한 줄씩 append 하는 sink */
export class JsonlSink {
  private started = false;
  private readonly path: string;
  constructor(path: string) {
    this.path = path;
  }

  async write(rec: RawNotice): Promise<void> {
    if (!this.started) {
      await mkdir(dirname(this.path), { recursive: true });
      await writeFile(this.path, ''); // 새 파일로 초기화
      this.started = true;
    }
    await appendFile(this.path, JSON.stringify(rec) + '\n');
  }
}

/**
 * Supabase sink 자리 (2차 단계).
 * 지금은 JSONL만 사용. 나중에 raw_notices 테이블 + SERVICE_ROLE_KEY로 upsert 구현.
 * 인터페이스만 맞춰두면 crawl.ts 수정 없이 교체 가능.
 */
// export class SupabaseSink { async write(rec: RawNotice) { ... upsert on post_id ... } }
