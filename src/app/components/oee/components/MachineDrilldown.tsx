import { useEffect, useState } from 'react'
import { supabase } from '@/shared/api/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { getOEEColor, getOEEBgColor, formatOEE, formatDuration } from '../utils'
import { ArrowLeft, Download } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { OEECalculation, Machine } from '../types'

const CHART_COLORS = {
  oee: '#10b981', // emerald color matching MES theme
  availability: '#3b82f6',
  performance: '#eab308',
  quality: '#8b5cf6',
  downtime: '#ef4444',
}

interface MachineDrilldownProps {
  machineId: string
  onBack: () => void
}

export function MachineDrilldown({ machineId, onBack }: MachineDrilldownProps) {
  const [machine, setMachine] = useState<Machine | null>(null)
  const [oeeHistory, setOeeHistory] = useState<OEECalculation[]>([])
  const [downtimePareto, setDowntimePareto] = useState<{ reason: string; total_min: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!machineId) return
    fetchMachineData()
  }, [machineId])

  async function fetchMachineData() {
    // Fetch machine
    const { data: machineData } = await supabase
      .from('machines')
      .select('*')
      .eq('id', machineId)
      .maybeSingle()
    if (machineData) setMachine(machineData)

    // Fetch last 14 OEE calculations
    const { data: oeeData } = await supabase
      .from('oee_calculations')
      .select('*')
      .eq('machine_id', machineId)
      .order('calculated_at', { ascending: true })
      .limit(14)
    if (oeeData) setOeeHistory(oeeData)

    // Fetch downtime Pareto
    const { data: downtimeData } = await supabase
      .from('downtime_events')
      .select('reason_id, duration_min, downtime_reasons(reason)')
      .eq('machine_id', machineId)
      .not('duration_min', 'is', null)
      .order('duration_min', { ascending: false })

    if (downtimeData) {
      // Aggregate by reason
      const reasonMap = new Map<string, number>()
      for (const d of downtimeData) {
        const reason = (d as any).downtime_reasons?.reason || 'Unknown'
        reasonMap.set(reason, (reasonMap.get(reason) || 0) + (d.duration_min || 0))
      }
      const pareto = Array.from(reasonMap.entries())
        .map(([reason, total_min]) => ({ reason, total_min }))
        .sort((a, b) => b.total_min - a.total_min)
        .slice(0, 10)
      setDowntimePareto(pareto)
    }

    setLoading(false)
  }

  function handleExportCSV() {
    if (oeeHistory.length === 0) return
    const headers = ['Shift Date', 'OEE (%)', 'Availability (%)', 'Performance (%)', 'Quality (%)', 'Total Downtime (min)']
    const rows = oeeHistory.map(h => [
      new Date(h.calculated_at).toLocaleDateString(),
      h.oee.toFixed(1),
      h.availability.toFixed(1),
      h.performance.toFixed(1),
      h.quality.toFixed(1),
      h.total_downtime_min.toFixed(1)
    ])
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `OEE_Trend_Machine_${machine?.name.replace(/\s+/g, '_') || 'export'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Format OEE data for chart
  const trendData = oeeHistory.map((oee, i) => ({
    shift: `S${i + 1}`,
    oee: oee.oee,
    availability: oee.availability,
    performance: oee.performance,
    quality: oee.quality,
  }))

  const latestOEE = oeeHistory[oeeHistory.length - 1]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        Loading machine drilldown data...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-white">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" size="icon">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{machine?.name || 'Machine Detail'}</h1>
          <p className="text-sm text-slate-400">
            {machine?.location} • {machine?.line}
          </p>
        </div>
        {latestOEE && (
          <Badge
            className={`ml-auto text-sm px-3 py-1 ${getOEEBgColor(latestOEE.oee)}`}
          >
            OEE: {formatOEE(latestOEE.oee)}
          </Badge>
        )}
      </div>

      {/* ─── OEE Trend Chart ──────────────────────────────── */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="border-b border-slate-700/50 pb-3">
          <CardTitle className="text-base text-slate-100 font-semibold">OEE Trend (Recent Shifts)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {trendData.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-12">No shift data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="shift" stroke="#94a3b8" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Line type="monotone" dataKey="oee" stroke={CHART_COLORS.oee} strokeWidth={2.5} dot={{ r: 4 }} name="OEE" />
                <Line type="monotone" dataKey="availability" stroke={CHART_COLORS.availability} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Availability" />
                <Line type="monotone" dataKey="performance" stroke={CHART_COLORS.performance} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Performance" />
                <Line type="monotone" dataKey="quality" stroke={CHART_COLORS.quality} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Quality" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ─── Downtime Pareto ──────────────────────────────── */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="border-b border-slate-700/50 pb-3">
          <CardTitle className="text-base text-slate-100 font-semibold">Top Downtime Reasons</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {downtimePareto.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-12">No downtime data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={downtimePareto} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis dataKey="reason" type="category" width={120} stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)} min`, 'Duration']}
                />
                <Bar dataKey="total_min" radius={[0, 4, 4, 0]} name="Duration (min)">
                  {downtimePareto.map((_, index) => (
                    <Cell key={index} fill={index === 0 ? '#ef4444' : index < 3 ? '#f97316' : '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ─── Export ────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button onClick={handleExportCSV} disabled={oeeHistory.length === 0} variant="outline" className="gap-2 border-slate-700 bg-slate-900 text-white hover:bg-slate-800">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>
    </div>
  )
}
