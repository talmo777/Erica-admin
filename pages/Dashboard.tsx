import React, { useEffect, useState } from 'react';
import { MetricsRepository, ContestRepository } from '../services/repository';
import { KPIData, DailyMetric, ContestCategory } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';
import { ArrowUpRight, Users, MousePointer, Eye } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<number>(7);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [kpiData, metrics, contests] = await Promise.all([
          MetricsRepository.getKPI(),
          MetricsRepository.getDailyMetrics(timeRange),
          ContestRepository.getAll()
        ]);
        
        setKpi(kpiData);
        setDailyMetrics(metrics);

        // Process Category Data
        const counts = contests.reduce((acc, curr) => {
          acc[curr.category] = (acc[curr.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const pieData = Object.entries(counts).map(([name, value]) => ({ name, value }));
        setCategoryData(pieData);

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  if (loading) return <div className="p-8 text-center text-gray-500">데이터를 불러오는 중...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">대시보드</h2>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
        >
          <option value={7}>최근 7일</option>
          <option value={30}>최근 30일</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="전체 참여율" value={`${kpi?.participationRate}%`} icon={Users} color="bg-blue-500" />
        <KPICard title="총 신청 수" value={kpi?.totalApplies.toLocaleString() || '0'} icon={MousePointer} color="bg-green-500" />
        <KPICard title="오늘 접속자" value={kpi?.activeUsersToday.toLocaleString() || '0'} icon={Eye} color="bg-purple-500" />
        <KPICard title="공모전 게시 수" value={categoryData.reduce((a, b) => a + b.value, 0)} icon={ArrowUpRight} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">방문자 및 클릭 추이</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyMetrics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="visitors" name="방문자" stroke="#3B82F6" strokeWidth={2} />
                <Line type="monotone" dataKey="clicks" name="클릭수" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">카테고리별 비율</h3>
          <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
             {categoryData.map((entry, index) => (
               <div key={index} className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                 <span className="text-gray-600">{entry.name}: {entry.value}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
    <div className={`p-3 rounded-full ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
      <Icon size={24} />
    </div>
  </div>
);