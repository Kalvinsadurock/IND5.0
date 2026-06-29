import { useState, useEffect } from 'react';
import { User, Clock, AlertCircle, Box, Search, Eye, ChevronRight, Layers } from 'lucide-react';
import { cn } from '@/shared/utils';

type BladeStatus = 'in_progress' | 'hold' | 'rework' | 'waiting' | 'blocked';
type Category = 'inventory' | 'prefabricated' | 'moulding' | 'finishing';

interface BladeOperation {
  id: number;
  partNumber: string;
  processId: number | null;
  processName: string;
  processNumber: number;
  category: Category;
  status: BladeStatus;
  mouldId: number | null;
  mouldName: string | null;
  stepName: string | null;
  elapsedMinutes: number;
  targetMinutes: number;
  reason: string | null;
  priority: 'normal' | 'high' | 'critical';
}

interface Mould {
  id: number;
  code: string;
  name: string;
}

interface Process {
  id: number;
  processNumber: number;
  name: string;
  category: string;
}

const statusConfig: Record<BladeStatus, { color: string; bgColor: string; borderColor: string; label: string }> = {
  in_progress: {
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-950/50',
    borderColor: 'border-emerald-600',
    label: 'Active',
  },
  waiting: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/50',
    borderColor: 'border-blue-600',
    label: 'Waiting',
  },
  hold: {
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/50',
    borderColor: 'border-amber-600',
    label: 'Hold',
  },
  blocked: {
    color: 'text-red-400',
    bgColor: 'bg-red-950/50',
    borderColor: 'border-red-600',
    label: 'Blocked',
  },
  rework: {
    color: 'text-purple-400',
    bgColor: 'bg-purple-950/50',
    borderColor: 'border-purple-600',
    label: 'Rework',
  },
};

const categoryConfig: Record<Category, { color: string; bgColor: string; label: string }> = {
  inventory: { color: 'text-purple-400', bgColor: 'bg-purple-900/30', label: 'Inventory' },
  prefabricated: { color: 'text-blue-400', bgColor: 'bg-blue-900/30', label: 'Prefab' },
  moulding: { color: 'text-amber-400', bgColor: 'bg-amber-900/30', label: 'Moulding' },
  finishing: { color: 'text-emerald-400', bgColor: 'bg-emerald-900/30', label: 'Finishing' },
};

interface BladeCardProps {
  blade: BladeOperation;
  onViewProcess: (bladeId: number) => void;
}

