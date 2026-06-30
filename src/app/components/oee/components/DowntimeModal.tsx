import { useEffect, useState } from 'react'
import { useShiftStore } from '../stores/shift-store'
import { useAuth } from '@/lib/AuthContext'
import { useToast } from '../use-toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Badge } from '@/shared/ui/badge'
import { Play, Edit3 } from 'lucide-react'
import type { DowntimeReason } from '../types'

interface DowntimeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DowntimeModal({ open, onOpenChange }: DowntimeModalProps) {
  const {
    activeShift,
    activeDowntime,
    setActiveDowntime,
    addDowntimeEvent,
    updateDowntimeEvent,
  } = useShiftStore()
  const { user } = useAuth()
  const { addToast } = useToast()

  const [reasons, setReasons] = useState<DowntimeReason[]>([])
  const [step, setStep] = useState<'select-reason' | 'active' | 'manual'>('select-reason')
  const [selectedReason, setSelectedReason] = useState<DowntimeReason | null>(null)
  const [manualDuration, setManualDuration] = useState('')
  const [loading, setLoading] = useState(false)
  const [downtimeElapsed, setDowntimeElapsed] = useState('')
  const tenantId = localStorage.getItem('mes_tenant_id') || 'test-tenant-id'

  useEffect(() => {
    if (!open) return
    async function loadReasons() {
      try {
        const res = await fetch('/api/oee/downtime/reasons', { headers: { 'x-tenant-id': tenantId } })
        const data = await res.json()
        if (Array.isArray(data) && data.length) {
          setReasons(data.map((reason: any) => ({
            id: reason.id,
            plant_id: null,
            reason: reason.reasonName,
            category: reason.isPlanned || reason.category === 'planned' ? 'planned' : 'unplanned',
            icon: null,
            sort_order: reason.displayOrder || 0,
            is_active: reason.isActive !== false,
          })))
          return
        }
      } catch (error) {
        console.error('Failed to load OEE downtime reasons:', error)
      }
      setReasons([
        { id: 'mechanical_failure', plant_id: null, reason: 'Mechanical Failure', category: 'unplanned', icon: null, is_active: true, sort_order: 1 },
        { id: 'electrical_maintenance', plant_id: null, reason: 'Electrical Maintenance', category: 'planned', icon: null, is_active: true, sort_order: 2 },
        { id: 'materials_shortage', plant_id: null, reason: 'No Materials Available', category: 'unplanned', icon: null, is_active: true, sort_order: 3 },
      ])
    }
    loadReasons()
  }, [open, tenantId])

  useEffect(() => {
    if (open) setStep(activeDowntime ? 'active' : 'select-reason')
  }, [open, activeDowntime])

