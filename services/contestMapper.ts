// src/services/contestMapper.ts
import { ApiContest } from './api';
import { Contest, ContestCategory, ContestStatus, TargetCollege } from '../types';
import { DEFAULT_IMAGE_PLACEHOLDER } from '../constants';

export function mapApiContestToContest(c: ApiContest): Contest {
  const status =
    c.status === 'published' ? ContestStatus.PUBLISHED :
    c.status === 'draft' ? ContestStatus.DRAFT :
    ContestStatus.ARCHIVED;

  const category = (Object.values(ContestCategory) as string[]).includes(c.category)
    ? (c.category as ContestCategory)
    : ContestCategory.CAMPUS;

  return {
    id: c.id,
    title: c.title,
    description: c.description ?? '',
    imageUrl: c.poster_url ?? DEFAULT_IMAGE_PLACEHOLDER,
    applyUrl: c.apply_url,
    category,
    status,
    targets: (c.targets ?? []) as TargetCollege[],
    startDate: c.start_date ?? '',
    endDate: c.end_date ?? '',
    createdAt: c.created_at,
    updatedAt: c.updated_at
  };
}
