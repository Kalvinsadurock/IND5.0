import { TrendingUp, Activity, CheckCircle, Target } from 'lucide-react';

interface KPITrackerProps {
  totalTarget: { sets: number; blades: number };
  completedBlades: number;
  dailyRunRate: number;
  yieldPercent: number;
}

export function KPITracker({
  totalTarget,
  completedBlades,
  dailyRunRate,
  yieldPercent,
}: KPITrackerProps) {
  const completedSets = Math.floor(completedBlades / 3);
  const setProgress = (completedSets / totalTarget.sets) * 100;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Target */}
      <div className="bg-slate-900 rounded-xl border-2 border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-slate-400">Total Target</div>
        </div>
        <div className="text-slate-100 mb-1">
          {totalTarget.sets} Sets
        </div>
        <div className="text-slate-400">{totalTarget.blades} Blades</div>
      </div>

      {/* Set Progress */}
      <div className="bg-slate-900 rounded-xl border-2 border-emerald-800 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-slate-400">Set Progress</div>
        </div>
        <div className="text-emerald-400 mb-1">
          {completedSets} / {totalTarget.sets}
        </div>
        <div className="text-slate-400">{completedBlades} Blades</div>
        <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${setProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Daily Run Rate */}
      <div className="bg-slate-900 rounded-xl border-2 border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-slate-400">Daily Run Rate</div>
        </div>
        <div className="text-purple-400 mb-1">
          {dailyRunRate} blades/day
        </div>
        <div className="text-slate-400">Current pace</div>
      </div>

      {/* Yield % */}
      <div className="bg-slate-900 rounded-xl border-2 border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-slate-400">Yield Rate</div>
        </div>
        <div className={`mb-1 ${yieldPercent >= 95 ? 'text-emerald-400' : yieldPercent >= 90 ? 'text-amber-400' : 'text-red-400'}`}>
          {yieldPercent.toFixed(1)}%
        </div>
        <div className="text-slate-400">Quality</div>
      </div>
    </div>
  );
}
