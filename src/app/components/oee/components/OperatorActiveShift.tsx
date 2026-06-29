import { useState, useEffect } from 'react'
import { supabase } from '@/shared/api/supabase'
import { useMachineStore } from '../stores/machine-store'
import { useShiftStore } from '../stores/shift-store'
import { useAuth } from '@/lib/AuthContext'
import { useToast } from '../use-toast'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { DowntimeModal } from './DowntimeModal'
import { ProductionInput } from './ProductionInput'
import {
  AlertTriangle,
  Clock,
  Square,
  StopCircle,
  Timer,
  Wrench,
} from 'lucide-react'
import { formatDuration } from '../utils'

export function OperatorActiveShift() {
  const { selectedMachine } = useMachineStore()
  const {
    activeShift,
    shiftType,
    downtimeEvents,
    activeDowntime,
    totalParts,
    rejectParts,
    endShift,
  } = useShiftStore()
  const { user } = useAuth()
  const { addToast } = useToast()

  const [showDowntimeModal, setShowDowntimeModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState('')

  // Elapsed time ticker
  useEffect(() => {
    if (!activeShift?.start_time) return
    const interval = setInterval(() => {
      const start = new Date(activeShift.start_time).getTime()
      const now = Date.now()
      const diff = Math.floor((now - start) / 1000)
      const hours = Math.floor(diff / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      const seconds = diff % 60
      setElapsed(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [activeShift?.start_time])

  // Total downtime
  const totalDowntimeMin = downtimeEvents.reduce(
    (sum, e) => sum + (e.duration_min || 0),
    0
  )

  async function handleEndShift() {
    if (!activeShift || !user) return

    // Warn if no production data
    if (totalParts === 0) {
      const confirmed = window.confirm(
        'No production count entered. End shift anyway?'
      )
      if (!confirmed) return
    }

    // Warn if there's active downtime
    if (activeDowntime) {
      addToast({
        title: 'Active downtime',
        description: 'Please end the current downtime event first.',
        variant: 'warning',
      })
      return
    }

    setLoading(true)

    // Upsert production log
    const { error: prodError } = await supabase
      .from('production_logs')
      .upsert(
        {
          shift_id: activeShift.id,
          machine_id: activeShift.machine_id,
          total_parts: totalParts,
          reject_parts: rejectParts,
          logged_by: user.auth_user_id || String(user.id).replace('demo-', ''),
        },
        { onConflict: 'shift_id' }
      )

    if (prodError) {
      addToast({
        title: 'Failed to save production data',
        description: prodError.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    // End the shift
    const { error: shiftError } = await supabase
      .from('shifts')
      .update({ end_time: new Date().toISOString(), status: 'completed' })
      .eq('id', activeShift.id)

    if (shiftError) {
      addToast({
        title: 'Failed to end shift',
        description: shiftError.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    // Calculate OEE using the Postgres stored function
    const { data: oeeData, error: oeeError } = await supabase
      .rpc('calculate_oee', { p_shift_id: activeShift.id })

    if (oeeError) {
      addToast({
        title: 'OEE calculation failed',
        description: oeeError.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    // Get the full OEE record
    const { data: oeeRecord } = await supabase
      .from('oee_calculations')
      .select('*')
      .eq('shift_id', activeShift.id)
      .maybeSingle()

    if (oeeRecord) {
      endShift(oeeRecord)
      addToast({
        title: 'Shift Ended',
        description: `OEE: ${oeeRecord.oee.toFixed(1)}%`,
        variant: 'success',
      })
    }

    setLoading(false)
  }

  return (
    <div className="space-y-5 animate-fade-in text-white max-w-xl mx-auto">
      {/* ─── Shift Header ─────────────────────────────────── */}
      <Card className="border-emerald-500/30 bg-slate-800/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-100">{selectedMachine?.name}</h1>
              <p className="text-xs text-slate-400">
                Shift {shiftType} • Started at{' '}
                {activeShift
                  ? new Date(activeShift.start_time).toLocaleTimeString(
                      'en-IN',
                      { hour: '2-digit', minute: '2-digit' }
                    )
                  : '—'}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium">Running</span>
              </div>
              <p className="text-2xl font-mono font-bold mt-1 tabular-nums text-slate-100">{elapsed}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Active Downtime Indicator ────────────────────── */}
      {activeDowntime && (
        <Card className="border-rose-500/50 bg-rose-500/10 animate-pulse">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StopCircle className="w-5 h-5 text-rose-400" />
              <div>
                <p className="text-sm font-semibold text-rose-400">Machine Stopped</p>
                <p className="text-xs text-slate-400">
                  Downtime in progress — tap to end
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => setShowDowntimeModal(true)}
            >
              End
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── Quick Stats ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3 text-center">
            <Timer className="w-4.5 h-4.5 mx-auto text-slate-400 mb-1" />
            <p className="text-lg font-bold text-slate-100">{downtimeEvents.length}</p>
            <p className="text-[10px] text-slate-400">Events</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3 text-center">
            <Clock className="w-4.5 h-4.5 mx-auto text-slate-400 mb-1" />
            <p className="text-lg font-bold text-slate-100">{formatDuration(totalDowntimeMin)}</p>
            <p className="text-[10px] text-slate-400">Downtime</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3 text-center">
            <Wrench className="w-4.5 h-4.5 mx-auto text-slate-400 mb-1" />
            <p className="text-lg font-bold text-slate-100">{totalParts}</p>
            <p className="text-[10px] text-slate-400">Parts</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Log Downtime Button ──────────────────────────── */}
      <Button
        className="w-full h-14 text-lg gap-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
        onClick={() => setShowDowntimeModal(true)}
      >
        <AlertTriangle className="w-5 h-5" />
        {activeDowntime ? 'View Active Downtime' : 'Log Downtime'}
      </Button>

      {/* ─── Downtime Log List ────────────────────────────── */}
      {downtimeEvents.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2 border-b border-slate-700/50">
            <CardTitle className="text-sm text-slate-200">Downtime This Shift</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <div className="space-y-2">
              {downtimeEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-[10px] ${
                        event.is_planned ? 'bg-slate-700 text-slate-100 hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                      }`}
                    >
                      {event.is_planned ? 'Planned' : 'Unplanned'}
                    </Badge>
                    <span className="text-sm text-slate-200">{event.notes || 'Downtime'}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-xs">
                    {event.duration_min
                      ? formatDuration(event.duration_min)
                      : 'Active...'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Production Input ─────────────────────────────── */}
      <ProductionInput />

      {/* ─── End Shift Button ─────────────────────────────── */}
      <Button
        className="w-full h-16 text-xl gap-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={handleEndShift}
        disabled={loading}
      >
        <Square className="w-5 h-5" />
        {loading ? 'Calculating OEE...' : 'End Shift'}
      </Button>

      {/* ─── Downtime Modal ───────────────────────────────── */}
      <DowntimeModal
        open={showDowntimeModal}
        onOpenChange={setShowDowntimeModal}
      />
    </div>
  )
}
