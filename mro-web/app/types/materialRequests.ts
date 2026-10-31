export const materialRequestStatuses={requested:'Diajukan',ready:'Disiapkan',issued:'Diserahkan',cancelled:'Dibatalkan'} as const
export type MaterialRequestStatus=keyof typeof materialRequestStatuses
export interface MaterialDisposition {id:string;kind:'used'|'returned';quantity:number;actor:string;note:string;at:string;serialLot?:string}
export interface MaterialRequest {
  id:string
  partId:string
  quantity:number
  note:string
  status:MaterialRequestStatus
  createdAt:string
  updatedAt:string
  dispositions?:MaterialDisposition[]
}
export interface MaterialRequestDraft {partId:string;quantity:number;note:string}
export interface MaterialDialogTarget {findingId:string;requestId?:string;status?:Exclude<MaterialRequestStatus,'requested'>;disposition?:'used'|'returned'}
export type MaterialCommand = {kind:'request';draft:MaterialRequestDraft} | {kind:'transition';requestId:string;status:Exclude<MaterialRequestStatus,'requested'>;note:string} | {kind:'disposition';requestId:string;disposition:'used'|'returned';quantity:number;actor:string;note:string;serialLot?:string}
