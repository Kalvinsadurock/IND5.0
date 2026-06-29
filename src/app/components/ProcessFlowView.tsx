import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Clock, Lock, Eye, X, ArrowRight, User, Activity } from '@/shared/ui/icons';
import { cn } from '@/shared/utils';
import { StepDetailDialog } from '@/features/execution/components/RunningStepDialog';

interface ProcessStep {
  id: number;
  stepNumber: string;
  name: string;
  sequence: number;
  targetCycleTime: number;
  requiresQA: boolean;
}

interface StepInstance {
  id: number;
  stepId: number;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  elapsedMinutes: number;
  notes: string | null;
}

interface Part {
  id: number;
  partNumber: string;
  status: string;
  priority?: string;
  processId?: number;
  currentStepId?: number | null;
}

interface Process {
  id: number;
  processNumber: number;
  name: string;
  category: string;
}

interface ProcessFlowViewProps {
  part: Part;
  process: Process;
  onBack: () => void;
}

interface PartContext {
  createdBy: string;
  createdAt: string;
  currentStepNumber: string;
  currentStepName: string;
}

interface TimeMetrics {
  elapsedMinutes: number;
  targetMinutes: number;
  remainingMinutes: number;
  completionEta: string;
  progressPercent: number;
}

export function ProcessFlowView({ part, process, onBack }: ProcessFlowViewProps) {
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [instances, setInstances] = useState<Map<number, StepInstance>>(new Map());
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [partContext, setPartContext] = useState<PartContext | null>(null);
  const [timeMetrics, setTimeMetrics] = useState<TimeMetrics | null>(null);

  useEffect(() => {
    setLoading(true);
    setSteps([]);
    setInstances(new Map());

    async function fetchData() {
      try {
        const [stepsRes, instancesRes] = await Promise.all([
          fetch(`/api/processes/${process.id}/steps`),
          fetch(`/api/parts/${part.id}/step-instances`)
        ]);

        const stepsData: ProcessStep[] = await stepsRes.json();
        const instancesData: StepInstance[] = await instancesRes.json();

        setSteps(stepsData.sort((a, b) => a.sequence - b.sequence));

        const instanceMap = new Map<number, StepInstance>();
        instancesData.forEach(inst => instanceMap.set(inst.stepId, inst));
        setInstances(instanceMap);

        // Calculate Part Context
        const inProgressInstance = instancesData.find(inst => inst.status === 'in_progress');
        const currentStep = inProgressInstance ? stepsData.find(s => s.id === inProgressInstance.stepId) : null;

        // Determine actual status
        let statusText = 'Not Started';
        let statusStepInfo = '';

        if (inProgressInstance && currentStep) {
          statusText = 'In Progress';
          statusStepInfo = `${currentStep.stepNumber} – ${currentStep.name}`;
        } else if (instancesData.some(inst => inst.status === 'completed')) {
          const completedCount = instancesData.filter(inst => inst.status === 'completed').length;
          if (completedCount === stepsData.length) {
            statusText = 'Completed';
          } else {
            statusText = `In Progress (${completedCount}/${stepsData.length} steps)`;
          }
        }

        setPartContext({
          createdBy: 'Loading...', // Will be fetched from auth
          createdAt: new Date().toISOString(),
          currentStepNumber: currentStep?.stepNumber || '',
          currentStepName: currentStep?.name || statusText
        });

        // Fetch employee info from auth
        try {
          const authRes = await fetch('/api/auth/me');
          if (authRes.ok) {
            const authData = await authRes.json();
            setPartContext(prev => prev ? { ...prev, createdBy: authData.name || authData.email || 'Unknown' } : null);
          }
        } catch (err) {
          console.error('Failed to fetch auth user:', err);
        }

        // Calculate Time Metrics
        const completedInstances = instancesData.filter(inst => inst.status === 'completed');
        const startedInstances = instancesData.filter(inst => inst.startedAt);
        const firstStartTime = startedInstances.length > 0
          ? Math.min(...startedInstances.map(inst => new Date(inst.startedAt!).getTime()))
          : Date.now();

        const elapsedMs = Date.now() - firstStartTime;
        const elapsedMinutes = Math.floor(elapsedMs / 60000);
        const targetMinutes = stepsData.reduce((sum, step) => sum + step.targetCycleTime, 0);
        const remainingMinutes = Math.max(0, targetMinutes - elapsedMinutes);

        // Progress based on completed steps
        const progressPercent = stepsData.length > 0 ? (completedInstances.length / stepsData.length) * 100 : 0;

        // Total time is sum of target times, not ETA
        const totalTime = targetMinutes;

        setTimeMetrics({
          elapsedMinutes,
          targetMinutes,
          remainingMinutes,
          completionEta: `${Math.floor(totalTime / 60)}h ${totalTime % 60}m`, // Show total time instead of ETA
          progressPercent
        });
      } catch (error) {
        console.error('Failed to fetch process flow data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [process.id, part.id]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onBack]);

  const getStepStatus = (step: ProcessStep, stepIndex: number): 'completed' | 'in_progress' | 'upcoming' => {
    const instance = instances.get(step.id);

    // 1. Completed is always completed
    if (instance?.status === 'completed') return 'completed';

    // 2. Already started (active, paused, waiting, blocked, etc) is always in_progress
    // We treat 'planned' as 'not started' for the purpose of this check, 
    // unless it's the first step or previous is done (handled below).
    if (instance && ['active', 'paused', 'waiting', 'in_progress', 'blocked', 'breakdown', 'rework'].includes(instance.status)) {
      return 'in_progress';
    }

    // 3. First step is always startable (unless completed, handled above)
    if (stepIndex === 0) {
      return 'in_progress';
    }

    // 4. Checking dependency on previous step
    const prevStep = steps[stepIndex - 1];
    if (prevStep) {
      const prevInstance = instances.get(prevStep.id);
      if (prevInstance?.status === 'completed') {
        // If previous step is done, this step is runnable
        return 'in_progress';
      }
    }

    // 5. Default to locked
    return 'upcoming';
  };

  const statusConfig = {
    completed: {
      bg: 'bg-emerald-600',
      border: 'border-emerald-500',
      text: 'text-white',
      hoverBg: 'hover:bg-emerald-700'
    },
    in_progress: {
      bg: 'bg-amber-500',
      border: 'border-amber-400',
      text: 'text-white',
      hoverBg: 'hover:bg-amber-600'
    },
    upcoming: {
      bg: 'bg-slate-700',
      border: 'border-slate-600',
      text: 'text-slate-300',
      hoverBg: 'hover:bg-slate-600'
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const topRowSteps = steps.slice(0, 8);
  const bottomRowSteps = steps.slice(8).reverse();

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to {process.name}
          </button>
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="bg-gradient-to-r from-cyan-800 to-cyan-700 rounded-lg overflow-hidden">
          <div className="p-2 text-center">
            <h2 className="text-lg font-bold text-white mb-0.5">
              {process.name.toUpperCase()} - PROCESS FLOW
            </h2>
            <div className="text-cyan-100 text-sm">
              PART NO. {part.partNumber}
            </div>
          </div>
        </div>

        {/* Part Context Header */}
        {partContext && (
          <div className="mt-2 bg-slate-800 border border-slate-700 rounded-lg p-2">
            <h3 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              PART CONTEXT
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-slate-500 text-[10px] mb-0.5">Part No</div>
                <div className="text-white font-mono text-xs">{part.partNumber}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px] mb-0.5">Process</div>
                <div className="text-white text-xs">{process.name}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px] mb-0.5">Created By</div>
                <div className="text-white flex items-center gap-1 text-xs">
                  <User className="w-3 h-3" />
                  {partContext.createdBy}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">Created On</div>
                <div className="text-white flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(partContext.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <div className="md:col-span-1">
                <div className="text-slate-500 text-[10px] mb-0.5">Current Status</div>
                <div className="text-amber-400 font-medium text-xs col-span-2">
                  {partContext.currentStepNumber
                    ? `In Progress (${partContext.currentStepNumber} – ${partContext.currentStepName})`
                    : partContext.currentStepName
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Time Intelligence Bar */}
        {timeMetrics && (
          <div className="mt-2 bg-slate-800 border border-slate-700 rounded-lg p-2">
            <h3 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              TIME PERFORMANCE
            </h3>
            <div className="grid grid-cols-4 gap-2 text-xs mb-2">
              <div>
                <div className="text-slate-500 text-[10px] mb-0.5">Elapsed Time</div>
                <div className="text-white font-mono text-xs">
                  {Math.floor(timeMetrics.elapsedMinutes / 60)}h {timeMetrics.elapsedMinutes % 60}m
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px] mb-0.5">Target Time</div>
                <div className="text-white font-mono text-xs">
                  {Math.floor(timeMetrics.targetMinutes / 60)}h {timeMetrics.targetMinutes % 60}m
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px] mb-0.5">Remaining Time</div>
                <div className={cn(
                  "font-mono text-xs",
                  timeMetrics.remainingMinutes > 0 ? "text-emerald-400" : "text-red-400"
                )}>
                  {timeMetrics.remainingMinutes > 0
                    ? `${Math.floor(timeMetrics.remainingMinutes / 60)}h ${timeMetrics.remainingMinutes % 60}m`
                    : "Overdue"
                  }
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px] mb-0.5">Total Time</div>
                <div className="text-white font-mono text-xs">{timeMetrics.completionEta}</div>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Progress</span>
                <span className={cn(
                  "font-mono",
                  timeMetrics.progressPercent < 80 ? "text-emerald-400" :
                    timeMetrics.progressPercent < 100 ? "text-amber-400" : "text-red-400"
                )}>{Math.round(timeMetrics.progressPercent)}%</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    timeMetrics.progressPercent < 80 ? "bg-emerald-500" :
                      timeMetrics.progressPercent < 100 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(100, timeMetrics.progressPercent)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-3">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-600" />
            <span className="text-slate-300 text-sm">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500" />
            <span className="text-slate-300 text-sm">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-700 border border-slate-600" />
            <span className="text-slate-300 text-sm">Upcoming (Locked)</span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 min-h-[240px] flex flex-col justify-center">
          <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
            {topRowSteps.map((step, i) => {
              const stepIndex = steps.findIndex(s => s.id === step.id);
              const status = getStepStatus(step, stepIndex);
              const config = statusConfig[status];
              const instance = instances.get(step.id);

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => setSelectedStep(step)}
                    disabled={status === 'upcoming'}
                    className={cn(
                      "relative px-3 py-2 rounded-lg min-w-[90px] transition-all shadow-md hover:shadow-lg",
                      config.bg, config.border, "border",
                      status !== 'upcoming' && config.hoverBg,
                      status === 'upcoming' && "cursor-not-allowed opacity-75"
                    )}
                  >
                    {status === 'upcoming' && (
                      <div className="absolute -top-1 -right-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </div>
                    )}
                    <div className={cn("text-xs font-mono font-bold mb-0.5", config.text)}>{step.stepNumber}</div>
                    <div className={cn("text-[10px] leading-tight max-w-[85px]", config.text)}>{step.name}</div>
                  </button>
                  {i < topRowSteps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-slate-500 mx-1 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {bottomRowSteps.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {bottomRowSteps.map((step, i) => {
                const stepIndex = steps.findIndex(s => s.id === step.id);
                const status = getStepStatus(step, stepIndex);
                const config = statusConfig[status];

                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => setSelectedStep(step)}
                      disabled={status === 'upcoming'}
                      className={cn(
                        "relative px-3 py-2 rounded-lg min-w-[90px] transition-all shadow-md hover:shadow-lg",
                        config.bg, config.border, "border",
                        status !== 'upcoming' && config.hoverBg,
                        status === 'upcoming' && "cursor-not-allowed opacity-75"
                      )}
                    >
                      {status === 'upcoming' && (
                        <div className="absolute -top-1 -right-1">
                          <Lock className="w-3 h-3 text-slate-400" />
                        </div>
                      )}
                      <div className={cn("text-xs font-mono font-bold mb-0.5", config.text)}>{step.stepNumber}</div>
                      <div className={cn("text-[10px] leading-tight max-w-[85px]", config.text)}>{step.name}</div>
                    </button>
                    {i < bottomRowSteps.length - 1 && (
                      <ChevronLeft className="w-4 h-4 text-slate-500 mx-1 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedStep && (
        <StepDetailDialog
          step={selectedStep}
          part={part}
          process={process}
          instance={instances.get(selectedStep.id) || null}
          onClose={() => setSelectedStep(null)}
          onStepComplete={() => {
            // Trigger data refresh without full reload
            // Re-fetch data using the same logic as initial load
            const fetchData = async () => {
              try {
                setLoading(true);
                const [stepsRes, instancesRes] = await Promise.all([
                  fetch(`/api/processes/${process.id}/steps`),
                  fetch(`/api/parts/${part.id}/step-instances`)
                ]);

                const stepsData: ProcessStep[] = await stepsRes.json();
                const instancesData: StepInstance[] = await instancesRes.json();

                setSteps(stepsData.sort((a, b) => a.sequence - b.sequence));

                const instanceMap = new Map<number, StepInstance>();
                instancesData.forEach(inst => instanceMap.set(inst.stepId, inst));
                setInstances(instanceMap);
              } catch (error) {
                console.error('Failed to refresh process flow data:', error);
              } finally {
                setLoading(false);
              }
            };
            fetchData();
          }}
        />
      )}
    </div>
  );
}
