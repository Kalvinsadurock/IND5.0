import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Package,
  Droplets,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils';
import { ProcessSpecificAddKitDialog } from './ProcessSpecificAddKitDialog';
import { AddResinDialog } from './AddResinDialog';

interface Process {
  id: number;
  processNumber: number;
  code: string;
  name: string;
  category: string;
}

interface InventoryCounts {
  materialKits: number;
  glassKits: number;
  resinLots: number;
}

interface ProcessGroup {
  category: string;
  processes: Process[];
}

const categoryConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  prefabricated: { label: 'Prefabricated', bgColor: 'bg-blue-900', textColor: 'text-blue-100' },
  moulding: { label: 'Moulding', bgColor: 'bg-amber-900', textColor: 'text-amber-100' },
  finishing: { label: 'Finishing', bgColor: 'bg-emerald-900', textColor: 'text-emerald-100' },
};

export function IncomingPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [inventoryCounts, setInventoryCounts] = useState<Record<number, InventoryCounts>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['prefabricated', 'moulding', 'finishing'])
  );
  const [isAddKitDialogOpen, setIsAddKitDialogOpen] = useState(false);
  const [isAddResinDialogOpen, setIsAddResinDialogOpen] = useState(false);
  const [pendingProcess, setPendingProcess] = useState<Process | null>(null);
  const [pendingKitType, setPendingKitType] = useState<'KIT' | 'GLASS'>('KIT');
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [userName] = useState(localStorage.getItem('userName') || 'Unknown User');

  // Fetch processes on mount
  useEffect(() => {
    async function fetchProcesses() {
      try {
        const res = await fetch('/api/processes');
        if (res.ok) {
          const data = await res.json();
          // Filter only non-inventory processes (Prefabricated, Moulding, Finishing)
          // Also exclude processes 230-340 as requested (Assembly/Bonding flows not needed here)
          const filtered = data.filter(
            (p: Process) =>
              p.category !== 'inventory' &&
              (p.processNumber < 230 || p.processNumber > 340)
          );
          setProcesses(filtered);
          fetchCounts(filtered);
        }
      } catch (error) {
        console.error('Failed to fetch processes:', error);
        setLoadingCounts(false);
      }
    }
    fetchProcesses();
  }, []);

  // Fetch inventory counts for all processes
  async function fetchCounts(processList: Process[]) {
    const counts: Record<number, InventoryCounts> = {};
    try {
      for (const process of processList) {
        const res = await fetch(`/api/process/${process.id}/inventory`);
        if (res.ok) {
          const data = await res.json();
          counts[process.id] = {
            materialKits: data.materialKits || 0,
            glassKits: data.glassKits || 0,
            resinLots: data.resinLots || 0,
          };
        }
      }
    } catch (error) {
      console.error('Failed to fetch inventory counts:', error);
    }
    setInventoryCounts(counts);
    setLoadingCounts(false);
  }

  function toggleCategory(category: string) {
    const updated = new Set(expandedCategories);
    if (updated.has(category)) {
      updated.delete(category);
    } else {
      updated.add(category);
    }
    setExpandedCategories(updated);
  }

  function handleAddKit(process: Process, kitType: 'KIT' | 'GLASS') {
    setPendingProcess(process);
    setPendingKitType(kitType);
    setIsAddKitDialogOpen(true);
  }

  function handleAddResin() {
    setIsAddResinDialogOpen(true);
  }

  function handleDialogSuccess() {
    if (processes.length > 0) {
      fetchCounts(processes);
    }
  }

  const groupedProcesses: ProcessGroup[] = [];
  const categoriesOrder = ['prefabricated', 'moulding', 'finishing'];

  for (const category of categoriesOrder) {
    const categoryProcesses = processes.filter((p) => p.category === category);
    if (categoryProcesses.length > 0) {
      groupedProcesses.push({ category, processes: categoryProcesses });
    }
  }

  return (
    <div className="h-full w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Material Assignment</h1>
          <p className="text-slate-300">
            Manages material kits and makes them available for prefabrication, moulding, and finishing processes.
          </p>
        </div>
        <Button
          onClick={handleAddResin}
          className="bg-emerald-700 hover:bg-emerald-600 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Resin Lot
        </Button>
      </div>

      {/* Global Resin Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Droplets className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Resin – Common Inventory Pool</h2>
        </div>
        <div className="text-sm text-slate-300 mb-4">
          Resin availability is centrally managed and accessible to all production processes.
        </div>
        <div className="text-2xl font-bold text-emerald-400">
          Current Resin Availability: {loadingCounts ? '...' : Object.values(inventoryCounts).reduce((sum, counts) => sum + counts.resinLots, 0)} Lots
        </div>
        <div className="text-sm text-slate-400 mt-2">
          Availability reflects usable resin stock across all active processes.
        </div>
      </div>

      {/* Process Categories */}
      <div className="space-y-4">
        {groupedProcesses.map((group) => {
          const config = categoryConfig[group.category] || { label: group.category, bgColor: 'bg-slate-700', textColor: 'text-slate-300' };
          const isExpanded = expandedCategories.has(group.category);

          return (
            <div key={group.category} className="border border-slate-700 rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(group.category)}
                className={cn(
                  'w-full px-6 py-4 flex items-center justify-between transition-colors',
                  config.bgColor,
                  'hover:opacity-90'
                )}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <span className={cn('font-semibold text-lg', config.textColor)}>
                    {config.label}
                  </span>
                  <span className="text-sm opacity-75">({group.processes.length})</span>
                </div>
              </button>

              {/* Process List */}
              {isExpanded && (
                <div className="bg-slate-800 divide-y divide-slate-700">
                  {group.processes.map((process) => {
                    const counts = inventoryCounts[process.id] || {
                      materialKits: 0,
                      glassKits: 0,
                      resinLots: 0,
                    };

                    return (
                      <div
                        key={process.id}
                        className="px-6 py-4 hover:bg-slate-700/50 transition-colors"
                      >
                        {/* Process Name */}
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-white font-semibold text-lg">
                              {process.name}
                            </h3>
                            <p className="text-slate-400 text-sm">
                              Process {process.processNumber} ({process.code})
                            </p>
                          </div>
                        </div>

                        {/* Availability Grid */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          {/* Material Kits */}
                          <div className="bg-slate-700/30 rounded p-4 border border-slate-600">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-blue-400" />
                              <span className="text-sm font-medium text-slate-300">
                                Material Kits
                              </span>
                            </div>
                            <div className="text-2xl font-bold text-blue-300">
                              {loadingCounts ? '...' : counts.materialKits}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Operational</p>
                          </div>

                          {/* Glass Kits */}
                          <div className="bg-slate-700/30 rounded p-4 border border-slate-600">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-amber-400" />
                              <span className="text-sm font-medium text-slate-300">
                                Glass Kits
                              </span>
                            </div>
                            <div className="text-2xl font-bold text-amber-300">
                              {loadingCounts ? '...' : counts.glassKits}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Operational</p>
                          </div>

                          {/* Resin Lots */}
                          <div className="bg-slate-700/30 rounded p-4 border border-slate-600">
                            <div className="flex items-center gap-2 mb-2">
                              <Droplets className="h-4 w-4 text-emerald-400" />
                              <span className="text-sm font-medium text-slate-300">
                                Resin Lots
                              </span>
                            </div>
                            <div className="text-2xl font-bold text-emerald-300">
                              {loadingCounts ? '...' : counts.resinLots}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Shared</p>
                          </div>
                        </div>

                        {/* Add Kit Buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAddKit(process, 'KIT')}
                            className="flex-1 bg-blue-700 hover:bg-blue-600 text-white gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Material Kit
                          </Button>
                          <Button
                            onClick={() => handleAddKit(process, 'GLASS')}
                            className="flex-1 bg-amber-700 hover:bg-amber-600 text-white gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Glass Kit
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Banner */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-300">
          <p className="font-medium text-slate-100 mb-1">Process-Driven Flow</p>
          <p>
            Select a process above and add material kits or glass kits. These items become available
            to that process immediately. Resin is shared across all processes.
          </p>
        </div>
      </div>

      {/* Dialogs */}
      {pendingProcess && (
        <ProcessSpecificAddKitDialog
          isOpen={isAddKitDialogOpen}
          onClose={() => {
            setIsAddKitDialogOpen(false);
            setPendingProcess(null);
          }}
          process={pendingProcess}
          kitType={pendingKitType}
          userName={userName}
          onSuccess={handleDialogSuccess}
        />
      )}

      <AddResinDialog
        isOpen={isAddResinDialogOpen}
        onClose={() => setIsAddResinDialogOpen(false)}
        userName={userName}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}

export default IncomingPage;
