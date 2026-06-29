import { useState, useEffect } from 'react';
import { X, Layers, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronRight, Box } from 'lucide-react';
import { cn } from '@/shared/utils';

interface Process {
  id: number;
  processNumber: number;
  code: string;
  name: string;
  category: string;
}

interface ProcessSummary {
  processId: number;
  name: string;
  category: string;
  inProgress: number;
  hold: number;
  completed: number;
  activeMoulds: string[];
}

interface ActivePart {
  id: number;
  partNumber: string;
  stepName: string | null;
  status: string;
}

interface ProcessOverviewDialogProps {
  category: string;
  categoryTitle: string;
  onClose: () => void;
  onSelectProcess: (processId: number, partId?: number) => void;
}

export function ProcessOverviewDialog({
  category,
  categoryTitle,
  onClose,
  onSelectProcess,
}: ProcessOverviewDialogProps) {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [summaries, setSummaries] = useState<Map<number, ProcessSummary>>(new Map());
  const [activeParts, setActiveParts] = useState<Map<number, ActivePart[]>>(new Map());
  const [expandedProcesses, setExpandedProcesses] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/processes?category=${category}`);
        const data: Process[] = await res.json();
        setProcesses(data);

        const summaryPromises = data.map(async (proc) => {
          const summaryRes = await fetch(`/api/processes/${proc.id}/summary`);
          const summary: ProcessSummary = await summaryRes.json();
          return { id: proc.id, summary };
        });

        const partsPromises = data.map(async (proc) => {
          const partsRes = await fetch(`/api/processes/${proc.id}/active-parts`);
          const parts: ActivePart[] = await partsRes.json();
          return { id: proc.id, parts };
        });

        const [summaryResults, partsResults] = await Promise.all([
          Promise.all(summaryPromises),
          Promise.all(partsPromises)
        ]);

        const summaryMap = new Map<number, ProcessSummary>();
        summaryResults.forEach(r => summaryMap.set(r.id, r.summary));
        setSummaries(summaryMap);

        const partsMap = new Map<number, ActivePart[]>();
        partsResults.forEach(r => partsMap.set(r.id, r.parts));
        setActiveParts(partsMap);
      } catch (error) {
        console.error('Failed to fetch processes:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [category]);

  const toggleExpanded = (processId: number) => {
    setExpandedProcesses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(processId)) {
        newSet.delete(processId);
      } else {
        newSet.add(processId);
      }
      return newSet;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">{categoryTitle} Processes</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {processes
                .filter(proc => {
                  const num = proc.processNumber;
                  // Exclude 10, 20, 30 and range 210-340
                  if ([10, 20, 30].includes(num)) return false;
                  if (num >= 210 && num <= 340) return false;
                  return true;
                })
                .map(proc => {
                  const summary = summaries.get(proc.id);
                  const parts = activeParts.get(proc.id) || [];
                  const isExpanded = expandedProcesses.has(proc.id);
                  const hasActiveParts = parts.length > 0;

                  return (
                    <div key={proc.id} className="bg-slate-700/50 border border-slate-600 rounded-lg overflow-hidden">
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/70 transition-colors"
                        onClick={() => hasActiveParts ? toggleExpanded(proc.id) : onSelectProcess(proc.id)}
                      >
                        <div className="flex items-center gap-3">
                          {hasActiveParts && (
                            isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )
                          )}
                          <div>
                            <span className="text-slate-400 text-xs">{proc.processNumber}</span>
                            <h3 className="text-white font-medium text-sm">{proc.name}</h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {summary && (
                            <div className="flex items-center gap-3 text-xs">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-400" />
                                <span className="text-slate-300">{summary.inProgress}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-amber-400" />
                                <span className="text-slate-300">{summary.hold}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-blue-400" />
                                <span className="text-slate-300">{summary.completed}</span>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onSelectProcess(proc.id); }}
                            className="px-3 py-1 text-xs bg-slate-600 hover:bg-slate-500 rounded text-white transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </div>

                      {isExpanded && hasActiveParts && (
                        <div className="border-t border-slate-600 bg-slate-800/50 p-3">
                          <div className="text-xs text-slate-400 mb-2">In Progress Parts:</div>
                          <div className="space-y-2">
                            {parts.map(part => (
                              <div
                                key={part.id}
                                onClick={() => {
                                  // Enable selection for all in-progress parts
                                  // The user said "enable selection for all inprogress parts"
                                  // This likely means if status is 'in_progress' or generally any active part listed here
                                  onSelectProcess(proc.id, part.id);
                                }}
                                className="flex items-center gap-3 bg-slate-700/50 rounded px-3 py-2 cursor-pointer hover:bg-slate-700 transition-colors"
                              >
                                <Box className="w-4 h-4 text-blue-400" />
                                <span className="text-white font-mono text-sm">{part.partNumber}</span>
                                {part.stepName && (
                                  <span className="text-emerald-400 text-xs">at {part.stepName}</span>
                                )}
                                <span className={cn(
                                  "ml-auto text-xs px-2 py-0.5 rounded border",
                                  (part.status === 'in_progress' || part.status === 'active') && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_-3px_rgba(16,185,129,0.3)]",
                                  part.status === 'hold' && "bg-amber-900/50 text-amber-400 border-amber-500/20",
                                  part.status === 'rework' && "bg-purple-900/50 text-purple-400 border-purple-500/20"
                                )}>
                                  {(part.status === 'in_progress' || part.status === 'active') ? 'In Progress' : part.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
