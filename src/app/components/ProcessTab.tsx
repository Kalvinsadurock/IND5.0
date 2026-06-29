import { useState, useEffect } from 'react';
import * as Icons from '@/shared/ui/icons';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/utils';
import { useAuth } from '../../lib/AuthContext';
import { fetchSafe } from '../../lib/fetchSafe';
import { ProcessFlowView } from './ProcessFlowView';
import { StartProcessDialog } from './StartProcessDialog';
import { ProcessReadiness } from './ProcessReadiness';
import { MaterialCreationDialog } from './MaterialCreationDialog';

import { ProcessHierarchyView } from './ProcessHierarchyView';
import { ProcessSpecificAddKitDialog } from './ProcessSpecificAddKitDialog';

interface ProcessTabProps {
  initialProcessId?: number | null;
  initialPartId?: number | null;
}

interface Process {
  id: number;
  processNumber: number;
  code: string;
  name: string;
  category: string;
}

interface ProcessSummary {
  inProgress: number;
  hold: number;
  completed: number;
}

interface AvailabilityData {
  available: number;
  missing: number;
  qaHold: number;
}

interface Part {
  id: number;
  partNumber: string;
  status: string;
  priority: string;
  elapsedMinutes?: number;
  targetMinutes?: number;
}

const categoryConfig: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
  inventory: { color: 'text-purple-400', bgColor: 'bg-purple-900/30', borderColor: 'border-purple-600', label: 'Inventory' },
  prefabricated: { color: 'text-blue-400', bgColor: 'bg-blue-900/30', borderColor: 'border-blue-600', label: 'Prefabricated' },
  moulding: { color: 'text-amber-400', bgColor: 'bg-amber-900/30', borderColor: 'border-amber-600', label: 'Moulding' },
  finishing: { color: 'text-emerald-400', bgColor: 'bg-emerald-900/30', borderColor: 'border-emerald-600', label: 'Finishing' },
};

const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  in_progress: { color: 'text-emerald-400', bgColor: 'bg-emerald-950/50', label: 'In Progress' },
  hold: { color: 'text-amber-400', bgColor: 'bg-amber-950/50', label: 'Hold' },
  completed: { color: 'text-blue-400', bgColor: 'bg-blue-950/50', label: 'Completed' },
  rework: { color: 'text-red-400', bgColor: 'bg-red-950/50', label: 'Rework' },
  blocked: { color: 'text-red-400', bgColor: 'bg-red-950/50', label: 'Blocked' },
};

