import type { FindingSeverity } from './severity'
import type { MaterialRequest } from './materialRequests'
import type { RepairCard } from './repairWork'
export const DEMO_AIRCRAFT_ID = 'cessna-208-demo'
export const findingStatuses = { open: 'Terbuka', in_progress: 'Ditindaklanjuti', awaiting_review:'Menunggu pemeriksaan', rework:'Perlu pengerjaan ulang', closed: 'Ditutup' } as const
export const findingCategories = { inspection: 'Inspeksi umum', damage: 'Kerusakan visual', wear: 'Keausan', leak: 'Indikasi kebocoran', other: 'Lainnya' } as const
export type FindingStatus = keyof typeof findingStatuses
export type FindingCategory = keyof typeof findingCategories
export interface FindingPhoto { id: string; name: string; blob: Blob }
export interface FindingEvent {
  id: string
  at: string
  actor: string
  type: 'created' | 'status_changed' | 'severity_changed' | 'material_requested' | 'material_prepared' | 'material_issued' | 'material_cancelled' | 'material_used' | 'material_returned' | 'repair_submitted' | 'repair_accepted' | 'repair_rework' | 'backup_restored'
  repairCardId?:string
  requestId?:string
  fromSeverity?: FindingSeverity
  toSeverity?: FindingSeverity
  from?: FindingStatus
  to: FindingStatus
  note: string
}
export interface Finding {
  sample?: boolean
  id: string
  aircraftId: string
  assetId: string
  componentLabel: string
  sourceName: string
  title: string
  description: string
  category: FindingCategory
  priority: 'normal' | 'high'
  severity?: FindingSeverity
  status: FindingStatus
  createdAt: string
  updatedAt: string
  revision: number
  photos: FindingPhoto[]
  history: FindingEvent[]
  materialRequests?:MaterialRequest[]
  repairCards?:RepairCard[]
}
export interface FindingDraft {
  title: string
  description: string
  category: FindingCategory
  priority: 'normal' | 'high'
  severity?: FindingSeverity
  photos: FindingPhoto[]
}
