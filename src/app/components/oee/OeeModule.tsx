import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { OperatorView } from './OperatorView'
import { SupervisorDashboard } from './SupervisorDashboard'
import { OeeCompare } from './OeeCompare'
import { OeeReports } from './OeeReports'
import { OeeAlertSettings } from './OeeAlertSettings'
import { Activity, ClipboardList, TrendingUp, BarChart2, FileSpreadsheet, Settings } from 'lucide-react'

type OeeSubView = 'operator' | 'dashboard' | 'compare' | 'reports' | 'alerts'

export default function OeeModule() {
  const { user } = useAuth()
  const isOperator = user?.role?.toLowerCase() === 'operator'
  
  // Set default view: operators go to shift logging, supervisors go to dashboard
  const [activeSubView, setActiveSubView] = useState<OeeSubView>(
    isOperator ? 'operator' : 'dashboard'
  )

  const tabs = [
    { id: 'operator', label: 'Operator Portal', icon: ClipboardList, roles: ['operator', 'supervisor', 'plant_manager', 'admin'] },
    { id: 'dashboard', label: 'KPI Dashboard', icon: TrendingUp, roles: ['supervisor', 'plant_manager', 'admin'] },
    { id: 'compare', label: 'Machine Comparison', icon: BarChart2, roles: ['supervisor', 'plant_manager', 'admin'] },
    { id: 'reports', label: 'Compliance Reports', icon: FileSpreadsheet, roles: ['supervisor', 'plant_manager', 'admin'] },
    { id: 'alerts', label: 'Alert Settings', icon: Settings, roles: ['supervisor', 'plant_manager', 'admin'] },
  ]

  // Filter tabs by role
  const visibleTabs = tabs.filter(
    (tab) => !user?.role || tab.roles.includes(user.role.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Module Title Section */}
      <div className="flex items-center justify-between border-b border-slate-850 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-none">OEE Micro-Tracker</h1>
            <p className="text-xs text-slate-400 mt-1">Real-time Overall Equipment Effectiveness module</p>
          </div>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex border-b border-slate-700 overflow-x-auto gap-1">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeSubView === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubView(tab.id as OeeSubView)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                isActive
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Active Sub-module Container */}
      <div className="flex-1 min-h-0 pt-2">
        {activeSubView === 'operator' && <OperatorView />}
        {activeSubView === 'dashboard' && (
          <SupervisorDashboard />
        )}
        {activeSubView === 'compare' && (
          <OeeCompare onBack={() => setActiveSubView('dashboard')} />
        )}
        {activeSubView === 'reports' && <OeeReports />}
        {activeSubView === 'alerts' && <OeeAlertSettings />}
      </div>
    </div>
  )
}
