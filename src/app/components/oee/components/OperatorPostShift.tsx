import { useShiftStore } from '../stores/shift-store'
import { useMachineStore } from '../stores/machine-store'
import { useAuth } from '@/lib/AuthContext'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { getOEEColor, formatOEE, formatDuration } from '../utils'
import { RotateCcw, CheckCircle2 } from 'lucide-react'
import { PDFDownloadButton } from '../reports/pdf-download-button'

export function OperatorPostShift() {
  const { oeeResult, shiftType, downtimeEvents, totalParts, rejectParts, reset } = useShiftStore()
  const { selectedMachine } = useMachineStore()
  const { user } = useAuth()

  if (!oeeResult || !selectedMachine) return null

  const oeeColor = getOEEColor(oeeResult.oee)
  const goodParts = totalParts - rejectParts
  const operatorName = user?.employeeName || 'Operator'

  return (
    <div className="space-y-6 animate-fade-in text-white max-w-xl mx-auto">
      {/* ─── Success Header ───────────────────────────────── */}
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Shift Complete</h1>
        <p className="text-sm text-slate-400">
          {selectedMachine?.name} — Shift {shiftType}
        </p>
      </div>

      {/* ─── OEE Gauge ────────────────────────────────────── */}
      <Card className="overflow-hidden bg-slate-800/50 border-slate-700">
        <CardContent className="p-0 pt-6">
          <div className="text-center py-8 px-6">
            {/* OEE Circle */}
            <div className="relative w-40 h-40 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                {/* Background circle */}
                <circle
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-700"
                />
                {/* OEE arc */}
                <circle
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(oeeResult.oee / 100) * 327} 327`}
                  className={oeeColor}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${oeeColor}`}>
                  {formatOEE(oeeResult.oee)}
                </span>
                <span className="text-xs text-slate-400">OEE</span>
              </div>
            </div>

            {/* A × P × Q Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className={`text-2xl font-bold ${getOEEColor(oeeResult.availability)}`}>
                  {formatOEE(oeeResult.availability)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Availability</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${getOEEColor(oeeResult.performance)}`}>
                  {formatOEE(oeeResult.performance)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Performance</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${getOEEColor(oeeResult.quality)}`}>
                  {formatOEE(oeeResult.quality)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Quality</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Shift Summary ────────────────────────────────── */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-5 space-y-3">
          <h3 className="font-semibold text-sm text-slate-200">Shift Summary</h3>

          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Operating Time</span>
              <span className="font-medium">{formatDuration(oeeResult.operating_time_min)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Downtime</span>
              <span className="font-medium text-rose-400">{formatDuration(oeeResult.total_downtime_min)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Planned DT</span>
              <span className="font-medium">{formatDuration(oeeResult.planned_downtime_min)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DT Events</span>
              <span className="font-medium">{downtimeEvents.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Parts</span>
              <span className="font-medium">{totalParts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Good Parts</span>
              <span className="font-medium text-emerald-400">{goodParts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reject Parts</span>
              <span className={`font-medium ${rejectParts > 0 ? 'text-rose-400' : ''}`}>{rejectParts}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Actions ──────────────────────────────────────── */}
      <div className="flex gap-3">
        <PDFDownloadButton
          oee={oeeResult}
          machine={selectedMachine}
          downtimeEvents={downtimeEvents}
          shiftType={shiftType}
          operatorName={operatorName}
        />
        <Button
          className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-11"
          onClick={reset}
        >
          <RotateCcw className="w-4 h-4" />
          New Shift
        </Button>
      </div>
    </div>
  )
}
