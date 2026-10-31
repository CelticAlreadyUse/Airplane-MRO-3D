import {DEMO_AIRCRAFT_ID,findingCategories,findingStatuses,type Finding} from '../types/findings'
import {isFindingSeverity} from '../types/severity'
import {validMaterialRequests,inventoryWithRequests,materialQuantities} from './materialRequests'
import {validRepairCards} from './repairWork'

export const BACKUP_LIMITS={fileBytes:64*1024*1024,photoBytes:1024*1024,totalPhotoBytes:40*1024*1024,photos:300,records:200,cards:40,requests:100,events:2000,dispositions:200} as const
export const findingEventTypes=['created','status_changed','severity_changed','material_requested','material_prepared','material_issued','material_cancelled','material_used','material_returned','repair_submitted','repair_accepted','repair_rework','backup_restored'] as const
export function object(value:unknown):value is Record<string,any>{return !!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)}
export function keys(value:unknown,allowed:string[],label:string):asserts value is Record<string,any>{
  if(!object(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw new Error(`${label}: struktur atau kolom tidak dikenali.`)
}
const text=(v:unknown,min:number,max:number)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))
const id=(v:unknown)=>text(v,1,100)
const optional=(v:unknown,check:(v:unknown)=>boolean)=>v===undefined||check(v)
function unique(values:string[],label:string){if(new Set(values).size!==values.length)throw new Error(`${label}: ID duplikat.`)}
function photos(value:unknown,label:string,min=0){
  if(!Array.isArray(value)||value.length<min||value.length>3)throw new Error(`${label}: jumlah foto tidak valid.`)
  unique(value.map(p=>p?.id),label)
  for(const p of value){
    keys(p,['id','name','blob'],label)
    if(!id(p.id)||!text(p.name,1,255)||!(p.blob instanceof Blob)||p.blob.type!=='image/jpeg'||p.blob.size<1||p.blob.size>BACKUP_LIMITS.photoBytes)throw new Error(`${label}: foto belum valid.`)
  }
}
function disposition(e:unknown){
  keys(e,['id','kind','quantity','actor','note','at','serialLot'],'Catatan material')
  if(!id(e.id)||!['used','returned'].includes(e.kind)||!text(e.actor,2,80)||!text(e.note,5,1000)||!date(e.at)||!optional(e.serialLot,v=>text(v,0,100)))throw new Error('Catatan pemakaian/pengembalian tidak valid.')
}
/** Strict on untrusted imports; optional old fields stay absent. Never infer a
 * repair card or severity value for a legacy finding. */
