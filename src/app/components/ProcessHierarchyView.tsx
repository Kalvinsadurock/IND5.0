import { useState, useEffect } from 'react';
import * as Icons from '@/shared/ui/icons';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils';

interface Process {
  id: number;
  processNumber: number;
  code: string;
  name: string;
  category: string;
}

interface InventoryCounts {
  kit_count: number;
  glass_kit_count: number;
  resin_lot_count: number;
}

interface ProcessHierarchyViewProps {
  processes: Process[];
  selectedProcess: Process | null;
  onSelectProcess: (process: Process) => void;
  onAddKit: (process: Process, kitType: 'KIT' | 'GLASS') => void;
  loading?: boolean;
  refreshTrigger?: number;
}

function getCategoryConfig() {
  return {
    inventory: { color: 'text-purple-400', bgColor: 'bg-purple-900/30', borderColor: 'border-purple-600', label: 'Inventory', icon: Icons.Package },
    prefabricated: { color: 'text-blue-400', bgColor: 'bg-blue-900/30', borderColor: 'border-blue-600', label: 'Prefabricated', icon: Icons.Package },
    moulding: { color: 'text-amber-400', bgColor: 'bg-amber-900/30', borderColor: 'border-amber-600', label: 'Moulding', icon: Icons.Scissors },
    finishing: { color: 'text-emerald-400', bgColor: 'bg-emerald-900/30', borderColor: 'border-emerald-600', label: 'Finishing', icon: Icons.Droplets },
  } as Record<string, { color: string; bgColor: string; borderColor: string; label: string; icon: any }>;
}

function ProcessHierarchyRow({
  process,
  isSelected,
  onSelect,
  onAddKit,
  counts,
  isExpanded,
  onToggleExpand,
  categoryConfig,
}: {
  process: Process;
  isSelected: boolean;
  onSelect: () => void;
  onAddKit: (kitType: 'KIT' | 'GLASS') => void;
  counts: InventoryCounts | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  categoryConfig: Record<string, { color: string; bgColor: string; borderColor: string; label: string; icon: any }>;
}) {
  const config = categoryConfig[process.category] || categoryConfig.prefabricated;
  const Icon = config.icon;

  return (
    <div
      key={process.id}
      className={cn(
        "border-l-4 transition-colors",
        isSelected ? config.borderColor : "border-l-transparent"
      )}
    >
      <div
        onClick={onSelect}
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors",
          isSelected && "bg-slate-800"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Icon className={cn("w-5 h-5 flex-shrink-0", config.color)} />
          <div className="min-w-0">
            <div className="font-medium text-white">{process.name}</div>
            <div className="text-xs text-slate-400">Process {process.processNumber} • {process.code}</div>
          </div>
        </div>

        <Icons.ChevronDown
          className={cn(
            "w-5 h-5 text-slate-400 transition-transform flex-shrink-0",
            isExpanded && "rotate-180"
          )}
        />
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="bg-slate-900/50 border-t border-slate-700 p-4 space-y-2 ml-4 mr-4 mb-2 rounded">
          <div className="text-xs text-slate-400 font-medium mb-3">Add to this process:</div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onAddKit('KIT')}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Icons.Package className="w-4 h-4" />
              Add Material Kit
            </Button>
            <Button
              size="sm"
              onClick={() => onAddKit('GLASS')}
              className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
            >
              <Icons.Scissors className="w-4 h-4" />
              Add Glass Kit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProcessHierarchyView({
  processes,
  selectedProcess,
  onSelectProcess,
  onAddKit,
  loading = false,
  refreshTrigger = 0,
}: ProcessHierarchyViewProps) {
  const [inventoryCounts, setInventoryCounts] = useState<Record<number, InventoryCounts>>({});
  const [expandedProcesses, setExpandedProcesses] = useState<Set<number>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['prefabricated', 'moulding', 'finishing'])
  );
  const [loadingCounts, setLoadingCounts] = useState(false);
  const categoryConfig = getCategoryConfig();

  // Fetch inventory counts for all processes
  useEffect(() => {
    async function fetchCounts() {
      setLoadingCounts(true);
      try {
        const counts: Record<number, InventoryCounts> = {};

        for (const process of processes) {
          try {
            const res = await fetch(`/api/process/${process.id}/inventory`);
            if (res.ok) {
              counts[process.id] = await res.json();
            }
          } catch (error) {
            console.error(`Failed to fetch counts for process ${process.id}:`, error);
            counts[process.id] = { kit_count: 0, glass_kit_count: 0, resin_lot_count: 0 };
          }
        }

        setInventoryCounts(counts);
      } finally {
        setLoadingCounts(false);
      }
    }

    if (processes.length > 0) {
      fetchCounts();
    }
  }, [processes, refreshTrigger]);

  const groupedProcesses = processes.reduce((acc, proc) => {
    const cat = proc.category || 'prefabricated';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(proc);
    return acc;
  }, {} as Record<string, Process[]>);

  const categoryOrder = ['prefabricated', 'moulding', 'finishing'];

  const toggleProcessExpand = (processId: number) => {
    setExpandedProcesses(prev => {
      const next = new Set(prev);
      if (next.has(processId)) {
        next.delete(processId);
      } else {
        next.add(processId);
      }
      return next;
    });
  };

  const toggleCategoryExpand = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };


  return (
    <div className="space-y-4">
      {/* Global Resin */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icons.Droplets className="w-5 h-5 text-purple-400" />
            <div>
              <div className="font-medium text-white">Resin Inventory (Pool)</div>
              <div className="text-xs text-slate-400">Resin is a shared resource available to all moulding processes.</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {inventoryCounts && Object.values(inventoryCounts).length > 0 && (
              <div className="text-right mr-3">
                <div className="text-xl font-bold text-purple-400">
                  {Object.values(inventoryCounts).reduce((sum, c) => sum + (c.resin_lot_count || 0), 0)}
                </div>
                <div className="text-xs text-slate-400">Available Resin Units</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Process Categories */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {categoryOrder.map(cat => {
            const procs = groupedProcesses[cat];
            if (!procs || procs.length === 0) return null;

            const config = categoryConfig[cat];
            const Icon = config.icon;

            return (
              <div key={cat} className={cn(
                "border rounded-lg overflow-hidden bg-slate-800/50 border-slate-700",
                config.borderColor
              )}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategoryExpand(cat)}
                  className={cn(
                    "w-full p-4 flex items-center gap-2 hover:opacity-90 transition-opacity",
                    config.bgColor
                  )}
                >
                  {expandedCategories.has(cat) ? (
                    <Icons.ChevronDown className="w-5 h-5" />
                  ) : (
                    <Icons.ChevronDown className="w-5 h-5 rotate-180" />
                  )}
                  <Icon className={cn("w-5 h-5", config.color)} />
                  <h3 className={cn("font-semibold", config.color)}>{config.label}</h3>
                  <span className="text-slate-500 text-sm ml-auto">({procs.length})</span>
                </button>

                {/* Process List */}
                {expandedCategories.has(cat) && (
                  <div className="divide-y divide-slate-700">
                    {procs.map(proc => (
                      <ProcessHierarchyRow
                        key={proc.id}
                        process={proc}
                        isSelected={selectedProcess?.id === proc.id}
                        onSelect={() => onSelectProcess(proc)}
                        onAddKit={(kitType) => onAddKit(proc, kitType)}
                        counts={inventoryCounts[proc.id] || null}
                        isExpanded={expandedProcesses.has(proc.id)}
                        onToggleExpand={() => toggleProcessExpand(proc.id)}
                        categoryConfig={categoryConfig}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
