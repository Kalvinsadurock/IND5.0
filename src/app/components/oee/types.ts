// Types for the OEE Module

export type UserRole = 'operator' | 'supervisor' | 'plant_manager' | 'admin'
export type ShiftStatus = 'active' | 'completed' | 'cancelled'
export type DowntimeCategory = 'planned' | 'unplanned'

export interface Plant {
  id: string
  name: string
  location: string | null
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  plant_id: string | null
  created_at: string
}

export interface UserPlant {
  user_id: string
  plant_id: string
  role: UserRole
}

export interface Machine {
  id: string
  plant_id: string
  name: string
  location: string | null
  line: string | null
  ideal_cycle_time_sec: number
  is_active: boolean
  created_at: string
}

export interface ShiftConfig {
  id: string
  plant_id: string
  shift_type: string
  start_time: string
  end_time: string
  is_active: boolean
}

export interface DowntimeReason {
  id: string
  plant_id: string | null
  category: DowntimeCategory
  reason: string
  icon: string | null
  sort_order: number
  is_active: boolean
}

export interface Shift {
  id: string
  machine_id: string
  shift_type: string
  operator_id: string
  start_time: string
  end_time: string | null
  planned_duration_min: number
  status: ShiftStatus
  created_at: string
}

export interface DowntimeEvent {
  id: string
  shift_id: string
  machine_id: string
  reason_id: string
  start_time: string
  end_time: string | null
  duration_min: number | null
  is_planned: boolean
  notes: string | null
  logged_by: string
  created_at: string
}

export interface ProductionLog {
  id: string
  shift_id: string
  machine_id: string
  total_parts: number
  reject_parts: number
  good_parts: number
  logged_by: string
  created_at: string
  updated_at: string
}

export interface OEECalculation {
  id: string
  shift_id: string
  machine_id: string
  availability: number
  performance: number
  quality: number
  oee: number
  total_downtime_min: number
  planned_downtime_min: number
  operating_time_min: number
  calculated_at: string
}

export interface AlertConfig {
  id: string
  machine_id: string
  plant_id: string
  oee_threshold: number
  downtime_threshold_min: number
  is_active: boolean
  suppress_until: string | null
  created_at: string
}

export interface AlertLog {
  id: string
  machine_id: string
  plant_id: string
  alert_type: 'oee_threshold' | 'downtime_duration'
  message: string
  is_read: boolean
  created_at: string
}
