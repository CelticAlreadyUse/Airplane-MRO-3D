import { inventoryParts,type InventoryPart } from '../data/operations'
import { DEMO_AIRCRAFT_ID,type Finding,type FindingEvent } from '../types/findings'
import { materialRequestStatuses,type MaterialCommand,type MaterialRequest,type MaterialRequestStatus } from '../types/materialRequests'

export const workOrderCode=(finding:Pick<Finding,'id'>)=>`WO-${finding.id.replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase()}`
export const hasUnfulfilledMaterialRequests=(finding:Finding)=>(finding.materialRequests??[]).some(r=>r.status==='requested'||r.status==='ready')
export function materialQuantities(request:MaterialRequest){
  const used=(request.dispositions??[]).filter(e=>e.kind==='used').reduce((sum,e)=>sum+e.quantity,0)
  const returned=(request.dispositions??[]).filter(e=>e.kind==='returned').reduce((sum,e)=>sum+e.quantity,0)
  return {used,returned,remaining:request.status==='issued'?request.quantity-used-returned:0}
}
export const hasUnsettledMaterials=(finding:Finding)=>hasUnfulfilledMaterialRequests(finding)||(finding.materialRequests??[]).some(r=>materialQuantities(r).remaining>0)
export const materialEditingAllowed=(finding:Finding)=>finding.status!=='closed'&&finding.status!=='awaiting_review'
export function materialWorkLabel(finding:Finding){
  const requests=finding.materialRequests??[]
  if(requests.some(r=>r.status==='requested'))return 'Menunggu sparepart'
  if(requests.some(r=>r.status==='ready'))return 'Sparepart disiapkan'
  if(requests.some(r=>materialQuantities(r).remaining>0))return 'Catat pemakaian part'
  if(requests.some(r=>materialQuantities(r).used>0))return 'Pemakaian part tercatat'
  if(requests.some(r=>materialQuantities(r).returned>0))return 'Part dikembalikan'
  return requests.length?'Permintaan dibatalkan':''
}
export function inventoryWithRequests(findings:readonly Finding[]):InventoryPart[]{
  const totals=new Map<string,{ready:number;issued:number}>()
  for(const finding of findings){
    if(finding.aircraftId!==DEMO_AIRCRAFT_ID)continue
    for(const r of finding.materialRequests??[]){
      const total=totals.get(r.partId)??{ready:0,issued:0}
      if(r.status==='ready')total.ready+=r.quantity
      if(r.status==='issued')total.issued+=r.quantity-materialQuantities(r).returned
      totals.set(r.partId,total)
    }
  }
  return inventoryParts.map(part=>({...part,quantity:part.quantity-(totals.get(part.id)?.issued??0),reserved:part.reserved+(totals.get(part.id)?.ready??0)}))
}
export function validMaterialRequests(value:unknown):boolean{
  if(value===undefined)return true
  if(!Array.isArray(value))return false
  const ids=new Set<string>()
  return value.every(r=>{
    if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||!inventoryParts.some(p=>p.id===r.partId)||!Number.isInteger(r.quantity)||r.quantity<1||r.quantity>999||typeof r.note!=='string'||r.note.length<5||r.note.length>1000||!Object.hasOwn(materialRequestStatuses,r.status)||!Number.isFinite(Date.parse(r.createdAt))||!Number.isFinite(Date.parse(r.updatedAt)))return false
    if(r.dispositions!==undefined){
      if(!Array.isArray(r.dispositions)||r.status!=='issued')return false
      const eventIds=new Set<string>()
      for(const e of r.dispositions){
        if(!e||typeof e.id!=='string'||!e.id||eventIds.has(e.id)||!['used','returned'].includes(e.kind)||!Number.isInteger(e.quantity)||e.quantity<1||typeof e.actor!=='string'||e.actor.trim().length<2||e.actor.length>80||typeof e.note!=='string'||e.note.trim().length<5||e.note.length>1000||!Number.isFinite(Date.parse(e.at))||(e.serialLot!==undefined&&(typeof e.serialLot!=='string'||e.serialLot.length>100)))return false
        eventIds.add(e.id)
      }
      if(materialQuantities(r).remaining<0)return false
    }
    ids.add(r.id);return true
  })
}
function checkedNote(value:string){
  const note=value.trim()
  if(note.length<5||note.length>1000)throw new Error('Ajukan alasan atau catatan 5–1.000 karakter.')
  return note
}
export function applyMaterialCommand(findings:readonly Finding[],current:Finding,expectedRevision:number,command:MaterialCommand,at=new Date().toISOString()):Finding{
  if(current.aircraftId!==DEMO_AIRCRAFT_ID)throw new Error('Pekerjaan tidak ditemukan pada pesawat demo ini.')
  if(current.revision!==expectedRevision)throw new Error('Pekerjaan sudah berubah. Tutup dialog dan gunakan data terbaru sebelum menyimpan.')
  if(!materialEditingAllowed(current))throw new Error('Material tidak dapat diubah saat pekerjaan ditutup atau menunggu pemeriksaan.')
  const requests=current.materialRequests??[]
  if(!validMaterialRequests(requests))throw new Error('Permintaan lama belum dapat dibaca. Data tidak diubah.')
  let updated:MaterialRequest[],note:string,eventType:FindingEvent['type'],requestId:string,part:InventoryPart|undefined,quantity:number
  if(command.kind==='request'){
    const draft=command.draft
    part=inventoryParts.find(p=>p.id===draft.partId);quantity=draft.quantity;note=checkedNote(draft.note)
    if(!part)throw new Error('Pilih sparepart dari katalog demo.')
    if(!Number.isInteger(quantity)||quantity<1||quantity>999)throw new Error('Jumlah harus bilangan bulat 1–999.')
    if(requests.some(r=>r.partId===part!.id&&(r.status==='requested'||r.status==='ready')))throw new Error('Part ini masih memiliki permintaan aktif pada pekerjaan yang sama. Selesaikan atau batalkan permintaan tersebut dahulu.')
    requestId=crypto.randomUUID();eventType='material_requested'
    updated=[...requests,{id:requestId,partId:part.id,quantity,note,status:'requested',createdAt:at,updatedAt:at}]
  }else if(command.kind==='disposition'){
    const request=requests.find(r=>r.id===command.requestId)
    if(!request||request.status!=='issued')throw new Error('Catat pemakaian atau pengembalian setelah part diserahkan.')
    quantity=command.quantity;note=checkedNote(command.note)
    const actor=command.actor.trim(),serialLot=command.serialLot?.trim()
    if(!['used','returned'].includes(command.disposition))throw new Error('Pilih pemakaian atau pengembalian.')
    if(actor.length<2||actor.length>80)throw new Error('Isi nama pelaksana 2–80 karakter.')
    if(serialLot&&serialLot.length>100)throw new Error('Nomor seri / lot paling panjang 100 karakter.')
    if(!Number.isInteger(quantity)||quantity<1||quantity>materialQuantities(request).remaining)throw new Error('Jumlah melebihi part yang belum dicatat atau tidak valid.')
    requestId=request.id;part=inventoryParts.find(p=>p.id===request.partId)!
    const disposition={id:crypto.randomUUID(),kind:command.disposition,quantity,actor,note,at,...(serialLot?{serialLot}:{})}
    updated=requests.map(r=>r.id===requestId?{...r,updatedAt:at,dispositions:[...(r.dispositions??[]),disposition]}:r)
    eventType=command.disposition==='used'?'material_used':'material_returned'
  }else{
    const request=requests.find(r=>r.id===command.requestId)
    if(!request)throw new Error('Permintaan tidak ditemukan. Muat data terbaru.')
    const allowed:Record<MaterialRequestStatus,readonly MaterialRequestStatus[]>={requested:['ready','cancelled'],ready:['issued','cancelled'],issued:[],cancelled:[]}
    if(!allowed[request.status].includes(command.status))throw new Error('Perubahan status permintaan tidak tersedia. Gunakan data terbaru.')
    note=checkedNote(command.note);requestId=request.id;quantity=request.quantity;part=inventoryParts.find(p=>p.id===request.partId)!
    if(command.status==='ready'){
      const stock=inventoryWithRequests(findings).find(p=>p.id===part!.id)!
      if(stock.quantity-stock.reserved<quantity)throw new Error(`Stok ${part.name} belum cukup: ${stock.quantity-stock.reserved} ${part.unit} tersedia. Permintaan tetap diajukan.`)
    }
    updated=requests.map(r=>r.id===requestId?{...r,status:command.status,updatedAt:at}:r)
    eventType=command.status==='ready'?'material_prepared':command.status==='issued'?'material_issued':'material_cancelled'
  }
  return {...current,materialRequests:updated,updatedAt:at,revision:current.revision+1,history:[...current.history,{id:crypto.randomUUID(),at,actor:command.kind==='disposition'?command.actor.trim():'Pengguna demo',type:eventType,requestId,to:current.status,note:`${part.name} · ${quantity} ${part.unit}. ${note}`}]}
}
