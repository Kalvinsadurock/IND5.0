import { useState, useEffect } from 'react'
import { supabase } from '@/shared/api/supabase'
import { useMachineStore } from '../stores/machine-store'
import { useShiftStore } from '../stores/shift-store'
import { useAuth } from '@/lib/AuthContext'
import { useToast } from '../use-toast'
import { Button } from '@/shared/ui/button'
import { Select } from './Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Play, Cpu } from 'lucide-react'
import type { Profile } from '../types'

export function OperatorPreShift() {
  const { machines, selectedMachine, selectMachine } = useMachineStore()
  const { shiftType, setShiftType, startShift } = useShiftStore()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  // Fetch operator profile on mount to resolve plant_id
  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) return
      const targetUserId = user.auth_user_id || String(user.id).replace('demo-', '')
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle()
      if (data) setProfile(data)
    }
    fetchProfile()
  }, [user?.id, user?.auth_user_id])

  const machineOptions = machines.map((m) => ({
    value: m.id,
    label: `${m.name} — ${m.location || 'N/A'}`,
  }))

  const shiftOptions: { value: string; label: string }[] = [
    { value: 'A', label: 'Shift A (06:00 – 14:00)' },
    { value: 'B', label: 'Shift B (14:00 – 22:00)' },
    { value: 'C', label: 'Shift C (22:00 – 06:00)' },
  ]

  async function handleStartShift() {
    if (!selectedMachine || !user) return

    setLoading(true)

    try {
      const res = await fetch('/api/oee/shift/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'test-tenant-id'
        },
        body: JSON.stringify({
          workCenterId: selectedMachine.id,
          plannedRuntimeMinutes: 480
        })
      });
      const data = await res.json();
      if (data && !data.error) {
        startShift({
          id: data.id,
          machine_id: selectedMachine.id,
          shift_type: shiftType,
          status: 'active',
          operator_id: user.auth_user_id || String(user.id),
          start_time: new Date().toISOString(),
          end_time: null,
          planned_duration_min: 480,
          created_at: new Date().toISOString()
        } as any);
        addToast({
          title: 'Shift Started',
          description: `${selectedMachine.name} — Shift ${shiftType}`,
          variant: 'success',
        });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 animate-fade-in text-white max-w-xl mx-auto">
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold">Start Your Shift</h1>
        <p className="text-sm text-slate-400 mt-1">Select your machine and shift type to begin tracking</p>
      </div>

      {/* Machine Selection */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="border-b border-slate-700/50 pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-slate-100">
            <Cpu className="w-4.5 h-4.5 text-emerald-400" />
            Select Machine
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Select
            options={machineOptions}
            value={selectedMachine?.id || ''}
            placeholder="Choose a machine..."
            onChange={(value) => {
              const machine = machines.find((m) => m.id === value)
              selectMachine(machine || null)
            }}
          />

          {/* Machine details card */}
          {selectedMachine && (
            <div className="mt-4 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Location</span>
                <span>{selectedMachine.location || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Line</span>
                <span>{selectedMachine.line || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ideal Cycle Time</span>
                <span>{selectedMachine.ideal_cycle_time_sec}s</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift Selection */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="border-b border-slate-700/50 pb-3">
          <CardTitle className="text-base text-slate-100">Select Shift</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-3">
            {shiftOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setShiftType(opt.value)}
                className={`p-4 rounded-xl border-2 text-center transition-all min-h-[72px] flex flex-col items-center justify-center ${
                  shiftType === opt.value
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-700 bg-slate-900 hover:border-emerald-500/30'
                }`}
              >
                <span className="text-2xl font-bold">{opt.value}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {opt.label.split('(')[1]?.replace(')', '')}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        className="w-full h-16 text-xl gap-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={!selectedMachine || loading}
        onClick={handleStartShift}
      >
        <Play className="w-6 h-6" />
        {loading ? 'Starting...' : 'Start Shift'}
      </Button>
    </div>
  )
}
