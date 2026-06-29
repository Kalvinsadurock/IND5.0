import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, Eye, Upload, FileText, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/utils';
import { Button } from '@/shared/ui/button';
import { CheckpointPhotoUploadDialog } from './CheckpointPhotoUploadDialog';
import { supabase } from '@/shared/api/supabase';
import { useAuth } from '@/lib/AuthContext';

const getFileUrl = (path: string) => {
  if (!path) return '';
  const { data } = supabase.storage.from('checkpoint-photos').getPublicUrl(path);
  return data.publicUrl;
};

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

interface Checkpoint {
  id: number;
  name: string;
  specification: string;
  tolerance: string | null;
  method: string;
  verifiedBy: string;
  requiresQaValidation?: boolean; // Optional for backward compatibility
  isGatingPoint: boolean;
}

interface CheckpointResult {
  id: number;
  checkpointId: number;
  status: string;
  qaResult: string | null;
  qaConfirmedAt: string | null;
  qaConfirmedBy: string | null;
  evidenceFiles: EvidenceFile[];
  checkpoint: Checkpoint | null;
}

interface EvidenceFile {
  id: number;
  fileName: string;
  fileType: string;
  storageKey: string;
  uploadedBy?: string; // Employee name who uploaded
  uploadedAt?: string; // Upload timestamp
}

interface Part {
  id: number;
  partNumber: string;
}

interface Process {
  id: number;
  name: string;
  processNumber: number;
}

interface StepDetailDialogProps {
  step: ProcessStep;
  part: Part;
  process: Process;
  instance: StepInstance | null;
  onClose: () => void;
  onStepComplete?: () => void;
}

