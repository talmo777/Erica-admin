import React, { useEffect, useMemo, useState } from 'react';
import { MetricsRepository, ContestRepository } from '../services/repository';
import { KPIData, DailyMetric } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ArrowUpRight, Users, MousePointer, Eye } from 'lucide-react';

type TimeRange = 7 | 30;

const PIE_COLORS = ['#0EA5E9', '#22C55E', '#F59E0B', '#A855F7', '#EF4444', '#64748B'];

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
        </div>
        {right}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Segmented({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}) {
  const base =
    'inline-flex items-center justify-center h-9 px-3 rounded-xl text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-2';
  return (
    <div className="inline-flex items-center rounded-2xl bg-slate-100 p-1">
      <button
        type="button"
        className={cx(
          base,
          value === 7
            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
            : 'text-slate-600 hover:text-slate-900'
        )}
        onClick={() => onChange(7)}
      >
        최근 7일
      </button>
      <button
        type="button"
        className={cx(
          base,
          value === 30
            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
            : 'text-slate-600 hover:text-slate-900'
        )}
        onClick={() => onChange(30)}
      >
        최근 30일
      </button>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon: Icon,
  tone,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'sky' | 'emerald' | 'violet' | 'amber';
}) {
  const toneCls =
    tone === 'sky'
      ? 'bg-sky-50 text-sky-700 ring-sky-200'
      : tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : tone === 'violet'
      ? 'bg-violet-50 text-violet-700 ring-violet-200'
      : 'bg-amber-50 text-amber-800 ring-amber-200';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-600">{title}</div>
        <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
        {subtitle && <div className="mt-1 text-xs text-slate-500">{subtitle}</div>}
      </div>
      <div className={cx('w-11 h-11 rounded-2xl ring-1 flex items-center justify-center', toneCls)}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [categoryData, setCategoryData] = useState<Array<{ name: string; value: number }>>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>(7);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [kpiData, metrics, contests] = await Promise.all([
          MetricsRepository.getKPI(),
          MetricsRepository.getDailyMetrics(timeRange),
          ContestRepository.getAll(),
        ]);

        setKpi(kpiData);
        setDailyMetrics(metrics);

        const counts = contests.reduce((acc, curr) => {
          acc[curr.category] = (acc[curr.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const pieData = Object.entries(counts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        setCategoryData(pieData);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  const totalPosts = useMemo(() => categoryData.reduce((a, b) => a + b.value, 0), [categoryData]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
          <div className="text-sm">데이터를 불러오는 중…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">대시보드</h2>
          <p className="mt-1 text-sm text-slate-500">방문/클릭 지표와 게시 현황을 요약합니다.</p>
        </div>
        <div className="shrink-0">
          <Segmented value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="전체 참여율"
          value={`${kpi?.participationRate ?? 0}%`}
          subtitle="월 누적 방문자/재학생"
          icon={Users}
          tone="sky"
        />
        <KPICard title="총 신청 수" value={(kpi?.totalApplies ?? 0).toLocaleString()} icon={MousePointer} tone="emerald" />
        <KPICard title="오늘 접속자" value={(kpi?.activeUsersToday ?? 0).toLocaleString()} icon={Eye} tone="violet" />
        <KPICard title="공모전 게시 수" value={totalPosts.toLocaleString()} icon={ArrowUpRight} tone="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="방문자 및 클릭 추이" right={<div className="text-xs text-slate-500">단위: 일</div>}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyMetrics} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v) => String(v).slice(5)} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="visitors" name="방문자" stroke="#0EA5E9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicks" name="클릭수" stroke="#22C55E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="카테고리별 비율" right={<div className="text-xs text-slate-500">게시 수 기준</div>}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {categoryData.slice(0, 8).map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                <div className="truncate text-slate-700">
                  {entry.name}
                  <span className="text-slate-500"> · {entry.value}</span>
                </div>
              </div>
            ))}
            {categoryData.length === 0 && <div className="text-slate-500">표시할 데이터가 없습니다.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
};
