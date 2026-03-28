import React, { useEffect, useMemo, useState } from 'react';
import { getContests, ApiContest } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  ArrowUpRight,
  Trophy,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  CalendarDays,
  LayoutGrid,
  Layers,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  유틸                                                                */
/* ------------------------------------------------------------------ */
function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ');
}

const CATEGORY_COLORS: Record<string, string> = {
  '교내 공모전': '#0EA5E9',
  '서포터즈': '#22C55E',
  'IC-PBL': '#A855F7',
  '대외활동': '#F59E0B',
};

const SITE_COLORS = [
  '#0EA5E9', '#22C55E', '#F59E0B', '#A855F7',
  '#EF4444', '#64748B', '#EC4899', '#14B8A6',
  '#F97316', '#6366F1', '#84CC16', '#06B6D4',
];

/* ------------------------------------------------------------------ */
/*  서브 컴포넌트                                                        */
/* ------------------------------------------------------------------ */
function SectionCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-slate-600" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

type Tone = 'sky' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate';

const TONE_MAP: Record<Tone, string> = {
  sky: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  slate: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>
      <div className={cx('w-10 h-10 rounded-2xl flex items-center justify-center shrink-0', TONE_MAP[tone])}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

/* 인사이트 뱃지 */
function InsightBadge({ type, children }: { type: 'warn' | 'ok' | 'info'; children: React.ReactNode }) {
  const cls =
    type === 'warn'
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : type === 'ok'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : 'bg-sky-50 border-sky-200 text-sky-800';
  return (
    <div className={cx('rounded-xl border px-4 py-3 text-sm flex items-start gap-2', cls)}>
      {type === 'warn' ? (
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      ) : type === 'ok' ? (
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
      ) : (
        <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  데이터 파싱 유틸                                                     */
/* ------------------------------------------------------------------ */
/** source_url에서 사이트명 추출: 호스트명 기준 */
function extractSiteName(url: string | null): string {
  if (!url) return '직접 등록';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    // 주요 사이트 약칭 매핑
    const map: Record<string, string> = {
      'idesign.hanyang.ac.kr': '디자인대',
      'ibus.hanyang.ac.kr': '경상대',
      'ieng.hanyang.ac.kr': '공학대',
      'ccss.hanyang.ac.kr': '커뮤니케이션컬처대',
      'lan-cul.hanyang.ac.kr': '글로벌문화통상대',
      'atc.hanyang.ac.kr': '첨단융합대',
      'pharmacy.hanyang.ac.kr': '약학대',
      'sportsnarts.hanyang.ac.kr': '예체능대',
      'computing.hanyang.ac.kr': '소프트웨어융합대',
      'lions.hanyang.ac.kr': 'LIONS칼리지',
      'global.hanyang.ac.kr': '국제처',
      'eec.hanyang.ac.kr': '창업교육센터',
      'hylu-e.hanyang.ac.kr': '비교과관리',
      'information.hanyang.ac.kr': '학술정보관',
      'ectl.hanyang.ac.kr': '교수학습센터',
      'newshyu.com': '한양뉴스',
      'icpbl.hanyang.ac.kr': 'IC-PBL센터',
    };
    return map[host] ?? host;
  } catch {
    return '직접 등록';
  }
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

/* ------------------------------------------------------------------ */
/*  메인 대시보드                                                        */
/* ------------------------------------------------------------------ */
export const Dashboard: React.FC = () => {
  const [contests, setContests] = useState<ApiContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // published + draft 모두 가져옴 (status 파라미터 없이)
        const all = await getContests();
        setContests(all);
      } catch (e: any) {
        setError(e?.message ?? '데이터 로드 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- 파생 데이터 ---------- */
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const published = contests.filter((c) => c.status === 'published');
    const draft = contests.filter((c) => c.status === 'draft');
    const active = published.filter((c) => !c.end_date || c.end_date >= today);
    const expired = published.filter((c) => c.end_date && c.end_date < today);

    // 카테고리별 집계
    const byCategory: Record<string, number> = {};
    for (const c of published) {
      const key = c.category || '미분류';
      byCategory[key] = (byCategory[key] || 0) + 1;
    }
    const categoryData = Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 사이트(출처)별 집계
    const bySite: Record<string, number> = {};
    for (const c of contests) {
      const site = extractSiteName(c.source_url);
      bySite[site] = (bySite[site] || 0) + 1;
    }
    const siteData = Object.entries(bySite)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);

    // 마감 임박 (7일 이내)
    const closingSoon = active
      .filter((c) => {
        const d = daysUntil(c.end_date);
        return d !== null && d >= 0 && d <= 7;
      })
      .sort((a, b) => (a.end_date ?? '').localeCompare(b.end_date ?? ''))
      .slice(0, 5);

    // 최근 게시 (최신순)
    const recentlyAdded = [...contests]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);

    // 월별 게시 추이
    const byMonth: Record<string, number> = {};
    for (const c of contests) {
      const month = c.created_at.slice(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    }
    const monthData = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, count]) => ({ month: month.slice(5) + '월', count }));

    // 인사이트 생성
    const insights: Array<{ type: 'warn' | 'ok' | 'info'; msg: string }> = [];
    const maxCat = categoryData[0];
    const minCat = categoryData[categoryData.length - 1];
    if (maxCat && minCat && categoryData.length >= 2) {
      if (maxCat.value > minCat.value * 3) {
        insights.push({
          type: 'warn',
          msg: `'${maxCat.name}' 게시물이 전체의 ${Math.round((maxCat.value / published.length) * 100)}%로 편중되어 있습니다. '${minCat.name}' 콘텐츠 발굴이 필요합니다.`,
        });
      }
    }
    if (draft.length > 5) {
      insights.push({
        type: 'warn',
        msg: `미게시(draft) 항목이 ${draft.length}건 대기 중입니다. 검토 후 게시해주세요.`,
      });
    }
    if (closingSoon.length > 0) {
      insights.push({
        type: 'info',
        msg: `마감 7일 이내 공고가 ${closingSoon.length}건 있습니다. 학생 알림 발송을 고려해보세요.`,
      });
    }
    if (insights.length === 0) {
      insights.push({ type: 'ok', msg: '현재 특이 이슈 없음. 데이터 균형이 양호합니다.' });
    }

    return {
      total: contests.length,
      published: published.length,
      draft: draft.length,
      active: active.length,
      expired: expired.length,
      categoryData,
      siteData,
      closingSoon,
      recentlyAdded,
      monthData,
      insights,
    };
  }, [contests]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
        <p className="text-sm text-slate-500">데이터 불러오는 중…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center text-slate-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const now = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">대시보드</h2>
          <p className="mt-1 text-sm text-slate-500">{now} 기준 · 전체 데이터 실시간 집계</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="전체 수집" value={stats.total.toLocaleString()} subtitle="누적 크롤링" icon={Layers} tone="slate" />
        <KPICard title="게시 중" value={stats.published.toLocaleString()} subtitle="published" icon={CheckCircle2} tone="emerald" />
        <KPICard title="진행 중 공고" value={stats.active.toLocaleString()} subtitle="마감일 미경과" icon={Trophy} tone="sky" />
        <KPICard title="검토 대기" value={stats.draft.toLocaleString()} subtitle="draft" icon={Clock} tone="amber" />
      </div>

      {/* Insights */}
      <SectionCard title="자동 인사이트" subtitle="데이터 기반 운영 제안" icon={TrendingUp}>
        <div className="space-y-2">
          {stats.insights.map((ins, i) => (
            <InsightBadge key={i} type={ins.type}>{ins.msg}</InsightBadge>
          ))}
        </div>
      </SectionCard>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 카테고리별 파이차트 */}
        <SectionCard title="카테고리별 게시 비율" subtitle="published 기준" icon={LayoutGrid}>
          {stats.categoryData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">데이터 없음</p>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={82}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {stats.categoryData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={CATEGORY_COLORS[entry.name] ?? SITE_COLORS[i % SITE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}건`, '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {stats.categoryData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[d.name] ?? SITE_COLORS[i % SITE_COLORS.length] }}
                      />
                      <span className="text-slate-700 truncate">{d.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 ml-2">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        {/* 월별 수집 추이 바차트 */}
        <SectionCard title="월별 게시물 수집 추이" subtitle="최근 6개월" icon={CalendarDays}>
          {stats.monthData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">데이터 없음</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [`${v}건`, '수집']} />
                  <Bar dataKey="count" name="수집 수" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      {/* 출처 단과대 분포 */}
      <SectionCard title="출처별 수집량" subtitle="수집 사이트 기준 (직접 등록 포함)" icon={ArrowUpRight}>
        {stats.siteData.length === 0 ? (
          <p className="text-sm text-slate-400">데이터 없음</p>
        ) : (
          <div className="space-y-2">
            {stats.siteData.map((d, i) => {
              const max = stats.siteData[0]?.value ?? 1;
              const pct = Math.round((d.value / max) * 100);
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-slate-600 truncate shrink-0">{d.name}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: SITE_COLORS[i % SITE_COLORS.length],
                      }}
                    />
                  </div>
                  <div className="text-xs font-bold text-slate-700 w-8 text-right">{d.value}</div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* 하단 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 마감 임박 */}
        <SectionCard title="마감 임박 공고" subtitle="7일 이내 마감" icon={AlertTriangle}>
          {stats.closingSoon.length === 0 ? (
            <p className="text-sm text-slate-400">마감 임박 공고가 없습니다.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.closingSoon.map((c) => {
                const d = daysUntil(c.end_date);
                return (
                  <div key={c.id} className="py-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{c.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{c.category}</p>
                    </div>
                    <span
                      className={cx(
                        'shrink-0 text-xs font-bold px-2 py-1 rounded-full',
                        d === 0
                          ? 'bg-rose-100 text-rose-700'
                          : d && d <= 3
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {d === 0 ? 'D-DAY' : `D-${d}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* 최근 수집 */}
        <SectionCard title="최근 수집 항목" subtitle="가장 최근에 추가된 5건" icon={Clock}>
          {stats.recentlyAdded.length === 0 ? (
            <p className="text-sm text-slate-400">데이터 없음</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentlyAdded.map((c) => {
                const statusCls =
                  c.status === 'published'
                    ? 'bg-emerald-100 text-emerald-700'
                    : c.status === 'draft'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-500';
                return (
                  <div key={c.id} className="py-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{c.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {extractSiteName(c.source_url)} · {c.created_at.slice(0, 10)}
                      </p>
                    </div>
                    <span className={cx('shrink-0 text-xs font-bold px-2 py-1 rounded-full', statusCls)}>
                      {c.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};
