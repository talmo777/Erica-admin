import type { SourceAdapter, SourceMeta } from './types.ts';
import { noticeAllSource } from './notice_all.ts';
import { eecSource } from './eec.ts';
import { computingSource } from './computing.ts';
import { hylueSource } from './hylu_e.ts';
import { lionsSource } from './lions.ts';
import { collegeSources } from './liferay_college.ts';
import { frontCmsSources } from './front_cms.ts';
import { idesignSource } from './idesign.ts';

/** 등록된 크롤 소스. 새 사이트는 어댑터 만들어 여기에 추가. */
export const SOURCES: SourceAdapter[] = [
  noticeAllSource,
  eecSource,
  computingSource,
  hylueSource,
  lionsSource,
  ...collegeSources,
  ...frontCmsSources,
  idesignSource,
];

const BY_ID = new Map(SOURCES.map((s) => [s.id, s]));

export function getSource(id: string): SourceAdapter | undefined {
  return BY_ID.get(id);
}

/** UI 노출용 메타데이터(crawl 함수 제외) */
export function listSourceMeta(): SourceMeta[] {
  return SOURCES.map(({ id, label, homepage, supportsCampus, dateSource, note, enabled }) => ({
    id, label, homepage, supportsCampus, dateSource, note, enabled,
  }));
}

export type { SourceAdapter, SourceMeta, CrawlParams } from './types.ts';