export function StepDetailDialog({ step, part, process, instance, onClose, onStepComplete }: StepDetailDialogProps) {
  const { user } = useAuth();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [checkpointResults, setCheckpointResults] = useState<CheckpointResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepStarted, setStepStarted] = useState(!!instance?.startedAt);
  const [localStatus, setLocalStatus] = useState<string>(instance?.status || 'not_started');
  const [startDateTime, setStartDateTime] = useState<string>(
    instance?.startedAt ? new Date(instance.startedAt).toLocaleString() : ''
  );
  const [uploadingCheckpointId, setUploadingCheckpointId] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timers, setTimers] = useState({
    elapsed: '00:00',
    target: '00:00',
    remaining: '00:00',
    total: '00:00'
  });

  const handleStartStep = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/step-instances/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partId: part.id, stepId: step.id })
      });

      if (!res.ok) throw new Error('Failed to start step');

      // Update UI state immediately
      const now = new Date();
      setStepStarted(true);
      setLocalStatus('in_progress');
      setStartDateTime(now.toISOString());
      setElapsedSeconds(0);

      // Refresh results to get the newly created result rows (needed for uploads)
      const resultsRes = await fetch(`/api/parts/${part.id}/steps/${step.id}/checkpoint-results`);
      if (resultsRes.ok) {
        setCheckpointResults(await resultsRes.json());
      }
    } catch (error) {
      console.error('Failed to start step:', error);
      alert('Failed to start step operation');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStep = async () => {
    if (!instance) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/step-instances/${instance.id}/complete`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to complete step');
        return;
      }

      const updatedInstance = await res.json();
      setStepStarted(false);
      // Update local state to reflect completion
      if (updatedInstance.endedAt) {
        // Lock timers
        const started = new Date(updatedInstance.startedAt);
        const ended = new Date(updatedInstance.endedAt);
        const elapsedMins = Math.floor((ended.getTime() - started.getTime()) / (1000 * 60));
        const elapsedSecs = Math.floor((ended.getTime() - started.getTime()) / 1000);

        setTimers({
          elapsed: formatTime(elapsedMins),
          target: timers.target,
          remaining: '00:00',
          total: formatTime(elapsedMins)
        });
        setElapsedSeconds(elapsedSecs);
      }

      if (onStepComplete) {
        onStepComplete();
      }

      // Sync completed parts count to OEE dashboard in background
      if (user?.auth_user_id) {
        const syncOee = async () => {
          try {
            const { supabase } = await import('@/shared/api/supabase');
            const { data: shifts } = await supabase
              .from('shifts')
              .select('id')
              .eq('operator_id', user.auth_user_id)
              .eq('status', 'active')
              .limit(1);

            if (shifts && shifts.length > 0) {
              const activeShiftId = shifts[0].id;
              const { data: logs } = await supabase
                .from('production_logs')
                .select('*')
                .eq('shift_id', activeShiftId)
                .limit(1);

              if (logs && logs.length > 0) {
                await supabase
                  .from('production_logs')
                  .update({
                    total_parts: (logs[0].total_parts || 0) + 1
                  })
                  .eq('id', logs[0].id);
              } else {
                const { data: activeShiftDetails } = await supabase
                  .from('shifts')
                  .select('machine_id')
                  .eq('id', activeShiftId)
                  .single();
                  
                if (activeShiftDetails) {
                  await supabase
                    .from('production_logs')
                    .insert({
                      shift_id: activeShiftId,
                      machine_id: activeShiftDetails.machine_id,
                      total_parts: 1,
                      reject_parts: 0,
                      logged_by: user.auth_user_id
                    });
                }
              }
            }
          } catch (err) {
            console.error('Failed to sync OEE production count:', err);
          }
        };
        syncOee();
      }

      onClose();
    } catch (error) {
      console.error('Failed to complete step:', error);
      alert('Error completing step');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCheckpoint = async (checkpointId: number) => {
    const result = resultsMap.get(checkpointId);
    if (!result) return;

    try {
      const response = await fetch(`/api/checkpoints/${result.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qaConfirmedById: 'Current User' }) // Ideally valid user ID
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to confirm checkpoint');
        return;
      }

      // Refresh data
      const resultsRes = await fetch(`/api/parts/${part.id}/steps/${step.id}/checkpoint-results`);
      if (resultsRes.ok) {
        setCheckpointResults(await resultsRes.json());
      }
    } catch (error) {
      console.error('Failed to confirm checkpoint:', error);
      alert('Error validating checkpoint');
    }
  };

  const handleUploadSuccess = async (publicUrl: string) => {
    setUploadingCheckpointId(null);
    // Refresh data
    try {
      const resultsRes = await fetch(`/api/parts/${part.id}/steps/${step.id}/checkpoint-results`);
      if (resultsRes.ok) {
        setCheckpointResults(await resultsRes.json());
      }
    } catch (error) {
      console.error('Failed to refresh results:', error);
    }
  };

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const formatSeconds = (totalSeconds: number) => {
    const isNegative = totalSeconds < 0;
    const absSeconds = Math.abs(totalSeconds);
    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = absSeconds % 60;
    return `${isNegative ? '-' : ''}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer effect - source of truth is startedAt
  useEffect(() => {
    if (!stepStarted || !startDateTime || instance?.status === 'completed') return;

    const targetMinutes = step.targetCycleTime || 30; // Default 30 mins
    const targetSeconds = (targetMinutes * 60) + 60; // Add 60s buffer or just exact? specific requirement: "remaining time wll go to minus if its reached target time"

    const updateTimer = () => {
      const now = new Date();
      const start = new Date(startDateTime);
      const diffSeconds = Math.floor((now.getTime() - start.getTime()) / 1000); // Elapsed is always positive ideally, but ensure calc is right

      setElapsedSeconds(diffSeconds);

      // Remaining = Target - Elapsed. Can be negative.
      const remainingSeconds = (step.targetCycleTime || 30) * 60 - diffSeconds;

      setTimers({
        elapsed: formatSeconds(diffSeconds < 0 ? 0 : diffSeconds), // Elapsed shouldn't be negative normally
        target: formatTime(targetMinutes),
        remaining: formatSeconds(remainingSeconds),
        total: '00:00'
      });
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [stepStarted, startDateTime, step.targetCycleTime, instance?.status]);



  useEffect(() => {
    async function fetchData() {
      try {
        const [checkpointsRes, resultsRes] = await Promise.all([
          fetch(`/api/steps/${step.id}/checkpoints`),
          fetch(`/api/parts/${part.id}/steps/${step.id}/checkpoint-results`)
        ]);

        if (checkpointsRes.ok) {
          const checkpointsData = await checkpointsRes.json();
          setCheckpoints(checkpointsData);
        }

        if (resultsRes.ok) {
          const resultsData: CheckpointResult[] = await resultsRes.json();
          setCheckpointResults(resultsData);
        }
      } catch (error) {
        console.error('Failed to fetch step details:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [step.id, part.id]);

  useEffect(() => {
    if (instance) {
      if (instance.status === 'completed' && instance.startedAt && instance.endedAt) {
        // Completed state: static calculation
        const start = new Date(instance.startedAt);
        const end = new Date(instance.endedAt);
        const diffSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
        // const diffMins = Math.floor(diffSeconds / 60); // Not used?

        const targetMinutes = step.targetCycleTime || 30;
        const remainingSeconds = (targetMinutes * 60) - diffSeconds;

        setTimers({
          elapsed: formatSeconds(diffSeconds),
          target: formatTime(targetMinutes),
          remaining: formatSeconds(remainingSeconds), // Show actual final remaining (can be negative)
          total: formatSeconds(diffSeconds) // Show detailed total
        });
      } else if (instance.startedAt) {
        // Resuming in-progress state
        setStartDateTime(instance.startedAt);
        setStepStarted(true);
      }
    }
  }, [instance, step.targetCycleTime]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Count ALL checkpoints for completion tracking (not just QA)
  const totalCheckpoints = checkpoints.length;

  // A checkpoint is considered "completed" if:
  // - For QA checkpoints: has evidence AND is confirmed (qaResult = pass/conditional_pass)
  // - For Prod checkpoints: has evidence uploaded
  const completedCount = checkpoints.filter(cp => {
    const result = checkpointResults.find(r => r.checkpointId === cp.id);
    const isQaCheckpoint = cp.verifiedBy === 'QA' || cp.verifiedBy === 'prod/QA' || cp.requiresQaValidation === true;

    if (isQaCheckpoint) {
      // QA checkpoints need confirmation
      return result?.qaResult === 'pass' || result?.qaResult === 'conditional_pass';
    } else {
      // Prod checkpoints just need evidence
      return result?.evidenceFiles && result.evidenceFiles.length > 0;
    }
  }).length;

  const confirmedCount = checkpointResults.filter(r => r.qaResult === 'pass' || r.qaResult === 'conditional_pass').length;
  const resultsMap = new Map(checkpointResults.map(r => [r.checkpointId, r]));
  const allEvidenceFiles = checkpointResults.flatMap(r => r.evidenceFiles || []);

  const getStepStatusText = () => {
    // If we have a local status (e.g. from just starting), use that for immediate feedback
    // but prefer 'completed' from instance if set (as that's final)
    if (instance?.status === 'completed') {
      return instance.notes ? `Completed - ${instance.notes}` : 'Completed';
    }

    // Use local status for active/not_started states to ensure UI updates immediately
    const rawStatus = localStatus || instance?.status || 'not_started';
    const formatted = rawStatus.replace(/_/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 overflow-y-auto">
      <div className="bg-slate-800 w-full max-w-4xl my-4 mx-4 rounded-xl shadow-2xl">
        <div className="bg-slate-900 rounded-t-xl p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-800 rounded-lg px-4 py-3 text-center min-w-[80px]">
                <div className="text-2xl font-mono text-white font-bold">{timers.elapsed}</div>
                <div className="text-xs text-slate-400">Elapsed</div>
              </div>
              <div className="bg-slate-800 rounded-lg px-4 py-3 text-center min-w-[80px]">
                <div className="text-2xl font-mono text-white font-bold">{timers.target}</div>
                <div className="text-xs text-slate-400">Target</div>
              </div>
              <div className="bg-slate-800 rounded-lg px-4 py-3 text-center min-w-[80px]">
                <div className="text-2xl font-mono text-white font-bold">{timers.remaining}</div>
                <div className="text-xs text-slate-400">Remaining</div>
              </div>
              <div className="bg-slate-800 rounded-lg px-4 py-3 text-center min-w-[80px]">
                <div className="text-2xl font-mono text-white font-bold">{timers.total}</div>
                <div className="text-xs text-slate-400">Total</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <span>Status</span>
              </div>
              <div className="text-white font-medium text-lg">{getStepStatusText()}</div>
              {startDateTime && (
                <div className="text-xs text-slate-400 mt-2">
                  Started: {startDateTime}
                </div>
              )}

            </div>
            {!stepStarted && (
              <button
                onClick={handleStartStep}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <span className="text-lg">?</span> START
              </button>
            )}
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    Control Plan Checkpoints
                  </h3>
                  <span className="text-slate-400 text-sm">{completedCount}/{totalCheckpoints} Confirmed</span>
                </div>

                {checkpoints.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 bg-slate-900/50 rounded-lg">
                    No control checkpoints defined for this step
                  </div>
                ) : (
                  <div className="space-y-4">
                    {checkpoints.map(checkpoint => {
                      const result = resultsMap.get(checkpoint.id);
                      const isConfirmed = result?.qaResult === 'pass' || result?.qaResult === 'conditional_pass';
                      const isFailed = result?.qaResult === 'fail';
                      const isCurrentCheckpoint = !isConfirmed && !isFailed;
                      const isQaCheckpoint = checkpoint.verifiedBy === 'QA' || checkpoint.verifiedBy === 'prod/QA' || checkpoint.requiresQaValidation === true;

                      // Check if this checkpoint is completed
                      const isCompleted = isQaCheckpoint
                        ? (result?.qaResult === 'pass' || result?.qaResult === 'conditional_pass')
                        : (result?.evidenceFiles && result.evidenceFiles.length > 0);

                      // Sequential logic: Enable upload only if previous checkpoint is completed
                      const checkpointIndex = checkpoints.findIndex(cp => cp.id === checkpoint.id);
                      const previousCheckpoint = checkpointIndex > 0 ? checkpoints[checkpointIndex - 1] : null;
                      const previousResult = previousCheckpoint ? resultsMap.get(previousCheckpoint.id) : null;
                      const isPreviousQa = previousCheckpoint ? (previousCheckpoint.verifiedBy === 'QA' || previousCheckpoint.verifiedBy === 'prod/QA') : false;

                      const isPreviousCompleted = !previousCheckpoint || (
                        isPreviousQa
                          ? (previousResult?.qaResult === 'pass' || previousResult?.qaResult === 'conditional_pass')
                          : (previousResult?.evidenceFiles && previousResult.evidenceFiles.length > 0)
                      );

                      const canUpload = isPreviousCompleted && !isCompleted;

                      return (
                        <div
                          key={checkpoint.id}
                          className={cn(
                            "bg-slate-900/50 border rounded-lg p-4 transition-opacity",
                            isConfirmed ? "border-emerald-700/50 opacity-75" : "border-slate-700"
                          )}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-white font-semibold">{checkpoint.name}</h4>
                            <div className="flex items-center gap-2">
                              {/* Status Chips */}
                              {isConfirmed ? (
                                <span className="px-3 py-1 bg-emerald-900/50 text-emerald-400 text-xs rounded-full flex items-center gap-1 border border-emerald-700/50">
                                  <CheckCircle className="w-3 h-3" />
                                  Confirmed
                                </span>
                              ) : result?.evidenceFiles && result.evidenceFiles.length > 0 ? (
                                isQaCheckpoint ? (
                                  <span className="px-3 py-1 bg-blue-900/50 text-blue-400 text-xs rounded-full flex items-center gap-1 border border-blue-700/50">
                                    <Clock className="w-3 h-3" />
                                    Awaiting Validation
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 bg-emerald-900/50 text-emerald-400 text-xs rounded-full flex items-center gap-1 border border-emerald-700/50">
                                    <CheckCircle className="w-3 h-3" />
                                    Completed
                                  </span>
                                )
                              ) : (
                                <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full border border-slate-600">
                                  Pending Upload
                                </span>
                              )}

                              {/* Upload Button - Available for ALL checkpoints (sequential) */}
                              {canUpload && (
                                <Button
                                  onClick={() => setUploadingCheckpointId(checkpoint.id)}
                                  disabled={localStatus === 'completed'}
                                  variant="secondary"
                                  size="sm"
                                  className="text-xs h-7 px-3 bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
                                >
                                  <Upload className="w-3 h-3 mr-1" />
                                  Upload Evidence
                                </Button>
                              )}

                              {/* Confirm Button - Only for QA/prod+QA checkpoints with evidence */}
                              {!isConfirmed && isQaCheckpoint && result?.evidenceFiles && result.evidenceFiles.length > 0 && (
                                <Button
                                  onClick={() => handleConfirmCheckpoint(checkpoint.id)}
                                  disabled={localStatus === 'completed'}
                                  size="sm"
                                  className="text-xs h-7 px-3 bg-emerald-600 hover:bg-emerald-700"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Confirm
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Employee & Timestamp Information */}
                          {
                            result?.evidenceFiles && result.evidenceFiles.length > 0 && (
                              <div className="mt-3 space-y-1 text-xs text-slate-400">
                                {/* Show upload info if available */}
                                {result.evidenceFiles[0].uploadedBy && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Uploaded by:</span>
                                    <span className="text-slate-300">{result.evidenceFiles[0].uploadedBy}</span>
                                    {result.evidenceFiles[0].uploadedAt && (
                                      <span className="text-slate-500">• {new Date(result.evidenceFiles[0].uploadedAt).toLocaleString()}</span>
                                    )}
                                  </div>
                                )}

                                {/* Show QA confirmation info for QA checkpoints */}
                                {isQaCheckpoint && result.qaConfirmedBy && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Confirmed by:</span>
                                    <span className="text-emerald-400">{result.qaConfirmedBy}</span>
                                    {result.qaConfirmedAt && (
                                      <span className="text-slate-500">• {new Date(result.qaConfirmedAt).toLocaleString()}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          }

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-slate-500">Spec:</span>
                              <span className="text-slate-200 ml-2">{checkpoint.specification}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Tolerance:</span>
                              <span className="text-slate-200 ml-2">{checkpoint.tolerance || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Method:</span>
                              <span className="text-slate-200 ml-2">{checkpoint.method}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">By:</span>
                              <span className="text-slate-200 ml-2">{checkpoint.verifiedBy}</span>
                            </div>
                          </div>

                          {
                            isConfirmed && result?.qaConfirmedAt && (
                              <div className="mt-3 text-xs text-emerald-400">
                                Confirmed by {result.qaConfirmedBy || 'QA Inspector'} at {new Date(result.qaConfirmedAt).toLocaleDateString()} {new Date(result.qaConfirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )
                          }

                          {
                            result?.evidenceFiles && result.evidenceFiles.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {result.evidenceFiles.map(file => (
                                  <button
                                    key={file.id}
                                    onClick={() => window.open(getFileUrl(file.storageKey), '_blank')}
                                    className="flex items-center gap-1 bg-slate-800 border border-slate-600 rounded overflow-hidden hover:border-slate-500 transition-colors group"
                                    title={file.fileName}
                                  >
                                    {file.fileType?.includes('image') ? (
                                      <div className="w-8 h-8 relative">
                                        <img
                                          src={getFileUrl(file.storageKey)}
                                          alt={file.fileName}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-8 h-8 flex items-center justify-center bg-slate-700">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )
                          }
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Attached Documents & Photos
                </h3>

                <div className="flex flex-wrap gap-3">
                  {allEvidenceFiles.length === 0 ? (
                    <div className="text-slate-400 text-sm">No documents attached yet</div>
                  ) : (
                    allEvidenceFiles.map(file => (
                      <button
                        key={file.id}
                        onClick={() => window.open(getFileUrl(file.storageKey), '_blank')}
                        className="flex items-center gap-2 pr-3 bg-slate-900/50 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors overflow-hidden group"
                      >
                        {file.fileType?.includes('image') ? (
                          <div className="w-10 h-10 relative">
                            <img
                              src={getFileUrl(file.storageKey)}
                              alt={file.fileName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center bg-slate-800">
                            <FileText className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <span className="text-slate-200 text-sm truncate max-w-[150px]">{file.fileName}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-900/50 rounded-b-xl flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-600 hover:border-slate-500 hover:bg-slate-800 text-slate-300 hover:text-white transition-all duration-200 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Close
          </Button>
          {instance?.status !== 'completed' && (
            <div className="flex items-center gap-2">
              {completedCount < totalCheckpoints && (
                <span className="text-xs text-amber-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Complete all checkpoints first
                </span>
              )}
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCompleteStep}
                disabled={completedCount < totalCheckpoints}
              >
                Complete Step
              </Button>
            </div>
          )}
        </div>
      </div>

      {
        uploadingCheckpointId && (() => {
          const cp = checkpoints.find(c => c.id === uploadingCheckpointId);
          const res = resultsMap.get(uploadingCheckpointId);
          if (cp && res) {
            return (
              <CheckpointPhotoUploadDialog
                isOpen={true}
                onClose={() => setUploadingCheckpointId(null)}
                resultId={res.id}
                checkpointName={cp.name}
                stepName={step.name}
                onUploadComplete={handleUploadSuccess}
              />
            );
          }
          return null;
        })()
      }
    </div >
  );
}