function BladeCard({ blade, onViewProcess }: BladeCardProps) {
  const statusCfg = statusConfig[blade.status] || statusConfig.in_progress;
  const categoryCfg = categoryConfig[blade.category] || categoryConfig.prefabricated;
  const isOvertime = blade.elapsedMinutes > blade.targetMinutes;
  const progressPercent = Math.min(100, (blade.elapsedMinutes / blade.targetMinutes) * 100);
  const isPriority = blade.priority === 'critical' || blade.priority === 'high';

  return (
    <div className={cn(
      "bg-slate-800 border-2 rounded-xl p-4 transition-all hover:bg-slate-750",
      statusCfg.borderColor,
      isPriority && blade.priority === 'critical' && "animate-pulse ring-2 ring-red-500/50"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2 py-1 rounded-md text-xs font-medium",
            statusCfg.bgColor, statusCfg.color
          )}>
            {statusCfg.label}
          </span>
          <span className={cn(
            "px-2 py-1 rounded-md text-xs",
            categoryCfg.bgColor, categoryCfg.color
          )}>
            {categoryCfg.label}
          </span>
        </div>
        {isPriority && (
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-bold",
            blade.priority === 'critical' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
          )}>
            {blade.priority.toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Box className="w-4 h-4 text-slate-500" />
        <span className="text-white font-mono font-medium">{blade.partNumber}</span>
      </div>

      <div className="mb-3">
        <span className="text-slate-400 text-xs">Process {blade.processNumber}</span>
        <h4 className="text-slate-200 font-medium text-sm">{blade.processName}</h4>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700">
          <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
            <Clock className="w-3 h-3" />
            <span>Elapsed / Target</span>
          </div>
          <div className={cn("text-sm font-medium", isOvertime ? 'text-red-400' : 'text-slate-100')}>
            {blade.elapsedMinutes}m / {blade.targetMinutes}m
          </div>
          <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all", isOvertime ? 'bg-red-500' : 'bg-emerald-500')}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700">
          <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
            <Layers className="w-3 h-3" />
            <span>{blade.category === 'prefabricated' ? 'Current Step' : 'Mould'}</span>
          </div>
          <div className="text-sm text-slate-100">
            {blade.category === 'prefabricated'
              ? (blade.stepName || 'Not Started')
              : (blade.mouldName || 'Unassigned')}
          </div>
        </div>
      </div>

      {blade.reason && (
        <div className="flex items-start gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700 mb-3">
          <AlertCircle className={cn("w-4 h-4 flex-shrink-0 mt-0.5", statusCfg.color)} />
          <span className="text-xs text-slate-300">{blade.reason}</span>
        </div>
      )}

      <button
        onClick={() => onViewProcess(blade.id)}
        className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
      >
        <Eye className="w-4 h-4" />
        View Process
      </button>
    </div>
  );
}

interface OperationsTabProps {
  onNavigateToProcess?: (processId: number) => void;
}

export function OperationsTab({ onNavigateToProcess }: OperationsTabProps) {
  const [blades, setBlades] = useState<BladeOperation[]>([]);
  const [moulds, setMoulds] = useState<Mould[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [processFilter, setProcessFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mouldFilter, setMouldFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        const [mouldsRes, processesRes] = await Promise.all([
          fetch('/api/moulds'),
          fetch('/api/processes')
        ]);

        const mouldsData = await mouldsRes.json();
        const processesData = await processesRes.json();

        // Ensure we always set arrays, even if API returns error objects
        setBlades([]); // endpoint api/operations/blades is deprecated/missing
        setMoulds(Array.isArray(mouldsData) ? mouldsData : []);
        setProcesses(Array.isArray(processesData) ? processesData : []);
      } catch (error) {
        console.error('Failed to fetch operations:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [categoryFilter, processFilter, statusFilter, mouldFilter]);

  const handleViewProcess = (bladeId: number) => {
    const blade = blades.find(b => b.id === bladeId);
    if (blade && blade.processId && onNavigateToProcess) {
      onNavigateToProcess(blade.processId);
    }
  };

  // Ensure blades is an array before using reduce
  const bladesArray = Array.isArray(blades) ? blades : [];

  const groupedByMould = bladesArray.reduce((acc, blade) => {
    // Prefabricated parts should be grouped under "Prefabricated Part" instead of mould name
    const key = blade.category === 'prefabricated'
      ? 'Prefabricated Part'
      : (blade.mouldName || 'Unassigned');
    if (!acc[key]) acc[key] = [];
    acc[key].push(blade);
    return acc;
  }, {} as Record<string, BladeOperation[]>);

  const mouldOrder = ['Prefabricated Part', 'Unassigned', ...moulds.map(m => m.name || m.code)];
  const sortedMoulds = Object.keys(groupedByMould).sort((a, b) => {
    return mouldOrder.indexOf(a) - mouldOrder.indexOf(b);
  });

  const filteredProcesses = categoryFilter === 'all'
    ? processes
    : processes.filter(p => p.category === categoryFilter);

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Operations</h1>
          <p className="text-slate-400">Real-time blade tracking across all moulds</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            showFilters ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-200 hover:bg-slate-600"
          )}
        >
          <Search className="w-4 h-4" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setProcessFilter('all');
                }}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="all">All Categories</option>
                <option value="inventory">Inventory</option>
                <option value="prefabricated">Prefabricated</option>
                <option value="moulding">Moulding</option>
                <option value="finishing">Finishing</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">Process</label>
              <select
                value={processFilter}
                onChange={(e) => setProcessFilter(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="all">All Processes</option>
                {filteredProcesses.map(p => (
                  <option key={p.id} value={p.id}>{p.processNumber} - {p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="in_progress">Active</option>
                <option value="waiting">Waiting</option>
                <option value="hold">Hold</option>
                <option value="blocked">Blocked</option>
                <option value="rework">Rework</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">Mould</label>
              <select
                value={mouldFilter}
                onChange={(e) => setMouldFilter(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="all">All Moulds</option>
                <option value="unassigned">Unassigned</option>
                {moulds.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.code}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : blades.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <Box className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Active Operations</h3>
          <p className="text-slate-400">No blades match the current filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedMoulds.map(mouldName => (
            <div key={mouldName} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 border-b",
                mouldName === 'Prefabricated Part' ? 'bg-blue-900/30 border-blue-700/50' :
                  mouldName === 'Unassigned' ? 'bg-slate-800 border-slate-700' : 'bg-purple-900/30 border-purple-700/50'
              )}>
                <Layers className={cn("w-5 h-5",
                  mouldName === 'Prefabricated Part' ? 'text-blue-400' :
                    mouldName === 'Unassigned' ? 'text-slate-400' : 'text-purple-400'
                )} />
                <h3 className="text-white font-medium">{mouldName}</h3>
                <span className="bg-slate-700 px-2 py-0.5 rounded text-slate-300 text-sm">
                  {groupedByMould[mouldName].length} blade{groupedByMould[mouldName].length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupedByMould[mouldName].map(blade => (
                    <BladeCard key={blade.id} blade={blade} onViewProcess={handleViewProcess} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
