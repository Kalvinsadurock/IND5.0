import { cn } from '@/shared/utils';
import { Box } from 'lucide-react';

interface MouldingCategoryCardProps {
  title: string;
  processCount: number;
  inProgress: number;
  hold: number;
  completed: number;
  onClick: () => void;
}

export function MouldingCategoryCard({
  title,
  processCount,
  inProgress,
  hold,
  completed,
  onClick,
}: MouldingCategoryCardProps) {
  const total = inProgress + hold + completed;
  const progressPercent = total > 0 ? (inProgress / total) * 100 : 0;
  const holdPercent = total > 0 ? (hold / total) * 100 : 0;
  const completedPercent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-slate-800 border-2 rounded-xl p-5 text-left transition-all hover:bg-slate-750 active:scale-[0.98]",
        "border-amber-500/50"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <p className="text-slate-400 text-sm">{processCount} processes</p>
        </div>
        <Box className="w-6 h-6 text-amber-400" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-300">In Progress</span>
            <span className="text-white font-medium">{inProgress}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-300">Hold</span>
            <span className="text-white font-medium">{hold}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-slate-300">Done</span>
            <span className="text-white font-medium">{completed}</span>
          </div>
        </div>

        <div className="h-2 bg-slate-700 rounded-full overflow-hidden flex">
          {progressPercent > 0 && (
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${progressPercent}%` }}
            />
          )}
          {holdPercent > 0 && (
            <div
              className="bg-amber-500 h-full"
              style={{ width: `${holdPercent}%` }}
            />
          )}
          {completedPercent > 0 && (
            <div
              className="bg-blue-500 h-full"
              style={{ width: `${completedPercent}%` }}
            />
          )}
        </div>

      </div>
    </button>
  );
}
