import { useEffect } from 'react'
import { supabase } from '@/shared/api/supabase'
import { useMachineStore } from './stores/machine-store'
import { useShiftStore } from './stores/shift-store'
import { OperatorPreShift } from './components/OperatorPreShift'
import { OperatorActiveShift } from './components/OperatorActiveShift'
import { OperatorPostShift } from './components/OperatorPostShift'
import { ShiftClockWidget } from './components/ShiftClockWidget'

export function OperatorView() {
  const { setMachines } = useMachineStore()
  const view = useShiftStore((s) => s.view)

  // Fetch machines on mount
  useEffect(() => {
    async function fetchMachines() {
      const { data } = await supabase
        .from('machines')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (data) setMachines(data)
    }
    fetchMachines()
  }, [setMachines])

  return (
    <div className="p-4 pb-24 lg:pb-4 max-w-2xl mx-auto space-y-6">
      <ShiftClockWidget />
      {view === 'pre-shift' && <OperatorPreShift />}
      {view === 'active' && <OperatorActiveShift />}
      {view === 'post-shift' && <OperatorPostShift />}
    </div>
  )
}
