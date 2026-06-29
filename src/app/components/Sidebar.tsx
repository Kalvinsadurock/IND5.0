import { cn } from '@/shared/ui/utils';
import * as Icons from '@/shared/ui/icons';
import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

interface KpiData {
  totalTarget: { sets: number; blades: number };
  setProgress: { completed: number; total: number; percent: number };
  completedBlades: number;
  dailyRunRate: number;
  yieldRate: number;
  trend: { direction: 'up' | 'down' | 'same'; delta: number };
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Icons.LayoutDashboard },
  { id: 'platform', label: 'Platform Core', icon: Icons.ShieldCheck },
  { id: 'configuration', label: 'Configuration', icon: Icons.Settings },
  { id: 'inventory', label: 'Inventory', icon: Icons.Package },
  { id: 'operations', label: 'Operations', icon: Icons.Activity },
  { id: 'process', label: 'Process', icon: Icons.Layers },
  { id: 'quality', label: 'Quality', icon: Icons.ClipboardCheck },
  { id: 'supply', label: 'Supply', icon: Icons.Package },
  { id: 'oee', label: 'OEE Tracker', icon: Icons.TrendingUp },
  { id: 'ict', label: 'ICT', icon: Icons.Cpu },
];

//const menuItems = [
// { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
// { id: 'operations', label: 'Operations', icon: Activity },
// { id: 'process', label: 'Process', icon: Layers },
// { id: 'quality', label: 'Quality', icon: ClipboardCheck },
// { id: 'supply', label: 'Supply', icon: Package },
//];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase() || 'operator';

  const roleAccessMap: Record<string, string[]> = {
    admin: ['dashboard', 'platform', 'configuration', 'inventory', 'operations', 'process', 'quality', 'supply', 'oee', 'ict'],
    inventory_engineer: ['dashboard', 'inventory', 'oee', 'ict'],
    production_engineer: ['dashboard', 'process', 'quality', 'operations', 'oee', 'ict'],
    production_supervisor: ['dashboard', 'process', 'operations', 'oee', 'ict'],
    quality_engineer: ['dashboard', 'quality', 'process', 'operations', 'oee'],
    quality_inspector: ['dashboard', 'quality', 'process', 'operations'],
    production_manager: ['dashboard', 'quality', 'process', 'operations'],
    quality_manager: ['dashboard', 'quality', 'process', 'operations'],
    plant_head: ['dashboard', 'platform', 'configuration', 'inventory', 'process', 'quality', 'operations', 'ict'],
    management_user: ['dashboard', 'platform', 'configuration', 'inventory', 'process', 'quality', 'operations', 'ict'],
    inventory_manager: ['dashboard', 'operations', 'supply', 'inventory', 'ict'],
    leadership: ['dashboard', 'platform', 'configuration', 'process', 'quality', 'operations', 'ict'],
    operator: ['dashboard', 'process', 'operations', 'quality', 'oee', 'ict']
  };

  const allowedViews = roleAccessMap[userRole] || roleAccessMap.operator;
  const filteredMenuItems = menuItems.filter(item => allowedViews.includes(item.id));

  const [kpiExpanded, setKpiExpanded] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('overall');
  const [kpiData, setKpiData] = useState<KpiData | null>(null);

  useEffect(() => {
    async function fetchKpis() {
      try {
        const res = await fetch(`/api/kpis?month=${selectedMonth}`);
        const data = await res.json();
        setKpiData(data);
      } catch (error) {
        console.error('Failed to fetch KPIs:', error);
      }
    }
    fetchKpis();
  }, [selectedMonth]);

  const months = [
    { value: 'overall', label: 'Overall' },
    { value: '2024-12', label: 'Dec 2024' },
    { value: '2024-11', label: 'Nov 2024' },
    { value: '2024-10', label: 'Oct 2024' },
  ];

  const TrendIcon = kpiData?.trend?.direction === 'up' ? Icons.TrendingUp :
    kpiData?.trend?.direction === 'down' ? Icons.TrendingDown : Icons.Minus;
  const trendColor = kpiData?.trend?.direction === 'up' ? 'text-emerald-400' :
    kpiData?.trend?.direction === 'down' ? 'text-red-400' : 'text-slate-400';

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-slate-900 rounded" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">Indutch Composites</h1>
            <p className="text-slate-400 text-xs">Blade Production</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {filteredMenuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors",
              activeView === item.id
                ? "bg-emerald-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            )}
          >
            {/* Render icon component from lucide bundle */}
            {React.createElement(item.icon as any, { className: 'w-5 h-5' })}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-slate-700">
        <button
          onClick={() => setKpiExpanded(!kpiExpanded)}
          className="w-full flex items-center justify-between p-4 text-slate-300 hover:bg-slate-800"
        >
          <span className="font-medium text-sm">Production KPIs</span>
          {kpiExpanded ? React.createElement(Icons.ChevronDown as any, { className: 'w-4 h-4' }) : React.createElement(Icons.ChevronUp as any, { className: 'w-4 h-4' })}
        </button>

        {kpiExpanded && (
          <div className="px-4 pb-4 space-y-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            {kpiData && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Target</span>
                  <span className="text-white">{kpiData.totalTarget.sets} Sets</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Set Progress</span>
                  <span className="text-emerald-400">{kpiData.setProgress.percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Daily Run Rate</span>
                  <span className="text-purple-400">{kpiData.dailyRunRate}/day</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Yield Rate</span>
                  <div className="flex items-center gap-1">
                    <span className="text-white">{kpiData.yieldRate}%</span>
                    {kpiData.trend && kpiData.trend.delta > 0 && (
                      <div className={cn("flex items-center", trendColor)}>
                        <TrendIcon className="w-3 h-3" />
                        <span className="text-xs">{kpiData.trend.delta}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
