import { useEffect, useState } from 'react'
import { supabase } from '@/shared/api/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Select } from './components/Select'
import { getOEEColor, getOEEBgColor, formatOEE, formatDuration } from './utils'
import {
  Activity,
  Clock,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import { MachineDrilldown } from './components/MachineDrilldown'
import type { Profile } from './types'

interface MachineOEEData {
  machine_id: string
  machine_name: string
  avg_oee: number
  avg_availability: number
  avg_performance: number
  avg_quality: number
  total_downtime_min: number
  shift_count: number
  status?: 'running' | 'stopped' | 'idle'
  top_reason?: string
}

export function SupervisorDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [machines, setMachines] = useState<MachineOEEData[]>([])
  const [loading, setLoading] = useState(true)
  const [shiftFilter, setShiftFilter] = useState('all')
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null)

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

  useEffect(() => {
    if (!profile?.plant_id) return
    fetchDashboardData()

    // Real-time subscription with unique channel name to prevent StrictMode clashes
    const channel = supabase
      .channel(`dashboard-updates-${profile.plant_id}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'oee_calculations' },
        () => fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => fetchDashboardData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.plant_id])

  async function fetchDashboardData() {
    if (!profile?.plant_id) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data, error } = await supabase.rpc('get_machine_oee_summary', {
      p_plant_id: profile.plant_id,
      p_start_date: today.toISOString(),
      p_end_date: tomorrow.toISOString(),
    })

    if (data) {
      // Check active shifts for status
      const { data: activeShifts } = await supabase
        .from('shifts')
        .select('machine_id')
        .eq('status', 'active')

      const activeIds = new Set(activeShifts?.map((s) => s.machine_id) || [])

      const enriched = data.map((m: MachineOEEData) => ({
        ...m,
        status: activeIds.has(m.machine_id) ? 'running' : 'idle' as const,
      }))

      setMachines(enriched)
    }
    setLoading(false)
  }

  if (selectedMachineId) {
    return (
      <MachineDrilldown
        machineId={selectedMachineId}
        onBack={() => setSelectedMachineId(null)}
      />
    )
  }

  // Aggregates
  const plantOEE = machines.length > 0
    ? machines.reduce((sum, m) => sum + m.avg_oee, 0) / machines.length
    : 0
  const totalDowntime = machines.reduce((sum, m) => sum + m.total_downtime_min, 0)
  const runningCount = machines.filter((m) => m.status === 'running').length

  return (
    <div className="space-y-6 text-white max-w-7xl mx-auto">
      {/* ─── Plant Overview Header ────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">OEE Supervisor Dashboard</h1>
        <p className="text-sm text-slate-400">
          Real-time OEE across your shop floor •{' '}
          <span className="text-xs">
            Last updated: {new Date().toLocaleTimeString('en-IN')}
          </span>
        </p>
      </div>

      {/* ─── KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">Plant OEE</span>
            </div>
            <p className={`text-3xl font-bold ${getOEEColor(plantOEE)}`}>
              {formatOEE(plantOEE)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">Active Machines</span>
            </div>
            <p className="text-3xl font-bold text-slate-100">
              <span className="text-emerald-400">{runningCount}</span>
              <span className="text-slate-400 text-lg">/{machines.length}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1">currently running</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">Total Downtime</span>
            </div>
            <p className="text-3xl font-bold text-rose-400">
              {formatDuration(totalDowntime)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">today</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <AlertTriangle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">Below Target</span>
            </div>
            <p className="text-3xl font-bold text-amber-400">
              {machines.filter((m) => m.avg_oee < 60 && m.avg_oee > 0).length}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">machines &lt; 60%</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters ──────────────────────────────────────── */}
      <div className="flex gap-3 items-center">
        <div className="w-48">
          <Select
            options={[
              { value: 'all', label: 'All Shifts' },
              { value: 'A', label: 'Shift A' },
              { value: 'B', label: 'Shift B' },
              { value: 'C', label: 'Shift C' },
            ]}
            value={shiftFilter}
            onChange={setShiftFilter}
          />
        </div>
      </div>

      {/* ─── Machine Cards Grid ───────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-40 animate-pulse bg-slate-800/50 border-slate-700" />
          ))}
        </div>
      ) : machines.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-slate-500 mb-4" />
            <p className="text-lg font-semibold text-slate-200">No data yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Start a shift from the Operator page to see OEE data here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((machine) => (
            <div
              key={machine.machine_id}
              onClick={() => setSelectedMachineId(machine.machine_id)}
            >
              <Card
                className={`hover:border-emerald-500/50 transition-all cursor-pointer bg-slate-800/50 border-slate-700 ${
                  machine.status === 'running' ? 'border-emerald-500/20' : ''
                }`}
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-sm text-slate-100">{machine.machine_name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            machine.status === 'running'
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-slate-500'
                          }`}
                        />
                        <span className="text-xs text-slate-400 capitalize">
                          {machine.status}
                        </span>
                      </div>
                    </div>
                    <Badge
                      className={`${getOEEBgColor(machine.avg_oee)}`}
                    >
                      {formatOEE(machine.avg_oee)}
                    </Badge>
                  </div>

                  {/* A × P × Q */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div>
                      <p className={`text-sm font-bold ${getOEEColor(machine.avg_availability)}`}>
                        {formatOEE(machine.avg_availability)}
                      </p>
                      <p className="text-[10px] text-slate-400">Avail</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${getOEEColor(machine.avg_performance)}`}>
                        {formatOEE(machine.avg_performance)}
                      </p>
                      <p className="text-[10px] text-slate-400">Perf</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${getOEEColor(machine.avg_quality)}`}>
                        {formatOEE(machine.avg_quality)}
                      </p>
                      <p className="text-[10px] text-slate-400">Qual</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
                    <span>{machine.shift_count} shifts today</span>
                    <span className="text-rose-400 font-semibold">
                      {formatDuration(machine.total_downtime_min)} DT
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
