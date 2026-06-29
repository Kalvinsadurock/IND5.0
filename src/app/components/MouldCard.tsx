import { Users, Clock, CheckCircle, CircleX, Pause, Activity } from 'lucide-react';
import { Progress } from '@/shared/ui/progress';

interface MouldCardProps {
  id: string;
  name: string;
  currentStep: string;
  stepNumber: number;
  totalSteps: number;
  elapsedTime: number; // in minutes
  targetTime: number; // in minutes
  status: 'running' | 'paused' | 'complete' | 'error';
  crewCount: number;
  progress: number; // 0-100
}

export function MouldCard({
  id,
  name,
  currentStep,
  stepNumber,
  totalSteps,
  elapsedTime,
  targetTime,
  status,
  crewCount,
  progress,
}: MouldCardProps) {
  const statusConfig = {
    running: {
      color: 'bg-emerald-500',
      icon: Activity,
      label: 'Running',
      borderColor: 'border-emerald-600',
      bgColor: 'bg-emerald-950/30',
    },
    paused: {
      color: 'bg-amber-500',
      icon: Pause,
      label: 'Paused',
      borderColor: 'border-amber-600',
      bgColor: 'bg-amber-950/30',
    },
    complete: {
      color: 'bg-blue-500',
      icon: CheckCircle,
      label: 'Complete',
      borderColor: 'border-blue-600',
      bgColor: 'bg-blue-950/30',
    },
    error: {
      color: 'bg-red-500',
      icon: CircleX,
      label: 'Error',
      borderColor: 'border-red-600',
      bgColor: 'bg-red-950/30',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const isOvertime = elapsedTime > targetTime;

  return (
    <div
      className={`rounded-xl border-2 ${config.borderColor} ${config.bgColor} p-6 backdrop-blur-sm`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-slate-100 mb-1">{name}</h3>
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${config.color.replace('bg-', 'text-')}`} />
            <span className="text-slate-400">{config.label}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-slate-400 mb-1">Step {stepNumber}/{totalSteps}</div>
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4" />
            <span>{crewCount} crew</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-slate-300">{currentStep}</span>
          <span className="text-slate-400">{progress}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Time Tracking */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Clock className="w-4 h-4" />
            <span>Elapsed</span>
          </div>
          <div className={`${isOvertime ? 'text-red-400' : 'text-slate-100'}`}>
            {Math.floor(elapsedTime / 60)}h {elapsedTime % 60}m
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Clock className="w-4 h-4" />
            <span>Target</span>
          </div>
          <div className="text-slate-100">
            {Math.floor(targetTime / 60)}h {targetTime % 60}m
          </div>
        </div>
      </div>
    </div>
  );
}
