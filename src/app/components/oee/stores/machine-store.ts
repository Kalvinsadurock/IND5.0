import { create } from 'zustand'
import type { Machine } from '../types'

interface MachineStore {
  machines: Machine[]
  selectedMachine: Machine | null
  loading: boolean
  setMachines: (machines: Machine[]) => void
  selectMachine: (machine: Machine | null) => void
  setLoading: (loading: boolean) => void
}

export const useMachineStore = create<MachineStore>((set) => ({
  machines: [],
  selectedMachine: null,
  loading: true,
  setMachines: (machines) => set({ machines, loading: false }),
  selectMachine: (machine) => set({ selectedMachine: machine }),
  setLoading: (loading) => set({ loading }),
}))
