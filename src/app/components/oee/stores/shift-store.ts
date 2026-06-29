import { create } from 'zustand'
import type { Shift, DowntimeEvent, OEECalculation } from '../types'

type ShiftView = 'pre-shift' | 'active' | 'post-shift'
type ShiftType = string // 'A' | 'B' | 'C'

interface ShiftStore {
  // View state
  view: ShiftView

  // Shift data
  activeShift: Shift | null
  shiftType: ShiftType

  // Downtime
  downtimeEvents: DowntimeEvent[]
  activeDowntime: DowntimeEvent | null

  // Production
  totalParts: number
  rejectParts: number

  // OEE result
  oeeResult: OEECalculation | null

  // Actions
  setView: (view: ShiftView) => void
  setShiftType: (type: ShiftType) => void
  startShift: (shift: Shift) => void
  endShift: (oee: OEECalculation) => void
  addDowntimeEvent: (event: DowntimeEvent) => void
  updateDowntimeEvent: (event: DowntimeEvent) => void
  setActiveDowntime: (event: DowntimeEvent | null) => void
  setTotalParts: (count: number) => void
  setRejectParts: (count: number) => void
  reset: () => void
}

const initialState = {
  view: 'pre-shift' as ShiftView,
  activeShift: null,
  shiftType: 'A' as ShiftType,
  downtimeEvents: [],
  activeDowntime: null,
  totalParts: 0,
  rejectParts: 0,
  oeeResult: null,
}

export const useShiftStore = create<ShiftStore>((set) => ({
  ...initialState,

  setView: (view) => set({ view }),
  setShiftType: (shiftType) => set({ shiftType }),

  startShift: (shift) => set({
    activeShift: shift,
    view: 'active',
    downtimeEvents: [],
    activeDowntime: null,
    totalParts: 0,
    rejectParts: 0,
    oeeResult: null,
  }),

  endShift: (oee) => set({
    view: 'post-shift',
    oeeResult: oee,
    activeDowntime: null,
  }),

  addDowntimeEvent: (event) =>
    set((state) => ({
      downtimeEvents: [...state.downtimeEvents, event],
    })),

  updateDowntimeEvent: (event) =>
    set((state) => ({
      downtimeEvents: state.downtimeEvents.map((e) =>
        e.id === event.id ? event : e
      ),
    })),

  setActiveDowntime: (event) => set({ activeDowntime: event }),

  setTotalParts: (totalParts) => set({ totalParts }),
  setRejectParts: (rejectParts) => set({ rejectParts }),

  reset: () => set(initialState),
}))
