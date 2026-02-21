import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar,
  AreaChart, Area,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, Users, MousePointer, Eye,
  CheckCircle2, Clock, Archive, BarChart2,
  AlertCircle, CalendarClock,
} from 'lucide-react';
import { getContests, ApiContest } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { DailyMetric } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────

/** 연도별 차트에 포함할 가장 이른 연도 */
const ANNUAL_MIN_YEAR = '2022';

const FIELD_COLORS: Record<string, string> = {
  '이공계':    '#0EA5E9',
  '인문/상경': '#22C55E',
  '예체능':    '#A855F7',
  '공통':      '#94A3B8',
};

const STATUS_COLORS = {
  active:   '#22C55E',
  upcoming: '#0EA5E9',
  ended:    '#94A3B8',
};

// ─── Helper functions ─────────────────────────────────────────────────────────

function classifyAcademicField(c: ApiContest): '이공계' | '인문/상경' | '예체능' | '공통' {
  const targets = (c.targets ?? []).join(' ');
  let stem = 0, hum = 0, art = 0;

  if (targets.includes('소프트웨어') || targets.includes('공학대학') ||
      targets.includes('첨단융합') || targets.includes('약학') ||
      targets.includes('IC-PBL') || targets.includes('산업협력단지')) stem++;
  if (targets.includes('경상') || targets.includes('LIONS') ||
      targets.includes('커뮤니케이션') || targets.includes('글로벌문화') ||
      targets.includes('국제처')) hum++;
  if (targets.includes('예체능') || targets.includes('디자인대학')) art++;

  // Category & title keyword boost
  if (c.category === 'ICPBL') stem += 2;
  const blob = `${c.title ?? ''} ${c.category ?? ''}`.toLowerCase();
  if (blob.includes('공학') || blob.includes('sw') || blob.includes('소프트웨어') || blob.includes('데이터')) stem++;
  if (blob.includes('경영') || blob.includes('경제') || blob.includes('인문') || blob.includes('사회')) hum++;
  if (blob.includes('디자인') || blob.includes('예술') || blob.includes('예체능')) art++;

  const max = Math.max(stem, hum, art);
  if (max === 0) return '공통';
  if (stem === max) return '이공계';
  if (hum === max) return '인문/상경';
  return '예체능';
}

function getActiveStatus(c: ApiContest): 'active' | 'ended' | 'upcoming' {
  if (c.status === 'archived') return 'ended';
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const start = c.start_date ? new Date(c.start_date) : null;
  const end   = c.end_date   ? new Date(c.end_date)   : null;
  if (end   && end   < now) return 'ended';
  if (start && start > now) return 'upcoming';
  return 'active';
}

function buildAnnualData(contests: ApiContest[]) {
  const map = new Map<string, Record<string, number>>();
  for (const c of contests) {
    const year = (c.created_at ?? '').slice(0, 4);
    if (!year || year < ANNUAL_MIN_YEAR) continue;
    if (!map.has(year)) map.set(year, { '이공계': 0, '인문/상경': 0, '예체능': 0, '공통': 0 });
    map.get(year)![classifyAcademicField(c)]++;
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, v]) => ({ year, ...v }));
}

