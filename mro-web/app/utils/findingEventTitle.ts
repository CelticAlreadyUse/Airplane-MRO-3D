import {findingStatuses,type FindingEvent} from '../types/findings'
export function findingEventTitle(event:FindingEvent):string{
  const labels:Partial<Record<FindingEvent['type'],string>>={created:'Temuan dibuat',severity_changed:'Tingkat kritis diperbarui',material_requested:'Sparepart diajukan',material_prepared:'Sparepart disiapkan',material_issued:'Sparepart diserahkan',material_cancelled:'Permintaan sparepart dibatalkan',material_used:'Pemakaian part dicatat',material_returned:'Part dikembalikan',repair_submitted:'Kartu pengerjaan diajukan',repair_accepted:'Hasil diterima - pekerjaan ditutup',repair_rework:'Pengerjaan ulang diminta',backup_restored:'Data dipulihkan dari backup'}
  return labels[event.type]??`${event.from?findingStatuses[event.from]:'Status'} → ${findingStatuses[event.to]}`
}
