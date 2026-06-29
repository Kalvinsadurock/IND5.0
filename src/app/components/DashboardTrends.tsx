import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as Icons from 'lucide-react';

interface ThroughputData {
  day: string;
  blades: number;
}

interface StatusTrendData {
  day: string;
  active: number;
  hold: number;
}

interface YieldTrendData {
  month: string;
  yield: number;
}

export function DashboardTrends() {
  const [throughputData, setThroughputData] = useState<ThroughputData[]>([]);
  const [statusTrendData, setStatusTrendData] = useState<StatusTrendData[]>([]);
  const [yieldTrendData, setYieldTrendData] = useState<YieldTrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrends() {
      try {
        const [throughputRes, statusRes, yieldRes] = await Promise.all([
          fetch('/api/trends/throughput'),
          fetch('/api/trends/status'),
          fetch('/api/trends/yield')
        ]);

        if (throughputRes.ok) {
          const data = await throughputRes.json();
          setThroughputData(data);
        }
        if (statusRes.ok) {
          const data = await statusRes.json();
          setStatusTrendData(data);
        }
        if (yieldRes.ok) {
          const data = await yieldRes.json();
          setYieldTrendData(data);
        }
      } catch (error) {
        console.error('Failed to fetch trends:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTrends();
  }, []);

  const defaultThroughput: ThroughputData[] = [
    { day: 'Mon', blades: 2 },
    { day: 'Tue', blades: 3 },
    { day: 'Wed', blades: 2 },
    { day: 'Thu', blades: 4 },
    { day: 'Fri', blades: 3 },
    { day: 'Sat', blades: 1 },
    { day: 'Sun', blades: 0 },
  ];

  const defaultStatusTrend: StatusTrendData[] = [
    { day: 'Mon', active: 8, hold: 2 },
    { day: 'Tue', active: 10, hold: 3 },
    { day: 'Wed', active: 7, hold: 4 },
    { day: 'Thu', active: 12, hold: 2 },
    { day: 'Fri', active: 9, hold: 1 },
    { day: 'Sat', active: 5, hold: 2 },
    { day: 'Sun', active: 3, hold: 1 },
  ];

  const defaultYieldTrend: YieldTrendData[] = [
    { month: 'Oct', yield: 92 },
    { month: 'Nov', yield: 94 },
    { month: 'Dec', yield: 91 },
  ];

  const displayThroughput = throughputData.length > 0 ? throughputData : defaultThroughput;
  const displayStatusTrend = statusTrendData.length > 0 ? statusTrendData : defaultStatusTrend;
  const displayYieldTrend = yieldTrendData.length > 0 ? yieldTrendData : defaultYieldTrend;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Production Trends</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Icons.TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="text-white font-medium">Blade Throughput</h3>
            <span className="text-slate-400 text-sm">(Last 7 days)</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayThroughput}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Line type="monotone" dataKey="blades" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Icons.Activity className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-medium">Hold vs Active</h3>
            <span className="text-slate-400 text-sm">(Last 7 days)</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayStatusTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="active" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="hold" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span className="text-slate-400">Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded" />
              <span className="text-slate-400">Hold</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Icons.Target className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-medium">Yield Rate</h3>
            <span className="text-slate-400 text-sm">(Last 3 months)</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayYieldTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[80, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number) => [`${value}%`, 'Yield']}
                />
                <Line type="monotone" dataKey="yield" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