  useEffect(() => {
    if (step !== 'active' || !activeDowntime?.start_time) return
    const interval = setInterval(() => {
      const start = new Date(activeDowntime.start_time).getTime()
      const diff = Math.floor((Date.now() - start) / 1000)
      const min = Math.floor(diff / 60)
      const sec = diff % 60
      setDowntimeElapsed(`${min}:${sec.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [step, activeDowntime?.start_time])

  const unplannedReasons = reasons.filter((reason) => reason.category === 'unplanned')
  const plannedReasons = reasons.filter((reason) => reason.category === 'planned')

  async function logDowntime(reason: DowntimeReason, durationMinutes: number) {
    if (!activeShift || !user) return null
    const res = await fetch('/api/oee/downtime/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify({
        shiftRunId: activeShift.id,
        workCenterId: activeShift.machine_id,
        downtimeReasonId: reason.id.length === 36 ? reason.id : undefined,
        downtimeReason: reason.reason,
        durationMinutes,
      }),
    })
    const data = await res.json()
    if (!res.ok || data?.error) throw new Error(data?.error || 'Failed to log downtime')
    return data
  }

  async function handleStartDowntime(reason: DowntimeReason) {
    if (!activeShift || !user) return
    setLoading(true)
    try {
      const data = await logDowntime(reason, 10)
      if (data) {
        const event = {
          id: data.id,
          shift_id: activeShift.id,
          machine_id: activeShift.machine_id,
          reason_id: reason.id,
          is_planned: reason.category === 'planned',
          notes: reason.reason,
          start_time: new Date().toISOString(),
        }
        setActiveDowntime(event as any)
        addDowntimeEvent(event as any)
        setSelectedReason(reason)
        setStep('active')
        addToast({ title: 'Downtime started', description: reason.reason, variant: 'warning' })
      }
    } catch (error) {
      addToast({ title: 'Failed to start downtime', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleEndDowntime() {
    if (!activeDowntime) return
    setLoading(true)
    try {
      updateDowntimeEvent({ ...activeDowntime, end_time: new Date().toISOString(), duration_min: 10 })
      setActiveDowntime(null)
      addToast({ title: 'Downtime ended', description: 'Duration: 10 min', variant: 'success' })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleManualEntry() {
    if (!activeShift || !user || !selectedReason) return
    const duration = parseFloat(manualDuration)
    if (isNaN(duration) || duration <= 0) {
      addToast({ title: 'Enter a valid duration', variant: 'warning' })
      return
    }

    setLoading(true)
    const now = new Date()
    const start = new Date(now.getTime() - duration * 60 * 1000)
    try {
      const data = await logDowntime(selectedReason, duration)
      addDowntimeEvent({
        id: data.id,
        shift_id: activeShift.id,
        machine_id: activeShift.machine_id,
        reason_id: selectedReason.id,
        start_time: start.toISOString(),
        end_time: now.toISOString(),
        duration_min: duration,
        is_planned: selectedReason.category === 'planned',
        notes: selectedReason.reason,
        logged_by: user.id,
        created_at: now.toISOString(),
      } as any)
      addToast({ title: 'Downtime logged', description: `${selectedReason.reason} - ${duration} min`, variant: 'success' })
      setManualDuration('')
      setStep('select-reason')
      setSelectedReason(null)
      onOpenChange(false)
    } catch (error) {
      addToast({ title: 'Failed to log downtime', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-800 border-slate-700 text-white">
        {step === 'select-reason' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-white text-base font-bold">Log Downtime</DialogTitle>
              <p className="text-xs text-slate-400">Tap a reason to start tracking, or use manual entry.</p>
            </DialogHeader>

            <div className="mt-2">
              <p className="text-xs font-semibold text-rose-400 mb-2 uppercase tracking-wide">Unplanned</p>
              <div className="grid grid-cols-2 gap-2">
                {unplannedReasons.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => handleStartDowntime(reason)}
                    disabled={loading}
                    className="flex items-center gap-2 p-3 rounded-lg border border-slate-700 bg-slate-900 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all text-left min-h-[48px]"
                  >
                    <span className="text-xs font-medium leading-tight">{reason.reason}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Planned</p>
              <div className="grid grid-cols-2 gap-2">
                {plannedReasons.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => handleStartDowntime(reason)}
                    disabled={loading}
                    className="flex items-center gap-2 p-3 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-emerald-500/30 transition-all text-left min-h-[48px]"
                  >
                    <span className="text-xs font-medium leading-tight">{reason.reason}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-slate-700 pt-4">
              <Button
                variant="outline"
                className="w-full gap-2 border-slate-700 bg-slate-900 hover:bg-slate-800 text-white"
                onClick={() => setStep('manual')}
              >
                <Edit3 className="w-4 h-4" />
                Manual Entry
              </Button>
            </div>
          </>
        )}

        {step === 'active' && activeDowntime && (
          <>
            <DialogHeader>
              <DialogTitle className="text-rose-400">Machine Stopped</DialogTitle>
            </DialogHeader>
            <div className="text-center py-6">
              <div className="w-24 h-24 rounded-full border-4 border-rose-500/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <p className="text-3xl font-mono font-bold text-rose-500 tabular-nums">{downtimeElapsed}</p>
              </div>
              <Badge variant="destructive" className="text-xs">{activeDowntime.notes || 'Unknown'}</Badge>
            </div>
            <Button className="w-full h-14 text-lg gap-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleEndDowntime} disabled={loading}>
              <Play className="w-5 h-5" />
              {loading ? 'Ending...' : 'Machine Restarted - End Downtime'}
            </Button>
          </>
        )}

        {step === 'manual' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-white">Manual Downtime Entry</DialogTitle>
              <p className="text-xs text-slate-400">Log a past downtime event with known duration.</p>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-slate-300">Reason</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {reasons.map((reason) => (
                    <button
                      key={reason.id}
                      onClick={() => setSelectedReason(reason)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs min-h-[44px] transition-all bg-slate-900 ${
                        selectedReason?.id === reason.id
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-slate-700 hover:border-emerald-500/30'
                      }`}
                    >
                      <span>{reason.reason}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-slate-300">Duration (minutes)</label>
                <Input
                  type="number"
                  placeholder="e.g., 15"
                  value={manualDuration}
                  onChange={(event) => setManualDuration(event.target.value)}
                  className="flex h-14 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-lg text-white text-center font-bold focus:border-emerald-500"
                  min="0.5"
                  step="0.5"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-slate-700 bg-slate-900 text-white hover:bg-slate-800" onClick={() => setStep('select-reason')}>Back</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleManualEntry} disabled={!selectedReason || !manualDuration || loading}>
                  {loading ? 'Saving...' : 'Log Downtime'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
