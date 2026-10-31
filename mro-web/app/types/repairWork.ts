import type { FindingPhoto } from './findings'
import type { MaterialDisposition } from './materialRequests'

export const reviewChecks={record:'Catatan tindakan dan rujukan sudah ditinjau',photos:'Foto sebelum dan sesudah sudah ditinjau',materials:'Pemakaian dan pengembalian material sudah ditinjau'} as const
export type ReviewCheck=keyof typeof reviewChecks
export interface RepairReview {id:string;inspector:string;result:'accepted'|'rework';note:string;checks:ReviewCheck[];at:string}
export interface RepairMaterialSnapshot {requestId:string;partId:string;name:string;partNumber:string;unit:string;issued:number;used:number;returned:number;dispositions:MaterialDisposition[]}
export interface RepairCard {
  id:string;technician:string;startedAt:string;completedAt:string;actions:string;reference:string
  beforePhotos:FindingPhoto[];afterPhotos:FindingPhoto[];submittedAt:string;materials:RepairMaterialSnapshot[];review?:RepairReview
}
export type RepairCardDraft=Omit<RepairCard,'id'|'submittedAt'|'review'|'materials'>
export type RepairCommand={kind:'submit';draft:RepairCardDraft}|{kind:'review';cardId:string;inspector:string;result:'accepted'|'rework';note:string;checks:ReviewCheck[]}
export interface RepairDialogTarget {findingId:string;mode:'record'|'review'}