function buildMonthlyData(contests: ApiContest[]) {
  const now = new Date();
  const slots = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${d.getMonth() + 1}월`, count: 0 };
  });
  for (const c of contests) {
    const mo = (c.created_at ?? '').slice(0, 7);
    const slot = slots.find(s => s.key === mo);
    if (slot) slot.count++;
  }
  return slots.map(s => ({ month: s.label, count: s.count }));
}

function buildUpcoming(contests: ApiContest[], days = 30) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now.getTime() + days * 86400000);
  return contests
    .filter(c => { const e = c.end_date ? new Date(c.end_date) : null; return !!e && e >= now && e <= cutoff; })
    .sort((a, b) => (a.end_date ?? '').localeCompare(b.end_date ?? ''))
    .slice(0, 8);
}

function diffDays(endDate: string) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(endDate).getTime() - now.getTime()) / 86400000);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(' ');
}

function Card({ title, subtitle, children, right }: {
  title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function KPICard({ title, value, icon: Icon, color, sub }: {
  title: string; value: string | number; icon: React.ComponentType<{ className?: string }>;
  color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start justify-between gap-4">
      <div>
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{title}</div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
      </div>
      <div className={cx('w-10 h-10 rounded-xl flex items-center justify-center shadow-md text-white', color)}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
    </div>
  );
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[120px]">
      <div className="font-semibold text-slate-900 mb-2">{label}년</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mt-1">
          <span style={{ color: p.fill }}>{p.dataKey}</span>
          <span className="font-medium text-slate-900">{p.value}건</span>
        </div>
      ))}
    </div>
  );
};

const CustomPieLegend = ({ data, colors }: { data: { name: string; value: number }[]; colors: string[] }) => (
  <div className="mt-4 space-y-2">
    {data.map((d, i) => (
      <div key={d.name} className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: colors[i] }} />
          <span className="text-slate-600">{d.name}</span>
        </div>
        <span className="font-semibold text-slate-800">{d.value}건</span>
      </div>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [contests, setContests] = useState<ApiContest[]>([]);
  const [analytics, setAnalytics] = useState<DailyMetric[]>([]);
  const [analyticsReady, setAnalyticsReady] = useState<'loading' | 'ok' | 'unavailable'>('loading');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<7 | 30>(30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await getContests();
        setContests(rows);
      } catch (e: any) {
        setFetchError(e?.message ?? '데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }

      // Try Supabase analytics table
      try {
        const from = new Date();
        from.setDate(from.getDate() - 90);
        // Cast needed because the Supabase typed client isn't generated for this project
        const { data, error } = await (supabase as any)
          .from('daily_metrics')
          .select('date, visitors, clicks, apply_clicks')
          .gte('date', from.toISOString().slice(0, 10))
          .order('date', { ascending: true });

        if (!error && data?.length) {
          setAnalytics(data.map((r: any) => ({
            date: r.date,
            visitors: r.visitors ?? 0,
            clicks: r.clicks ?? 0,
            applyClicks: r.apply_clicks ?? 0,
          })));
          setAnalyticsReady('ok');
        } else {
          setAnalyticsReady('unavailable');
        }
      } catch {
        setAnalyticsReady('unavailable');
      }
    })();
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts = { active: 0, ended: 0, upcoming: 0 };
    for (const c of contests) counts[getActiveStatus(c)]++;
    return counts;
  }, [contests]);

  const annualData = useMemo(() => buildAnnualData(contests), [contests]);

  const monthlyData = useMemo(() => buildMonthlyData(contests), [contests]);

  const fieldRatio = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of contests) {
      const f = classifyAcademicField(c);
      counts[f] = (counts[f] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [contests]);

  const upcomingDeadlines = useMemo(() => buildUpcoming(contests, 30), [contests]);

  const analyticsSlice = useMemo(() => {
    if (!analytics.length) return [];
    return analytics.slice(-timeRange);
  }, [analytics, timeRange]);

  // Insight: peak month
  const peakMonth = useMemo(() => {
    if (!monthlyData.length) return null;
    return monthlyData.reduce((a, b) => a.count >= b.count ? a : b);
  }, [monthlyData]);

  // Insight: average contest duration (days)
  const avgDuration = useMemo(() => {
    const durations = contests
      .filter(c => c.start_date && c.end_date)
      .map(c => Math.round((new Date(c.end_date!).getTime() - new Date(c.start_date!).getTime()) / 86400000));
    if (!durations.length) return null;
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  }, [contests]);

  // Insight: YoY growth (current year vs last year)
  const yoyGrowth = useMemo(() => {
    const now = new Date();
    const thisYear = String(now.getFullYear());
    const lastYear = String(now.getFullYear() - 1);
    const cur = contests.filter(c => (c.created_at ?? '').startsWith(thisYear)).length;
    const prev = contests.filter(c => (c.created_at ?? '').startsWith(lastYear)).length;
    if (!prev) return null;
    return Math.round(((cur - prev) / prev) * 100);
  }, [contests]);

  // Insight: draft ratio
  const draftRatio = useMemo(() => {
    if (!contests.length) return null;
    const drafts = contests.filter(c => c.status === 'draft').length;
    return Math.round((drafts / contests.length) * 100);
  }, [contests]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
          <span className="text-sm">데이터를 불러오는 중…</span>
        </div>
      </div>
    );
  }

  const totalPublished = contests.filter(c => c.status === 'published').length;
  const pieStatusData = [
    { name: '진행중', value: statusCounts.active },
    { name: '예정', value: statusCounts.upcoming },
    { name: '종료', value: statusCounts.ended },
  ].filter(d => d.value > 0);
  const pieStatusColors = [STATUS_COLORS.active, STATUS_COLORS.upcoming, STATUS_COLORS.ended];

  const pieFieldColors = Object.keys(FIELD_COLORS).map(k => FIELD_COLORS[k]);

  return (
    <div className="space-y-7">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">대시보드</h2>
          <p className="mt-1 text-sm text-slate-500">공모전 현황·분야 분포·방문 분석을 한눈에 파악합니다.</p>
        </div>
        {fetchError && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {fetchError}
          </div>
        )}
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="진행중 공모전"
          value={statusCounts.active}
          icon={CheckCircle2}
          color="bg-gradient-to-br from-emerald-400 to-green-600"
          sub="현재 접수 중"
        />
        <KPICard
          title="예정 공모전"
          value={statusCounts.upcoming}
          icon={Clock}
          color="bg-gradient-to-br from-sky-400 to-blue-600"
          sub="아직 시작 전"
        />
        <KPICard
          title="종료된 공모전"
          value={statusCounts.ended}
          icon={Archive}
          color="bg-gradient-to-br from-slate-400 to-slate-600"
          sub="접수 마감"
        />
        <KPICard
          title="총 게시 수"
          value={totalPublished}
          icon={BarChart2}
          color="bg-gradient-to-br from-amber-400 to-orange-500"
          sub="PUBLISHED 기준"
        />
      </div>

      {/* ── Row 2: Annual Field Distribution + Status Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Stacked bar chart: annual × academic field */}
        <div className="lg:col-span-2">
          <Card
            title="연도별 학문 분야 공모전 수"
            subtitle="이공계 · 인문/상경 · 예체능 · 공통 분류 (대상 학과 기준)"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {/* Last field in stack gets rounded top corners */}
                  {Object.entries(FIELD_COLORS).map(([field, color], idx, arr) => (
                    <Bar key={field} dataKey={field} stackId="a" fill={color} radius={idx === arr.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {annualData.length === 0 && (
              <p className="text-xs text-center text-slate-400 mt-2">데이터가 없습니다. 공모전을 등록하면 표시됩니다.</p>
            )}
          </Card>
        </div>

        {/* Donut pie: contest active status */}
        <Card title="현재 공모전 현황" subtitle="진행중 / 예정 / 종료">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieStatusData}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={78}
                  paddingAngle={4} dataKey="value"
                >
                  {pieStatusData.map((_, i) => (
                    <Cell key={i} fill={pieStatusColors[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <CustomPieLegend data={pieStatusData} colors={pieStatusColors} />
        </Card>
      </div>

      {/* ── Row 3: Monthly Trend + Upcoming Deadlines ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Area chart: monthly contest registration */}
        <div className="lg:col-span-2">
          <Card title="월별 공모전 등록 추이" subtitle="최근 12개월 신규 등록 건수">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" name="등록 수" stroke="#6366F1" strokeWidth={2.5} fill="url(#areaGrad)" activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Deadline list */}
        <Card
          title="마감 임박 공모전"
          subtitle="30일 이내"
          right={<span className="text-[11px] text-slate-400">{upcomingDeadlines.length}건</span>}
        >
          {upcomingDeadlines.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">30일 내 마감 예정이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map(c => {
                const d = diffDays(c.end_date!);
                const urgentColor = d <= 3 ? 'bg-rose-50 text-rose-700 ring-rose-200' : d <= 7 ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-sky-50 text-sky-700 ring-sky-200';
                return (
                  <div key={c.id} className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-0">
                    <span className={cx('shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ring-1 ring-inset', urgentColor)}>
                      D-{d}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 line-clamp-2">{c.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{c.end_date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Row 4: Field Ratio Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="분야별 공모전 비율" subtitle="전체 공모전 기준">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fieldRatio}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={78}
                  paddingAngle={4} dataKey="value"
                >
                  {fieldRatio.map((d, i) => (
                    <Cell key={d.name} fill={FIELD_COLORS[d.name] ?? pieFieldColors[i % pieFieldColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <CustomPieLegend
            data={fieldRatio}
            colors={fieldRatio.map(d => FIELD_COLORS[d.name] ?? '#94a3b8')}
          />
        </Card>

        {/* Insight cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
          {peakMonth && peakMonth.count > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">최다 등록 월</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{peakMonth.month}</div>
              <div className="text-xs text-slate-400 mt-1">{peakMonth.count}건 등록</div>
            </div>
          )}
          {avgDuration !== null && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">평균 진행 기간</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{avgDuration}일</div>
              <div className="text-xs text-slate-400 mt-1">시작~마감 평균</div>
            </div>
          )}
          {yoyGrowth !== null && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">전년 대비 증감</div>
              <div className={cx('mt-2 text-2xl font-bold', yoyGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth}%
              </div>
              <div className="text-xs text-slate-400 mt-1">공모전 등록 수 YoY</div>
            </div>
          )}
          {draftRatio !== null && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">미공개 비율</div>
              <div className={cx('mt-2 text-2xl font-bold', draftRatio > 30 ? 'text-amber-600' : 'text-slate-900')}>
                {draftRatio}%
              </div>
              <div className="text-xs text-slate-400 mt-1">DRAFT 상태 공모전</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 5: Visitor / Click Analytics ── */}
      <Card
        title="방문자 · 클릭 분석"
        subtitle="사용자 웹 사이트 방문자 및 클릭 수"
        right={
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {([7, 30] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setTimeRange(v)}
                className={cx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition',
                  timeRange === v ? 'bg-white shadow-sm text-slate-900 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900'
                )}
              >
                최근 {v}일
              </button>
            ))}
          </div>
        }
      >
        {analyticsReady === 'unavailable' || analyticsSlice.length === 0 ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Supabase 분석 데이터 연동 필요</p>
                <p className="text-xs text-amber-700 mt-1">
                  방문자/클릭 수 그래프를 표시하려면 아래 작업이 필요합니다.
                </p>
                <div className="mt-3 space-y-1.5 text-xs text-amber-800">
                  <p className="font-semibold">관리자 조치 체크리스트:</p>
                  <ul className="list-none space-y-1">
                    <li>☐ Supabase 프로젝트에 <code className="bg-amber-100 px-1 rounded">daily_metrics</code> 테이블 생성
                      <div className="text-amber-600 ml-3">컬럼: date (date), visitors (int4), clicks (int4), apply_clicks (int4)</div>
                    </li>
                    <li>☐ RLS 정책: 인증된 관리자만 SELECT 가능하도록 설정</li>
                    <li>☐ 사용자 웹(hyu-erica-board)에 페이지 방문 시 <code className="bg-amber-100 px-1 rounded">daily_metrics</code> upsert 코드 추가</li>
                    <li>☐ 신청 버튼 클릭 이벤트에서 <code className="bg-amber-100 px-1 rounded">apply_clicks</code> 증가 처리</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analyticsSlice} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradVisitor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={(v) => String(v).slice(5)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line type="monotone" dataKey="visitors" name="방문자" stroke="#0EA5E9" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="clicks" name="클릭수" stroke="#22C55E" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="applyClicks" name="신청 클릭" stroke="#A855F7" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
};
