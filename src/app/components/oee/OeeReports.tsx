import { useState, useEffect } from 'react'
import { supabase } from '@/shared/api/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Button } from '@/shared/ui/button'
import { Select } from './components/Select'
import { Input } from '@/shared/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { FileText, Download, Loader2 } from 'lucide-react'
import { formatOEE, formatDuration, getOEEColor, getOEEBgColor } from './utils'
import type { Machine, OEECalculation, Profile } from './types'
import { MonthlyDownloadButton } from './reports/monthly-download-button'

export function OeeReports() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [machines, setMachines] = useState<Machine[]>([])
  const [selectedMachine, setSelectedMachine] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState<OEECalculation[] | null>(null)
  const [loading, setLoading] = useState(false)

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
    async function fetchMachines() {
      const { data } = await supabase.from('machines').select('*').eq('is_active', true).order('name')
      if (data) setMachines(data)
    }
    fetchMachines()
  }, [])

  async function generateReport() {
    if (!selectedMachine) return
    setLoading(true)

    const from = new Date(dateFrom)
    from.setHours(0, 0, 0, 0)
    const to = new Date(dateTo)
    to.setHours(23, 59, 59, 999)

    const { data } = await supabase
      .from('oee_calculations')
      .select('*')
      .eq('machine_id', selectedMachine)
      .gte('calculated_at', from.toISOString())
      .lte('calculated_at', to.toISOString())
      .order('calculated_at', { ascending: true })

    setReportData(data || [])
    setLoading(false)
  }

  function exportCSV() {
    if (!reportData) return
    const headers = ['Date', 'OEE (%)', 'Availability (%)', 'Performance (%)', 'Quality (%)', 'Total Downtime (min)']
    const rows = reportData.map((row) => [
      new Date(row.calculated_at).toLocaleDateString('en-IN'),
      row.oee.toFixed(1),
      row.availability.toFixed(1),
      row.performance.toFixed(1),
      row.quality.toFixed(1),
      row.total_downtime_min.toFixed(1),
    ])

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `OEE_Report_${machineName.replace(/\s+/g, '_')}_${dateFrom}_to_${dateTo}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const machineOptions = machines.map((m) => ({ value: m.id, label: m.name }))
  const selectedMachineObj = machines.find((m) => m.id === selectedMachine)
  const machineName = selectedMachineObj?.name || ''

  // Aggregates
  const avgOEE = reportData && reportData.length > 0
    ? reportData.reduce((s, r) => s + r.oee, 0) / reportData.length
    : 0
  const avgA = reportData && reportData.length > 0
    ? reportData.reduce((s, r) => s + r.availability, 0) / reportData.length
    : 0
  const avgP = reportData && reportData.length > 0
    ? reportData.reduce((s, r) => s + r.performance, 0) / reportData.length
    : 0
  const avgQ = reportData && reportData.length > 0
    ? reportData.reduce((s, r) => s + r.quality, 0) / reportData.length
    : 0
  const totalDT = reportData
    ? reportData.reduce((s, r) => s + r.total_downtime_min, 0)
    : 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-white">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Audit Reports</h1>
        <p className="text-sm text-slate-400">Generate shift and summary reports for periodic compliance audits</p>
      </div>

      {/* ─── Report Parameters ────────────────────────────── */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="border-b border-slate-700/50 pb-3">
          <CardTitle className="text-base text-slate-100 flex items-center gap-2 font-semibold">
            <FileText className="w-4.5 h-4.5 text-emerald-400" />
            Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block text-slate-300">Machine</label>
            <Select
              options={machineOptions}
              value={selectedMachine}
              placeholder="Select machine..."
              onChange={setSelectedMachine}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-300">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-300">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white focus:border-emerald-500"
              />
            </div>
          </div>
          <Button
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-11"
            onClick={generateReport}
            disabled={!selectedMachine || loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {/* ─── Report Preview ───────────────────────────────── */}
      {reportData !== null && (
        <Card className="animate-fade-in bg-slate-800/50 border-slate-700 overflow-hidden">
          <CardHeader className="border-b border-slate-700/50 pb-3 bg-slate-900/20">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base text-slate-100 font-semibold">
                {machineName} — {dateFrom} to {dateTo}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2 border-slate-700 bg-slate-900 text-white hover:bg-slate-800" onClick={exportCSV} disabled={reportData.length === 0}>
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
                {selectedMachineObj && reportData.length > 0 && (
                  <MonthlyDownloadButton
                    data={reportData}
                    machine={selectedMachineObj}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    plantName={profile?.plant_id ? "Oragadam, Chennai Plant" : "Demo Auto Components"}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {reportData.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">
                No data found for this period
              </p>
            ) : (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                  <div className="text-center p-3 rounded-lg bg-slate-900/60 border border-slate-700/40">
                    <p className={`text-xl font-bold ${getOEEColor(avgOEE)}`}>{formatOEE(avgOEE)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Avg OEE</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-900/60 border border-slate-700/40">
                    <p className={`text-xl font-bold ${getOEEColor(avgA)}`}>{formatOEE(avgA)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Availability</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-900/60 border border-slate-700/40">
                    <p className={`text-xl font-bold ${getOEEColor(avgP)}`}>{formatOEE(avgP)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Performance</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-900/60 border border-slate-700/40">
                    <p className={`text-xl font-bold ${getOEEColor(avgQ)}`}>{formatOEE(avgQ)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Quality</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-900/60 border border-slate-700/40">
                    <p className="text-xl font-bold text-rose-400">{formatDuration(totalDT)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Total DT</p>
                  </div>
                </div>

                {/* Shift table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900/40">
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-400 text-xs">Date</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-slate-400 text-xs">OEE</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-slate-400 text-xs">Avail</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-slate-400 text-xs">Perf</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-slate-400 text-xs">Qual</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-slate-400 text-xs">DT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((row) => (
                        <tr key={row.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 text-xs text-slate-300">
                            {new Date(row.calculated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-bold ${getOEEColor(row.oee)}`}>
                            {formatOEE(row.oee)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">{formatOEE(row.availability)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300">{formatOEE(row.performance)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300">{formatOEE(row.quality)}</td>
                          <td className="py-2.5 px-3 text-right text-rose-400 font-mono">
                            {formatDuration(row.total_downtime_min)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
