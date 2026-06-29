import { useEffect, useState } from 'react'
import { supabase } from '@/shared/api/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { getOEEColor, formatOEE, formatDuration } from './utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import type { Profile } from './types'

interface MachineCompareData {
  machine_id: string
  machine_name: string
  avg_oee: number
  avg_availability: number
  avg_performance: number
  avg_quality: number
  total_downtime_min: number
  shift_count: number
}

interface OeeCompareProps {
  onBack: () => void
}

export function OeeCompare({ onBack }: OeeCompareProps) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [data, setData] = useState<MachineCompareData[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<keyof MachineCompareData>('avg_oee')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

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
    fetchCompareData()
  }, [profile?.plant_id])

  async function fetchCompareData() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: summary } = await supabase.rpc('get_machine_oee_summary', {
      p_plant_id: profile!.plant_id,
      p_start_date: today.toISOString(),
      p_end_date: tomorrow.toISOString(),
    })

    if (summary) {
      setData(summary)
    }
    setLoading(false)
  }

  function handleSort(field: keyof MachineCompareData) {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortField] ?? 0
    const bValue = b[sortField] ?? 0

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }
    return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
  })

  // Chart data formatting
  const chartData = data.map((m) => ({
    name: m.machine_name,
    OEE: m.avg_oee,
  }))

  function exportCSV() {
    const headers = ['Machine Name', 'OEE (%)', 'Availability (%)', 'Performance (%)', 'Quality (%)', 'Total Downtime (min)', 'Shifts']
    const rows = sortedData.map((m) => [
      m.machine_name,
      m.avg_oee.toFixed(1),
      m.avg_availability.toFixed(1),
      m.avg_performance.toFixed(1),
      m.avg_quality.toFixed(1),
      m.total_downtime_min.toFixed(1),
      m.shift_count,
    ])

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `OEE_Comparison_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-white">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="icon" className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Machine Comparison</h1>
          <p className="text-sm text-slate-400">Compare performance metrics across all active machines</p>
        </div>
        <Button variant="outline" className="ml-auto gap-2 border-slate-700 bg-slate-900 text-white hover:bg-slate-800" onClick={exportCSV} disabled={data.length === 0}>
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Chart */}
      {data.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="border-b border-slate-700/50 pb-3">
            <CardTitle className="text-sm text-slate-200">OEE Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="OEE" fill="#10b981" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.OEE >= 70
                          ? '#10b981' // emerald
                          : entry.OEE >= 50
                          ? '#f59e0b' // amber
                          : '#f43f5e' // rose
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Comparison Table */}
      <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/60">
                  <th className="text-left py-3 px-4 font-semibold text-xs text-slate-400 cursor-pointer" onClick={() => handleSort('machine_name')}>
                    Machine Name {sortField === 'machine_name' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-xs text-slate-400 cursor-pointer" onClick={() => handleSort('avg_oee')}>
                    OEE {sortField === 'avg_oee' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-xs text-slate-400 cursor-pointer" onClick={() => handleSort('avg_availability')}>
                    Availability {sortField === 'avg_availability' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-xs text-slate-400 cursor-pointer" onClick={() => handleSort('avg_performance')}>
                    Performance {sortField === 'avg_performance' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-xs text-slate-400 cursor-pointer" onClick={() => handleSort('avg_quality')}>
                    Quality {sortField === 'avg_quality' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-xs text-slate-400 cursor-pointer" onClick={() => handleSort('total_downtime_min')}>
                    Downtime {sortField === 'total_downtime_min' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-xs text-slate-400 cursor-pointer" onClick={() => handleSort('shift_count')}>
                    Shifts {sortField === 'shift_count' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-sm text-slate-400">
                      No machine data found for today
                    </td>
                  </tr>
                ) : (
                  sortedData.map((row) => (
                    <tr key={row.machine_id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-200">{row.machine_name}</td>
                      <td className={`py-3 px-4 text-right font-bold ${getOEEColor(row.avg_oee)}`}>
                        {formatOEE(row.avg_oee)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">{formatOEE(row.avg_availability)}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{formatOEE(row.avg_performance)}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{formatOEE(row.avg_quality)}</td>
                      <td className="py-3 px-4 text-right text-rose-400 font-mono">
                        {formatDuration(row.total_downtime_min)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">{row.shift_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
