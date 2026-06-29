import { useEffect, useState } from 'react'
import { supabase } from '@/shared/api/supabase'
import { useAuth } from '@/lib/AuthContext'
import { useToast } from './use-toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Card, CardContent } from '@/shared/ui/card'
import { Save, AlertTriangle, BellOff } from 'lucide-react'
import type { AlertConfig, Profile } from './types'

interface EnrichedConfig extends Partial<AlertConfig> {
  machine_id: string
  machine_name: string
}

export function OeeAlertSettings() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [configs, setConfigs] = useState<EnrichedConfig[]>([])
  const [edited, setEdited] = useState<Record<string, Partial<AlertConfig>>>({})
  const [loading, setLoading] = useState(true)

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
    fetchConfigs()
  }, [profile?.plant_id])

  async function fetchConfigs() {
    // Fetch machines
    const { data: machines } = await supabase
      .from('machines')
      .select('id, name')
      .eq('plant_id', profile!.plant_id)
      .eq('is_active', true)
      .order('name')

    if (!machines) return

    // Fetch existing configs
    const { data: existingConfigs } = await supabase
      .from('alert_config')
      .select('*')
      .eq('plant_id', profile!.plant_id)

    const configMap = new Map(existingConfigs?.map((c) => [c.machine_id, c]) || [])

    const enriched = machines.map((m) => {
      const cfg = configMap.get(m.id)
      return {
        id: cfg?.id,
        machine_id: m.id,
        machine_name: m.name,
        oee_threshold: cfg?.oee_threshold ?? 60,
        downtime_threshold_min: cfg?.downtime_threshold_min ?? 30,
        is_active: cfg?.is_active ?? true,
        suppress_until: cfg?.suppress_until,
      }
    })

    setConfigs(enriched)
    setLoading(false)
  }

  function handleChange(machineId: string, field: keyof AlertConfig, value: any) {
    setEdited((prev) => ({
      ...prev,
      [machineId]: {
        ...prev[machineId],
        [field]: value,
      },
    }))
  }

  async function handleSave() {
    if (!profile?.plant_id) return

    for (const [machineId, changes] of Object.entries(edited)) {
      const existing = configs.find((c) => c.machine_id === machineId)
      
      const payload = {
        machine_id: machineId,
        plant_id: profile.plant_id,
        oee_threshold: changes.oee_threshold ?? existing?.oee_threshold ?? 60,
        downtime_threshold_min: changes.downtime_threshold_min ?? existing?.downtime_threshold_min ?? 30,
        is_active: changes.is_active ?? existing?.is_active ?? true,
        suppress_until: changes.suppress_until ?? existing?.suppress_until ?? null,
      }

      let error
      if (existing?.id) {
        // Update
        const { error: err } = await supabase
          .from('alert_config')
          .update(payload)
          .eq('id', existing.id)
        error = err
      } else {
        // Insert
        const { error: err } = await supabase
          .from('alert_config')
          .insert(payload)
        error = err
      }

      if (error) {
        addToast({ title: 'Failed to save configuration', description: error.message, variant: 'destructive' })
        return
      }
    }

    addToast({ title: 'Alert configurations saved', variant: 'success' })
    setEdited({})
    fetchConfigs()
  }

  async function toggleActive(cfg: EnrichedConfig) {
    const nextVal = !(cfg.is_active ?? true)
    handleChange(cfg.machine_id, 'is_active', nextVal)
    
    // Update local state temporarily so UI reflects it immediately
    setConfigs((prev) =>
      prev.map((c) =>
        c.machine_id === cfg.machine_id ? { ...c, is_active: nextVal } : c
      )
    )
  }

  async function muteMachine(cfg: EnrichedConfig, hours: number) {
    const date = new Date()
    date.setHours(date.getHours() + hours)
    const val = date.toISOString()
    
    handleChange(cfg.machine_id, 'suppress_until', val)
    setConfigs((prev) =>
      prev.map((c) =>
        c.machine_id === cfg.machine_id ? { ...c, suppress_until: val } : c
      )
    )
    addToast({ title: `${cfg.machine_name} alerts muted for ${hours} hours`, variant: 'warning' })
  }

  const hasChanges = Object.keys(edited).length > 0

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-32 animate-pulse bg-slate-800/50 border-slate-700" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100 font-bold">Alert Settings</h1>
        {hasChanges && (
          <Button onClick={handleSave} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-10">
            <Save className="w-4 h-4" />
            Save Configuration
          </Button>
        )}
      </div>

      <p className="text-sm text-slate-400">
        Configure OEE thresholds and downtime duration warnings. Alerts appear in the supervisor bell icon and can trigger emails.
      </p>

      <div className="space-y-3 pt-2">
        {configs.map((cfg) => {
          const changes = edited[cfg.machine_id] || {}
          const oeeVal = changes.oee_threshold ?? cfg.oee_threshold ?? 60
          const dtVal = changes.downtime_threshold_min ?? cfg.downtime_threshold_min ?? 30
          const isActive = changes.is_active ?? cfg.is_active ?? true
          const suppressUntil = changes.suppress_until ?? cfg.suppress_until

          const isMuted = suppressUntil && new Date(suppressUntil) > new Date()

          return (
            <Card key={cfg.machine_id} className={`bg-slate-800/50 border-slate-700 ${!isActive ? 'opacity-40' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 text-emerald-400" />
                    <div>
                      <h3 className="font-semibold text-sm text-slate-100">{cfg.machine_name}</h3>
                      <p className="text-xs text-slate-400">
                        {isMuted ? 'Muted' : isActive ? 'Monitoring active' : 'Alerts disabled'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
                        onClick={() => muteMachine(cfg, 4)}
                      >
                        <BellOff className="w-3.5 h-3.5" />
                        Mute 4h
                      </Button>
                    )}
                    <Button variant="ghost" className="text-slate-300 hover:text-white" size="sm" onClick={() => toggleActive(cfg)}>
                      {isActive ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-400 mb-1.5 block">
                      OEE Alarm Threshold (%)
                    </label>
                    <Input
                      type="number"
                      value={oeeVal}
                      onChange={(e) => handleChange(cfg.machine_id, 'oee_threshold', parseInt(e.target.value) || 0)}
                      min="1"
                      max="99"
                      disabled={!isActive}
                      className="bg-slate-900 border-slate-700 text-white focus:border-emerald-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 mb-1.5 block">
                      Downtime Warning Threshold (minutes)
                    </label>
                    <Input
                      type="number"
                      value={dtVal}
                      onChange={(e) => handleChange(cfg.machine_id, 'downtime_threshold_min', parseInt(e.target.value) || 0)}
                      min="1"
                      disabled={!isActive}
                      className="bg-slate-900 border-slate-700 text-white focus:border-emerald-500 disabled:opacity-50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