export function ProcessTab({ initialProcessId, initialPartId }: ProcessTabProps) {
  const { user } = useAuth();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [processSummary, setProcessSummary] = useState<ProcessSummary | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [processLoading, setProcessLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['inventory', 'prefabricated', 'moulding', 'finishing']));
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [canStartProcess, setCanStartProcess] = useState(false);
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);

  const [userName] = useState(user?.employeeName || 'System User');
  const [isAddKitDialogOpen, setIsAddKitDialogOpen] = useState(false);
  const [pendingKitType, setPendingKitType] = useState<'KIT' | 'GLASS'>('KIT');

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function fetchProcesses() {
      try {
        const res = await fetch('/api/processes');
        const data = await res.json();
        // Filter out Glass Cutting (code: GLASS-CUT) and Degassing (code: DEGASSING)
        const filtered = data.filter((p: Process) =>
          p.code !== 'GLASS-CUT' && p.code !== 'DEGASSING'
        );
        setProcesses(filtered);

        if (initialProcessId) {
          const proc = filtered.find((p: Process) => p.id === initialProcessId);
          if (proc) {
            setSelectedProcess(proc);
          }
        }
      } catch (error) {
        console.error('Failed to fetch processes:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProcesses();
  }, [initialProcessId]);



  useEffect(() => {
    if (!selectedProcess) {
      setProcessSummary(null);
      setAvailability(null);
      setParts([]);
      return;
    }

    async function fetchProcessDetails() {
      setProcessLoading(true);
      try {
        // Use fetchSafe for all legacy endpoints
        const summaryData = await fetchSafe(`/api/processes/${selectedProcess.id}/summary`, { inProgress: 0, hold: 0, completed: 0 });
        const partsData = await fetchSafe(`/api/processes/${selectedProcess.id}/parts`, []);

        setProcessSummary(summaryData);
        setParts(Array.isArray(partsData) ? partsData : []);

        // Legacy supply-check endpoint (also optional)
        if (selectedProcess.processNumber > 10) {
          const availData = await fetchSafe(`/api/processes/${selectedProcess.id}/supply-check`, null);
          setAvailability(availData);
        } else {
          setAvailability(null);
        }
      } catch (error) {
        console.error('Failed to fetch process details:', error);
        setProcessSummary({ inProgress: 0, hold: 0, completed: 0 });
        setParts([]);
        setAvailability(null);
      } finally {
        setProcessLoading(false);
      }
    }
    fetchProcessDetails();
  }, [selectedProcess]);

  // Effect to handle deep linking to a specific part
  useEffect(() => {
    if (initialPartId && parts.length > 0 && !selectedPart) {
      const partToSelect = parts.find(p => p.id === initialPartId);
      if (partToSelect) {
        setSelectedPart(partToSelect);
      }
    }
  }, [parts, initialPartId]);

  const toggleCategory = (category: string) => {
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

  const categoryOrder = ['inventory', 'prefabricated', 'moulding', 'finishing'];

  const pieData = availability ? [
    { name: 'Available', value: availability.available, color: '#10b981' },
    { name: 'Missing', value: availability.missing, color: '#ef4444' },
    { name: 'QA Hold', value: availability.qaHold, color: '#f59e0b' },
  ] : [];

  /* Derived canStartProcess removed to use state from ProcessReadiness */

  const handleStartProcess = () => {
    setIsStartDialogOpen(true);
  };

  const handleStartSuccess = async (part: any) => {
    // 1. Log success
    console.log(`Started part ${part.partNumber}`);

    // 2. Refresh the parts list so the new part appears in the list below
    if (selectedProcess) {
      try {
        const partsRes = await fetchSafe(`/api/processes/${selectedProcess.id}/parts`, []);
        setParts(Array.isArray(partsRes) ? partsRes : []);

        // 3. Update summary counts if needed
        const summaryData = await fetchSafe(`/api/processes/${selectedProcess.id}/summary`, null);
        if (summaryData) setProcessSummary(summaryData);
      } catch (err) {
        console.error('Failed to refresh data after start:', err);
      }
    }

    // 4. Set the new part as selected to open the ProcessFlowView
    setSelectedPart(part);
  };



  const handleAddKit = (process: Process, kitType: 'KIT' | 'GLASS') => {
    setSelectedProcess(process);
    setPendingKitType(kitType);
    setIsAddKitDialogOpen(true);
  };

  return (
    <div className="flex h-full">
      <div className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-white font-semibold mb-3">Production Processes</h2>
          <div className="text-xs text-slate-400 mb-3">
            Select a process to execute and monitor production activities.
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <ProcessHierarchyView
            processes={processes}
            selectedProcess={selectedProcess}
            onSelectProcess={setSelectedProcess}
            onAddKit={handleAddKit}
            loading={loading}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!selectedProcess ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Icons.Layers className="w-16 h-16 text-slate-600 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Select a Process</h2>
            <p className="text-slate-400 max-w-md">
              Select a process to view execution details, material usage, and current production status.
            </p>
          </div>
        ) : processLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    categoryConfig[selectedProcess.category]?.bgColor,
                    categoryConfig[selectedProcess.category]?.color
                  )}>
                    {categoryConfig[selectedProcess.category]?.label}
                  </span>

                  <span className="text-slate-500 font-mono">Process {selectedProcess.processNumber}</span>
                </div>
                <h1 className="text-2xl font-bold text-white">{selectedProcess.name}</h1>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleStartProcess}
                  disabled={!canStartProcess}
                  className={cn(
                    "flex items-center gap-2",
                    canStartProcess
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-slate-700 cursor-not-allowed"
                  )}
                >
                  {canStartProcess ? (
                    <>
                      <Icons.Play className="w-4 h-4" />
                      Start Process
                    </>
                  ) : (
                    <>
                      <Icons.Lock className="w-4 h-4" />
                      Start Blocked
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Process Readiness - Shows material availability */}
            <ProcessReadiness
              processId={selectedProcess.id}
              onReadinessChange={setCanStartProcess}
            />

            {/* Start Process Dialog */}
            <StartProcessDialog
              isOpen={isStartDialogOpen}
              onClose={() => setIsStartDialogOpen(false)}
              processId={selectedProcess.id}
              processName={selectedProcess.name}
              processCategory={selectedProcess.category}
              employeeId={user?.employeeId || 'UNKNOWN'}
              onSuccess={handleStartSuccess}
            />


            {processSummary && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Icons.ClipboardCheck className="w-5 h-5" />
                  Status Summary
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      const inProgressPart = parts.find(p => p.status === 'active' || p.status === 'in_progress');
                      if (inProgressPart) {
                        setSelectedPart(inProgressPart);
                      }
                    }}
                    disabled={processSummary.inProgress === 0}
                    className={cn(
                      "bg-emerald-950/30 border border-emerald-700/50 rounded-lg p-4 text-center transition-colors",
                      processSummary.inProgress > 0 && "hover:bg-emerald-950/50 cursor-pointer"
                    )}
                  >
                    <Icons.Clock className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{processSummary.inProgress}</div>
                    <div className="text-slate-400 text-sm">In Progress</div>
                  </button>

                  <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-4 text-center">
                    <Icons.AlertCircle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{processSummary.hold}</div>
                    <div className="text-slate-400 text-sm">On Hold</div>
                  </div>

                  <div className="bg-blue-950/30 border border-blue-700/50 rounded-lg p-4 text-center">
                    <Icons.CheckCircle className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{processSummary.completed}</div>
                    <div className="text-slate-400 text-sm">Completed</div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Icons.Box className="w-5 h-5" />
                Current {selectedProcess?.name || 'Parts'} in Progress
              </h3>

              {parts.length === 0 ? (
                <div className="text-center py-8">
                  <Icons.Box className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No {selectedProcess?.name || 'parts'} currently in progress</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {parts.map((part, index) => {
                    const config = statusConfig[part.status] || statusConfig.in_progress;
                    return (
                      <button
                        key={`${part.id}-${index}`}
                        onClick={() => setSelectedPart(part)}
                        className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700 rounded-lg hover:bg-slate-900 transition-colors w-full text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-white font-medium">{part.partNumber}</span>
                          <span className={cn(
                            "px-2 py-1 rounded text-xs",
                            config.bgColor, config.color
                          )}>
                            {config.label}
                          </span>
                          {part.priority === 'critical' && (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">CRITICAL</span>
                          )}
                          {part.priority === 'high' && (
                            <span className="px-2 py-0.5 bg-amber-500 text-black text-xs font-bold rounded">HIGH</span>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          {part.elapsedMinutes !== undefined && part.targetMinutes !== undefined && (
                            <div className="flex items-center gap-2 text-sm">
                              <Icons.Clock className="w-4 h-4 text-slate-500" />
                              <span className={cn(
                                part.elapsedMinutes > part.targetMinutes ? "text-red-400" : "text-slate-300"
                              )}>
                                {part.elapsedMinutes}m / {part.targetMinutes}m
                              </span>
                            </div>
                          )}
                          <Icons.ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>



      {selectedPart && selectedProcess && (
        <div className="fixed inset-0 bg-slate-900 z-50 overflow-auto">
          <ProcessFlowView
            part={selectedPart}
            process={selectedProcess}
            onBack={() => setSelectedPart(null)}
          />
        </div>
      )}

      {/* New Process-Driven Dialogs */}
      {selectedProcess && (
        <ProcessSpecificAddKitDialog
          isOpen={isAddKitDialogOpen}
          onClose={() => setIsAddKitDialogOpen(false)}
          process={{
            id: selectedProcess.id,
            name: selectedProcess.name,
            code: selectedProcess.code,
            processNumber: selectedProcess.processNumber,
          }}
          kitType={pendingKitType}
          userName={userName}
          onSuccess={() => {
            // Refresh inventory counts when kit is created
            setRefreshTrigger(prev => prev + 1);
            // Also refresh readiness panel by forcing a re-render/re-fetch if it depends on external state,
            // but ProcessReadiness fetches on mount/processId change.
            // Since we are adding a kit, we might want to toggle selectedProcess just to trigger reload or accept that user clicks specific process.
            // Actually, adding a kit usually happens for the *selected* process, so we should probably re-select it or rely on the Readiness component's internal poll (if any).
            // For now, triggering the hierarchy refresh is the main request.
          }}
        />
      )}

      {/* Legacy Material Dialogs (kept for backward compatibility) */}

      {selectedProcess && selectedProcess.category === 'inventory' && (
        <MaterialCreationDialog
          isOpen={isMaterialDialogOpen}
          onClose={() => setIsMaterialDialogOpen(false)}
          materialType={
            selectedProcess.processNumber === 10 ? 'KIT' :
              selectedProcess.processNumber === 20 ? 'GLASS' :
                'RESIN'
          }
          buttonLabel={
            selectedProcess.processNumber === 10 ? 'Add KIT' :
              selectedProcess.processNumber === 20 ? 'Add Glass KIT' :
                'Add Resin Lot'
          }
          userName={userName}
        />
      )}


    </div>
  );
}

export default ProcessTab;
