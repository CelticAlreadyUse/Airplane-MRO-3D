import { DEMO_AIRCRAFT_ID,type Finding,type FindingPhoto,type FindingStatus } from '../types/findings'
import { reviewChecks,type RepairCard,type RepairCommand,type RepairMaterialSnapshot } from '../types/repairWork'
import { inventoryParts } from '../data/operations'
import { hasUnsettledMaterials,materialQuantities,validMaterialRequests } from './materialRequests'

const text=(value:unknown,min:number,max:number):value is string=>typeof value==='string'&&value.trim().length>=min&&value.length<=max
const date=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value))
export function validRepairPhotos(value:unknown):value is FindingPhoto[]{
  if(!Array.isArray(value)||value.length<1||value.length>3)return false
  const ids=new Set<string>()
  return value.every(p=>{if(!p||!text(p.id,1,100)||ids.has(p.id)||!text(p.name,1,255)||!(p.blob instanceof Blob)||p.blob.type!=='image/jpeg'||p.blob.size<1||p.blob.size>1024*1024)return false;ids.add(p.id);return true})
}
function validCard(card:RepairCard):boolean{
  if(!card||!text(card.id,1,100)||!text(card.technician,2,80)||!date(card.startedAt)||!date(card.completedAt)||Date.parse(card.completedAt)<=Date.parse(card.startedAt)||!text(card.actions,10,4000)||!text(card.reference,5,500)||!date(card.submittedAt)||!validRepairPhotos(card.beforePhotos)||!validRepairPhotos(card.afterPhotos)||!Array.isArray(card.materials))return false
  const ids=new Set<string>()
  for(const m of card.materials){
    if(!m||!text(m.requestId,1,100)||ids.has(m.requestId)||!inventoryParts.some(p=>p.id===m.partId)||!text(m.name,1,120)||!text(m.partNumber,1,120)||!text(m.unit,1,40)||!Number.isInteger(m.issued)||m.issued<1||!Number.isInteger(m.used)||m.used<0||!Number.isInteger(m.returned)||m.returned<0||m.used+m.returned!==m.issued||!Array.isArray(m.dispositions))return false
    const request={id:m.requestId,partId:m.partId,quantity:m.issued,status:'issued',note:'Snapshot material',createdAt:card.submittedAt,updatedAt:card.submittedAt,dispositions:m.dispositions}
    if(!validMaterialRequests([request]))return false
    const quantities=materialQuantities(request as Parameters<typeof materialQuantities>[0])
    if(quantities.used!==m.used||quantities.returned!==m.returned)return false
    ids.add(m.requestId)
  }
  const review=card.review
  if(review){
    if(!text(review.id,1,100)||!text(review.inspector,2,80)||!['accepted','rework'].includes(review.result)||!text(review.note,10,2000)||!date(review.at)||!Array.isArray(review.checks)||new Set(review.checks).size!==review.checks.length||review.checks.some(c=>!Object.hasOwn(reviewChecks,c)))return false
    if(review.result==='accepted'&&review.checks.length!==Object.keys(reviewChecks).length)return false
  }
  return true
}
export function validRepairCards(value:unknown):boolean{
  if(value===undefined)return true
  if(!Array.isArray(value))return false
  const ids=new Set<string>()
  return value.every((card,i)=>{if(!validCard(card)||ids.has(card.id)||(i<value.length-1&&!card.review))return false;ids.add(card.id);return true})
}
export function repairSubmissionIssue(finding:Finding):string{
  if(finding.status==='closed')return 'Buka kembali pekerjaan untuk membuat kartu pengerjaan baru.'
  if(finding.status==='awaiting_review')return 'Kartu sedang menunggu pemeriksaan. Periksa hasil terlebih dahulu.'
  if(hasUnsettledMaterials(finding))return 'Selesaikan permintaan material dan catat seluruh part yang dipakai atau dikembalikan terlebih dahulu.'
  return ''
}
export function statusChangeIssue(finding:Finding,next:FindingStatus):string{
  if(next===finding.status)return ''
  if(finding.status==='awaiting_review')return 'Selesaikan pemeriksaan kartu untuk menerima hasil atau meminta pengerjaan ulang.'
  if(['closed','awaiting_review','rework'].includes(next))return 'Gunakan kartu pengerjaan dan pemeriksaan hasil untuk mengubah status ini.'
  return ''
}
export function applyRepairCommand(current:Finding,revision:number,command:RepairCommand,at=new Date().toISOString()):Finding{
  if(current.aircraftId!==DEMO_AIRCRAFT_ID)throw new Error('Pekerjaan tidak ditemukan pada pesawat demo.')
  if(current.revision!==revision)throw new Error('Pekerjaan sudah berubah. Tutup dialog dan gunakan versi terbaru.')
  if(!validRepairCards(current.repairCards)||!validMaterialRequests(current.materialRequests))throw new Error('Kartu atau material lama belum dapat dibaca. Data tidak diubah.')
  const cards=current.repairCards??[]
  if(command.kind==='submit'){
    const issue=repairSubmissionIssue(current)
    if(issue)throw new Error(issue)
    if(cards.at(-1)&&!cards.at(-1)!.review)throw new Error('Kartu sebelumnya belum diperiksa.')
    const draft=command.draft
    const materials:RepairMaterialSnapshot[]=(current.materialRequests??[]).filter(r=>r.status==='issued').map(r=>{const p=inventoryParts.find(p=>p.id===r.partId)!,q=materialQuantities(r);return {requestId:r.id,partId:p.id,name:p.name,partNumber:p.partNumber,unit:p.unit,issued:r.quantity,used:q.used,returned:q.returned,dispositions:(r.dispositions??[]).map(e=>({...e}))}})
    const card:RepairCard={id:crypto.randomUUID(),technician:draft.technician.trim(),startedAt:draft.startedAt,completedAt:draft.completedAt,actions:draft.actions.trim(),reference:draft.reference.trim(),beforePhotos:[...draft.beforePhotos],afterPhotos:[...draft.afterPhotos],submittedAt:at,materials}
    if(!validCard(card))throw new Error('Lengkapi teknisi, waktu mulai/selesai, tindakan, rujukan, serta 1–3 foto sebelum dan sesudah yang valid.')
    if(Date.parse(card.completedAt)>Date.parse(at)+5*60*1000)throw new Error('Waktu selesai tidak boleh berada di masa mendatang.')
    return {...current,status:'awaiting_review',repairCards:[...cards,card],updatedAt:at,revision:current.revision+1,history:[...current.history,{id:crypto.randomUUID(),at,actor:card.technician,type:'repair_submitted',repairCardId:card.id,from:current.status,to:'awaiting_review',note:'Kartu pengerjaan dan bukti foto diajukan untuk pemeriksaan demo.'}]}
  }
  const latest=cards.at(-1)
  if(current.status!=='awaiting_review'||!latest||latest.id!==command.cardId||latest.review)throw new Error('Hanya kartu terbaru yang sedang menunggu pemeriksaan dapat dinilai.')
  const inspector=command.inspector.trim(),note=command.note.trim()
  if(!text(inspector,2,80)||!text(note,10,2000)||!['accepted','rework'].includes(command.result))throw new Error('Isi nama pemeriksa dan catatan hasil minimal 10 karakter.')
  const normalized=(s:string)=>s.trim().replace(/\s+/g,' ').toLocaleLowerCase('id')
  if(normalized(inspector)===normalized(latest.technician))throw new Error('Nama pemeriksa harus berbeda dari teknisi yang tercatat.')
  if(!Array.isArray(command.checks)||new Set(command.checks).size!==command.checks.length||command.checks.some(c=>!Object.hasOwn(reviewChecks,c)))throw new Error('Pilih butir pemeriksaan yang tersedia.')
  if(command.result==='accepted'&&command.checks.length!==Object.keys(reviewChecks).length)throw new Error('Tinjau seluruh butir pemeriksaan sebelum menerima hasil.')
  const review={id:crypto.randomUUID(),inspector,result:command.result,note,checks:[...command.checks],at}
  const status=command.result==='accepted'?'closed':'rework'
  return {...current,status,repairCards:cards.map(c=>c.id===latest.id?{...c,review}:c),updatedAt:at,revision:current.revision+1,history:[...current.history,{id:crypto.randomUUID(),at,actor:inspector,type:command.result==='accepted'?'repair_accepted':'repair_rework',repairCardId:latest.id,from:current.status,to:status,note}]}
}