export function validateBackupRecords(value:unknown,identities:ReadonlyMap<string,string>):asserts value is Finding[]{
  if(!Array.isArray(value)||value.length>BACKUP_LIMITS.records)throw new Error('Backup memuat terlalu banyak pekerjaan atau bukan daftar pekerjaan.')
  unique(value.map(f=>f?.id),'Pekerjaan')
  for(const f of value){
    keys(f,['sample','id','aircraftId','assetId','componentLabel','sourceName','title','description','category','priority','severity','status','createdAt','updatedAt','revision','photos','history','materialRequests','repairCards'],'Pekerjaan')
    if(!id(f.id)||f.aircraftId!==DEMO_AIRCRAFT_ID||identities.get(f.assetId)!==f.sourceName||!text(f.componentLabel,1,500)||!text(f.title,3,120)||!text(f.description,10,2000)||!Object.hasOwn(findingCategories,f.category)||!Object.hasOwn(findingStatuses,f.status)||!['normal','high'].includes(f.priority)||!optional(f.sample,v=>typeof v==='boolean')||!optional(f.severity,isFindingSeverity)||!date(f.createdAt)||!date(f.updatedAt)||!Number.isSafeInteger(f.revision)||f.revision<1||f.revision>Number.MAX_SAFE_INTEGER-10000)throw new Error('Identitas, status, atau isi pekerjaan pada backup tidak valid.')
    photos(f.photos,'Foto temuan')
    if(!Array.isArray(f.history)||f.history.length>=BACKUP_LIMITS.events)throw new Error('Riwayat pekerjaan terlalu besar atau tidak valid untuk backup (maksimal 1.999 peristiwa).')
    unique(f.history.map((e:any)=>e?.id),'Riwayat')
    for(const e of f.history){
      keys(e,['id','at','actor','type','repairCardId','requestId','fromSeverity','toSeverity','from','to','note'],'Riwayat')
      if(!id(e.id)||!date(e.at)||!text(e.actor,1,80)||!findingEventTypes.includes(e.type)||!Object.hasOwn(findingStatuses,e.to)||!optional(e.from,v=>Object.hasOwn(findingStatuses,String(v)))||!optional(e.fromSeverity,isFindingSeverity)||!optional(e.toSeverity,isFindingSeverity)||!optional(e.repairCardId,id)||!optional(e.requestId,id)||!text(e.note,1,5000))throw new Error('Salah satu peristiwa riwayat tidak valid.')
    }
    if(f.materialRequests!==undefined){
      if(!Array.isArray(f.materialRequests)||f.materialRequests.length>BACKUP_LIMITS.requests)throw new Error('Daftar permintaan material terlalu besar.')
      for(const r of f.materialRequests){
        keys(r,['id','partId','quantity','note','status','createdAt','updatedAt','dispositions'],'Permintaan material')
        if(!id(r.id)||!date(r.createdAt)||!date(r.updatedAt))throw new Error('Identitas permintaan material tidak valid.')
        if(r.dispositions!==undefined){
          if(!Array.isArray(r.dispositions)||r.dispositions.length>BACKUP_LIMITS.dispositions)throw new Error('Riwayat material terlalu besar.')
          r.dispositions.forEach(disposition)
        }
      }
      if(!validMaterialRequests(f.materialRequests))throw new Error('Jumlah atau status material tidak konsisten.')
    }
    if(f.repairCards!==undefined){
      if(!Array.isArray(f.repairCards)||f.repairCards.length>BACKUP_LIMITS.cards)throw new Error('Daftar kartu pengerjaan terlalu besar.')
      for(const card of f.repairCards){
        keys(card,['id','technician','startedAt','completedAt','actions','reference','beforePhotos','afterPhotos','submittedAt','materials','review'],'Kartu pengerjaan')
        photos(card.beforePhotos,'Foto sebelum',1);photos(card.afterPhotos,'Foto sesudah',1)
        if(!Array.isArray(card.materials)||card.materials.length>BACKUP_LIMITS.requests)throw new Error('Snapshot material tidak valid.')
        for(const m of card.materials){
          keys(m,['requestId','partId','name','partNumber','unit','issued','used','returned','dispositions'],'Snapshot material')
          if(!Array.isArray(m.dispositions)||m.dispositions.length>BACKUP_LIMITS.dispositions)throw new Error('Snapshot transaksi terlalu besar.')
          m.dispositions.forEach(disposition)
          const current=f.materialRequests?.find((r:any)=>r.id===m.requestId)
          if(!current||current.status!=='issued'||current.partId!==m.partId||current.quantity!==m.issued||m.dispositions.some((e:any)=>!current.dispositions?.some((d:any)=>['id','kind','quantity','actor','note','at','serialLot'].every(k=>d[k]===e[k]))))throw new Error('Snapshot kartu tidak sesuai riwayat material pekerjaan.')
        }
        if(card.review!==undefined){keys(card.review,['id','inspector','result','note','checks','at'],'Pemeriksaan');if(!Array.isArray(card.review.checks)||card.review.checks.length>3)throw new Error('Butir pemeriksaan tidak valid.')}
      }
      if(!validRepairCards(f.repairCards))throw new Error('Kartu pengerjaan atau hasil pemeriksaan tidak valid.')
    }
    const latest=f.repairCards?.at(-1)
    if((f.status==='awaiting_review'&&(!latest||latest.review))||(latest&&!latest.review&&f.status!=='awaiting_review')||(f.status==='rework'&&latest?.review?.result!=='rework')||(f.status==='closed'&&latest&&latest.review?.result!=='accepted'))throw new Error('Status pekerjaan tidak sesuai kartu pemeriksaan.')
    for(const e of f.history){
      if(e.requestId&&!f.materialRequests?.some((r:any)=>r.id===e.requestId))throw new Error('Riwayat menunjuk permintaan material yang hilang.')
      if(e.repairCardId&&!f.repairCards?.some((c:any)=>c.id===e.repairCardId))throw new Error('Riwayat menunjuk kartu yang hilang.')
    }
  }
  const stocks=inventoryWithRequests(value as Finding[])
  if(stocks.some(p=>p.quantity<0||p.reserved<0||p.quantity<p.reserved))throw new Error('Transaksi pada backup melebihi stok demo yang tersedia.')
  // Legacy issued records may have no disposition yet; that is preserved.
  for(const f of value as Finding[])for(const r of f.materialRequests??[])if(materialQuantities(r).remaining<0)throw new Error('Pemakaian material melebihi jumlah diserahkan.')
}
