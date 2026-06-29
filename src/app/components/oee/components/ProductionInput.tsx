import React from 'react'
import { useShiftStore } from '../stores/shift-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Package, AlertCircle } from 'lucide-react'

export function ProductionInput() {
  const { totalParts, rejectParts, setTotalParts, setRejectParts } = useShiftStore()
  const goodParts = Math.max(totalParts - rejectParts, 0)
  const rejectError = rejectParts > totalParts

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-2 border-b border-slate-700/50">
        <CardTitle className="flex items-center gap-2 text-base text-slate-100">
          <Package className="w-4.5 h-4.5 text-emerald-400" />
          Production Count
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Total Parts */}
        <div>
          <label className="text-sm font-medium text-slate-300 mb-1.5 block">
            Total Parts Produced
          </label>
          <input
            type="number"
            value={totalParts || ''}
            onChange={(e) => setTotalParts(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="0"
            className="flex h-14 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 text-center font-bold"
            min="0"
            inputMode="numeric"
          />
        </div>

        {/* Reject Parts */}
        <div>
          <label className="text-sm font-medium text-slate-300 mb-1.5 block">
            Reject Parts
          </label>
          <input
            type="number"
            value={rejectParts || ''}
            onChange={(e) => setRejectParts(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="0"
            className={`flex h-14 w-full rounded-xl border bg-slate-900 px-4 py-3 text-lg text-white placeholder:text-slate-500 focus:outline-none text-center font-bold ${
              rejectError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-emerald-500'
            }`}
            min="0"
            inputMode="numeric"
          />
          {rejectError && (
            <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Rejects cannot exceed total parts
            </p>
          )}
        </div>

        {/* Good Parts (calculated) */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
          <span className="text-sm font-medium text-slate-200">Good Parts</span>
          <span className={`text-xl font-bold ${goodParts > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
            {goodParts}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
