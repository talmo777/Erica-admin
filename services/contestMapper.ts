// src/services/contestMapper.ts
import { ApiContest } from './api';
import { Contest, ContestCategory, ContestStatus, TargetCollege } from '../types';
import { DEFAULT_IMAGE_PLACEHOLDER } from '../constants.ts';

/**
 * API -> Admin 내부 모델 매핑
 * - status: draft | published | archived  -> ContestStatus
 * - category: "ICPBL" -> ContestCategory.ICPBL (IC-PBL 표시 유지)
 * - targets: string[] -> TargetCollege[]
 */
export function mapApiContestToContest(c: ApiContest): Contest {
  const status: ContestStatus =
    c.status === 'published'
      ? ContestStatus.PUBLISHED
      : c.status === 'draft'
      ? ContestStatus.DRAFT
      : ContestStatus.ARCHIVED;

  // API는 "ICPBL"을 쓰고, Admin 내부 enum은 "IC-PBL"을 씀
  const normalizedCategory =
    c.category === 'ICPBL'
      ? ContestCategory.ICPBL
      : (Object.values(ContestCategory) as string[]).includes(c.category)
      ? (c.category as ContestCategory)
      : ContestCategory.CAMPUS;

  const targets = Array.isArray(c.targets)
    ? (c.targets.filter(Boolean) as TargetCollege[])
    : [];

  return {
    id: c.id,
    title: c.title,
    description: c.description ?? '',
    imageUrl: c.poster_url || DEFAULT_IMAGE_PLACEHOLDER,
    applyUrl: c.apply_url,
    category: normalizedCategory,
    status,
    targets,
    startDate: c.start_date ?? '',
    endDate: c.end_date ?? '',
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    viewCount: 0
  };
}
