import { useState } from 'react';
import { X, Box, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/shared/utils';

interface MouldingOverviewDialogProps {
  onClose: () => void;
  onSelectProcess: (processId: number) => void;
}

interface FaceStep {
  id: number;
  name: string;
  targetMinutes: number;
}

interface FaceData {
  currentStepIndex: number;
  elapsedMinutes: number;
  crew: string[];
}

interface MouldData {
  id: string;
  name: string;
  bladeNumber: string;
  suctionFace: FaceData;
  pressureFace: FaceData;
}

const SUCTION_FACE_STEPS: FaceStep[] = [
  { id: 1, name: 'Mould Opening & Shell Cleaning', targetMinutes: 40 },
  { id: 2, name: 'Gel Coat Application and Curing Time', targetMinutes: 50 },
  { id: 3, name: 'Lower Process Material Placement', targetMinutes: 15 },
  { id: 4, name: 'Outer Skin, Preform Segment 1 & 2 Placement', targetMinutes: 75 },
  { id: 5, name: 'Spar Boom Placement', targetMinutes: 20 },
  { id: 6, name: 'Core Placement', targetMinutes: 45 },
  { id: 7, name: 'Inner Skin and Reinforcement Layers Placement', targetMinutes: 75 },
  { id: 8, name: 'Process Material Placement', targetMinutes: 45 },
  { id: 9, name: 'Vacuum Foil Placement and Sealing', targetMinutes: 90 },
  { id: 10, name: 'Vacuum Application and Checking', targetMinutes: 45 },
  { id: 11, name: 'Infusion', targetMinutes: 140 },
  { id: 12, name: 'Curing', targetMinutes: 275 },
  { id: 13, name: 'Debagging and Shell Inspection', targetMinutes: 120 },
  { id: 14, name: 'Web Bonding Dry Fit and Web Stoppers Fixing', targetMinutes: 40 },
  { id: 15, name: 'Paste Application + Web Bonding + Curing', targetMinutes: 210 },
  { id: 16, name: 'Shell Closing Dry Fit', targetMinutes: 25 },
  { id: 17, name: 'Shell Closing Preparation', targetMinutes: 120 },
  { id: 18, name: 'Shell Gluing', targetMinutes: 60 },
  { id: 19, name: 'Post Curing', targetMinutes: 310 },
];

const PRESSURE_FACE_STEPS: FaceStep[] = [
  { id: 1, name: 'Shell Cleaning', targetMinutes: 35 },
  { id: 2, name: 'Gel Coat Application and Curing Time', targetMinutes: 50 },
  { id: 3, name: 'Lower Process Material Placement', targetMinutes: 15 },
  { id: 4, name: 'Outer Skin, Preform Segment 1 & 2 Placement', targetMinutes: 75 },
  { id: 5, name: 'Spar Boom Placement', targetMinutes: 20 },
  { id: 6, name: 'Core Placement', targetMinutes: 45 },
  { id: 7, name: 'Inner Skin, LE and TE Glue Cap Tip Placement', targetMinutes: 75 },
  { id: 8, name: 'Process Material Placement', targetMinutes: 45 },
  { id: 9, name: 'Vacuum Foil Placement and Sealing', targetMinutes: 90 },
  { id: 10, name: 'Vacuum Application and Checking', targetMinutes: 45 },
  { id: 11, name: 'Infusion', targetMinutes: 140 },
  { id: 12, name: 'Curing (Knock Test after 5hrs)', targetMinutes: 275 },
  { id: 13, name: 'Flange Sealing, Debagging and Shell Inspection', targetMinutes: 120 },
  { id: 14, name: 'TE Glue Cap-2 Bonding + Parallel Activities', targetMinutes: 150 },
  { id: 15, name: 'Blade Demoulding', targetMinutes: 75 },
];

const MOCK_MOULD_DATA: MouldData[] = [
  {
    id: 'M1',
    name: 'Mould 1',
    bladeNumber: 'BL-2024-0156',
    suctionFace: {
      currentStepIndex: 11,
      elapsedMinutes: 185,
      crew: ['Rajesh Kumar', 'Amit Singh'],
    },
    pressureFace: {
      currentStepIndex: 8,
      elapsedMinutes: 32,
      crew: ['Priya Sharma', 'Vikram Patel'],
    },
  },
  {
    id: 'M2',
    name: 'Mould 2',
    bladeNumber: 'BL-2024-0157',
    suctionFace: {
      currentStepIndex: 5,
      elapsedMinutes: 28,
      crew: ['Sanjay Verma', 'Deepak Rao'],
    },
    pressureFace: {
      currentStepIndex: 3,
      elapsedMinutes: 45,
      crew: ['Neha Gupta', 'Rahul Joshi'],
    },
  },
  {
    id: 'M3',
    name: 'Mould 3',
    bladeNumber: 'BL-2024-0158',
    suctionFace: {
      currentStepIndex: 14,
      elapsedMinutes: 95,
      crew: ['Arun Nair', 'Kavitha Menon'],
    },
    pressureFace: {
      currentStepIndex: 11,
      elapsedMinutes: 220,
      crew: ['Suresh Pillai', 'Meera Das'],
    },
  },
];

function formatTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

interface FaceSectionProps {
  title: string;
  faceType: 'suction' | 'pressure';
  data: FaceData;
  steps: FaceStep[];
}

function FaceSection({ title, faceType, data, steps }: FaceSectionProps) {
  const currentStep = steps[data.currentStepIndex] || steps[0];
  const progressPercent = Math.min((data.elapsedMinutes / currentStep.targetMinutes) * 100, 100);
  const isOvertime = data.elapsedMinutes > currentStep.targetMinutes;

  const borderColor = faceType === 'suction' ? 'border-blue-500/40' : 'border-purple-500/40';
  const bgColor = faceType === 'suction' ? 'bg-blue-900/20' : 'bg-purple-900/20';
  const labelColor = faceType === 'suction' ? 'text-blue-400' : 'text-purple-400';
  const progressColor = isOvertime ? 'bg-red-500' : (faceType === 'suction' ? 'bg-blue-500' : 'bg-purple-500');

  return (
    <div className={cn("border rounded-lg p-3", borderColor, bgColor)}>
      <div className="flex items-center justify-between mb-2">
        <span className={cn("text-xs font-semibold uppercase tracking-wide", labelColor)}>
          {title}
        </span>
        <span className="text-xs text-slate-500">
          Step {data.currentStepIndex + 1}/{steps.length}
        </span>
      </div>

      <p className="text-white text-sm font-medium mb-2 whitespace-normal leading-tight line-clamp-2" title={currentStep.name}>
        {currentStep.name}
      </p>

      <div className="flex items-center gap-3 mb-2 text-xs">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className={cn("font-mono", isOvertime ? "text-red-400" : "text-slate-300")}>
            {formatTime(data.elapsedMinutes)}
          </span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400 font-mono">{formatTime(currentStep.targetMinutes)}</span>
        </div>
      </div>

      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
        <div
          className={cn("h-full rounded-full transition-all", progressColor)}
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        />
      </div>

      <div className="flex items-center gap-1 text-xs text-slate-400">
        <User className="w-3 h-3" />
        <span className="truncate" title={data.crew.join(', ')}>
          {data.crew.slice(0, 2).join(', ')}
        </span>
      </div>
    </div>
  );
}

interface MouldCardProps {
  mould: MouldData;
}

function MouldCard({ mould }: MouldCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-slate-700/50 border border-amber-600/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
            <span className="text-amber-400 font-bold text-sm">{mould.id}</span>
          </div>
          <div className="text-left">
            <h3 className="text-white font-semibold">{mould.name}</h3>
            <p className="text-slate-400 text-xs">{mould.bladeNumber}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FaceSection
            title="Suction Face (SF)"
            faceType="suction"
            data={mould.suctionFace}
            steps={SUCTION_FACE_STEPS}
          />
          <FaceSection
            title="Pressure Face (PF)"
            faceType="pressure"
            data={mould.pressureFace}
            steps={PRESSURE_FACE_STEPS}
          />
        </div>
      )}
    </div>
  );
}

export function MouldingOverviewDialog({
  onClose,
  onSelectProcess,
}: MouldingOverviewDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-4xl max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <Box className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Moulding Overview</h2>
              <p className="text-slate-400 text-sm">Real-time mould status for M1, M2, M3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {MOCK_MOULD_DATA.map(mould => (
            <MouldCard key={mould.id} mould={mould} />
          ))}
        </div>

        <div className="p-4 border-t border-slate-700 shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Suction Face</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span>Pressure Face</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Overtime</span>
              </div>
            </div>
            <span>Total: 30 hrs per shell (SF + PF)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
