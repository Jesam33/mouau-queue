export interface Office {
  id: string
  name: string
  icon: string
  color: string
  capacity: number
  operating_hours_start: string
  operating_hours_end: string
  qr_code_token: string
  created_at: string
}

export interface OfficeWithMetrics extends Office {
  queue_count: number
  estimated_wait_minutes: number
  congestion_level: 'Low' | 'Moderate' | 'High' | 'Critical'
  checked_in_count: number
}

export interface Profile {
  id: string
  matric_number: string
  full_name: string
  department: string
  level: string
  role: 'student' | 'admin'
  office_id: string | null
  created_at: string
}

export interface QueueEntry {
  id: string
  office_id: string
  student_id: string
  ticket_number: string
  position: number
  join_method: 'remote' | 'walkin'
  status: 'waiting' | 'checked_in' | 'being_served' | 'served' | 'skipped' | 'cancelled'
  checked_in_at: string | null
  served_at: string | null
  created_at: string
  profiles?: Pick<Profile, 'full_name' | 'matric_number' | 'department' | 'level'>
  offices?: Pick<Office, 'name' | 'color' | 'icon'>
}

export interface QueueSnapshot {
  id: string
  office_id: string
  count: number
  hour: number
  day_of_week: number
  recorded_at: string
}

export interface Notification {
  id: string
  student_id: string
  ticket_id: string
  message: string
  read: boolean
  created_at: string
}

export interface TicketWithOffice extends QueueEntry {
  offices: Pick<Office, 'name' | 'color' | 'icon' | 'capacity' | 'qr_code_token'>
}

export type CongestionLevel = 'Low' | 'Moderate' | 'High' | 'Critical'

export function getCongestionLevel(count: number, capacity: number): CongestionLevel {
  const ratio = count / capacity
  if (ratio === 0) return 'Low'
  if (ratio <= 0.5) return 'Low'
  if (ratio <= 0.75) return 'Moderate'
  if (ratio <= 1.0) return 'High'
  return 'Critical'
}

export function getEstimatedWait(count: number, avgServiceMinutes = 3): number {
  if (count <= 1) return 0
  return (count - 1) * avgServiceMinutes
}

export function generateTicketNumber(officeName: string, position: number): string {
  const prefix = officeName.substring(0, 3).toUpperCase()
  return `${prefix}-${String(position).padStart(3, '0')}`
}
