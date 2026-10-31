import { isFindingSeverity,getFindingSeverity,type FindingSeverity } from '../types/severity'
import { DEMO_AIRCRAFT_ID, findingCategories, findingStatuses, type Finding, type FindingDraft, type FindingStatus } from '../types/findings'
import type { AircraftComponent } from '../data/components'
import type { MaterialCommand } from '../types/materialRequests'
import { applyMaterialCommand,validMaterialRequests } from './materialRequests'
import { applyRepairCommand,statusChangeIssue,validRepairCards } from './repairWork'
import type { RepairCommand } from '../types/repairWork'

export type FindingsSpace = 'practice' | 'scenario'
const databaseNames:Record<FindingsSpace,string>={practice:'mro-visual-findings-demo',scenario:'mro-visual-scenario-v1'}
const STORE = 'findings'

function openDatabase(space:FindingsSpace='practice'): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    if (typeof indexedDB === 'undefined') { reject(new Error('Penyimpanan browser tidak tersedia.')); return }
    let blocked=false
    const request = indexedDB.open(databaseNames[space],1)
    request.onupgradeneeded = ()=>request.result.createObjectStore(STORE,{keyPath:'id'})
    request.onerror = ()=>reject(new Error('Penyimpanan lokal belum dapat dibuka. Periksa izin browser dan coba lagi.'))
    request.onblocked = ()=>{blocked=true;reject(new Error('Penyimpanan sedang digunakan tab lain. Tutup tab lama dan coba lagi.'))}
    request.onsuccess = ()=>{
      const db = request.result
      if(blocked){db.close();return}
      db.onversionchange = ()=>db.close()
      resolve(db)
    }
  })
}

export async function listFindings(space:FindingsSpace='practice'): Promise<Finding[]> {
  const db = await openDatabase(space)
  try {
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly')
      const request=tx.objectStore(STORE).getAll()
      tx.oncomplete=()=>{
        try {
          const records=request.result as Finding[]
          if(records.some(f=>!f || typeof f.id!=='string' || typeof f.aircraftId!=='string' || typeof f.assetId!=='string' || typeof f.sourceName!=='string' || typeof f.componentLabel!=='string' || typeof f.title!=='string' || typeof f.description!=='string' || !Object.hasOwn(findingStatuses,f.status) || !Object.hasOwn(findingCategories,f.category) || (f.severity!==undefined && !isFindingSeverity(f.severity)) || !validMaterialRequests(f.materialRequests) || !validRepairCards(f.repairCards) || !Number.isInteger(f.revision) || f.revision<1 || !Number.isFinite(Date.parse(f.createdAt)) || !Array.isArray(f.photos) || f.photos.some(p=>!(p.blob instanceof Blob)) || !Array.isArray(f.history) || f.history.some(e=>!Number.isFinite(Date.parse(e.at)) || !Object.hasOwn(findingStatuses,e.to)))) {
            reject(new Error('Sebagian catatan lokal tidak dapat dibaca. Data tetap disimpan dan tidak diubah.'));return
          }
          resolve(records.filter(f=>f.aircraftId===DEMO_AIRCRAFT_ID).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))
        } catch {reject(new Error('Catatan lokal belum dapat dibaca. Data tetap disimpan.'))}
      }
      tx.onerror=tx.onabort=()=>reject(new Error('Catatan belum dapat dibaca. Coba muat ulang penyimpanan.'))
    })
  } catch(cause) {
    if(cause instanceof DOMException) throw new Error('Catatan belum dapat dibaca. Periksa izin penyimpanan browser lalu coba lagi.')
    throw cause
  } finally { db.close() }
}

export async function createFinding(component: AircraftComponent, draft: FindingDraft,space:FindingsSpace='practice'): Promise<Finding> {
  const title=draft.title.trim(), description=draft.description.trim()
  if (title.length<3 || title.length>120) throw new Error('Judul perlu diisi 3–120 karakter.')
  if (description.length<10 || description.length>2000) throw new Error('Deskripsi perlu diisi 10–2.000 karakter.')
  if (!Object.hasOwn(findingCategories,draft.category) || !['normal','high'].includes(draft.priority)) throw new Error('Pilih kategori dan prioritas yang tersedia.')
  if (draft.severity!==undefined && !isFindingSeverity(draft.severity)) throw new Error('Pilih tingkat kritis yang tersedia.')
  if (!component.id || !component.sourceName) throw new Error('Pilih komponen sebelum mencatat temuan.')
  if (draft.photos.length>3 || draft.photos.some(p=>!(p.blob instanceof Blob) || p.blob.type!=='image/jpeg' || p.blob.size>1024*1024)) throw new Error('Lampirkan paling banyak 3 foto yang sudah diproses aplikasi.')
  const now=new Date().toISOString()
  const finding: Finding={
    id:crypto.randomUUID(),aircraftId:DEMO_AIRCRAFT_ID,assetId:component.id,
    componentLabel:component.label,sourceName:component.sourceName,
    title,description,category:draft.category,priority:draft.priority,severity:draft.severity??'unassessed',status:'open',
    createdAt:now,updatedAt:now,revision:1,photos:draft.photos,
    history:[{id:crypto.randomUUID(),at:now,actor:'Pengguna demo',type:'created',to:'open',note:'Temuan dibuat.',toSeverity:draft.severity??'unassessed'}],
  }
  const db=await openDatabase(space)
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite')
      tx.oncomplete=()=>resolve()
      tx.onerror=tx.onabort=()=>reject(new Error('Temuan belum tersimpan. Penyimpanan mungkin penuh atau tidak diizinkan. Draf tetap tersedia.'))
      tx.objectStore(STORE).add(finding)
    })
    return finding
  } catch(cause) {
    if(cause instanceof DOMException) throw new Error('Temuan belum tersimpan. Periksa ruang dan izin penyimpanan browser. Draf tetap tersedia.')
    throw cause
  } finally { db.close() }
}

export async function changeFindingStatus(id:string, expectedRevision:number, status:FindingStatus, note:string,space:FindingsSpace='practice',severity?:FindingSeverity): Promise<Finding> {
  const cleanNote=note.trim()
  if (severity!==undefined && !isFindingSeverity(severity)) throw new Error('Pilih tingkat kritis yang tersedia.')
  if (!Object.hasOwn(findingStatuses,status)) throw new Error('Pilih status yang tersedia.')
  if (cleanNote.length<5 || cleanNote.length>1000) throw new Error('Catatan tindak lanjut perlu diisi 5–1.000 karakter.')
  const db=await openDatabase(space)
  try {
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite')
      let result:Finding|undefined
      let reason='Perubahan belum tersimpan. Draf tetap tersedia; coba lagi.'
      tx.oncomplete=()=>result ? resolve(result) : reject(new Error(reason))
      tx.onerror=tx.onabort=()=>reject(new Error(reason))
      const store=tx.objectStore(STORE)
      const request=store.get(id)
      request.onsuccess=()=>{
        const current=request.result as Finding|undefined
        if (!current || current.aircraftId!==DEMO_AIRCRAFT_ID) { reason='Temuan tidak ditemukan pada pesawat demo ini.'; tx.abort(); return }
        if (current.revision!==expectedRevision) { reason='Temuan sudah berubah di tab lain. Muat versi terbaru sebelum menyimpan.'; tx.abort(); return }
        const workflowIssue=statusChangeIssue(current,status)
        if(workflowIssue){reason=workflowIssue;tx.abort();return}
        const previousSeverity=getFindingSeverity(current)
        const severityChanged=severity!==undefined && severity!==previousSeverity
        if (current.status===status && !severityChanged) { reason='Pilih status atau tingkat kritis yang berbeda dari catatan saat ini.'; tx.abort(); return }
        const at=new Date().toISOString()
        result={...current,status,...(severity!==undefined?{severity}:{}),updatedAt:at,revision:current.revision+1,
          history:[...current.history,{id:crypto.randomUUID(),at,actor:'Pengguna demo',type:current.status===status?'severity_changed':'status_changed',from:current.status,to:status,...(severityChanged?{fromSeverity:previousSeverity,toSeverity:severity}:{}),note:cleanNote}]}
        store.put(result)
      }
    })
  } catch(cause) {
    if(cause instanceof DOMException) throw new Error('Perubahan belum tersimpan. Periksa ruang dan izin penyimpanan browser. Draf tetap tersedia.')
    throw cause
  } finally { db.close() }
}

/** Read all work and commit one revision in a single serialized transaction.
 * Allocations across different jobs therefore cannot overbook the same stock. */
export async function changeFindingMaterial(id:string,expectedRevision:number,command:MaterialCommand,space:FindingsSpace='practice'):Promise<Finding>{
  const db=await openDatabase(space)
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE)
      let result:Finding|undefined,reason='Permintaan belum tersimpan. Draf tetap tersedia; coba lagi.'
      tx.oncomplete=()=>result?resolve(result):reject(new Error(reason))
      tx.onerror=tx.onabort=()=>reject(new Error(reason))
      const request=store.getAll()
      request.onsuccess=()=>{
        try{
          const records=request.result as Finding[],current=records.find(f=>f.id===id)
          if(!current)throw new Error('Pekerjaan tidak ditemukan.')
          if(records.some(f=>f.aircraftId===DEMO_AIRCRAFT_ID && !validMaterialRequests(f.materialRequests)))throw new Error('Sebagian permintaan lokal belum dapat dibaca. Data tidak diubah.')
          result=applyMaterialCommand(records,current,expectedRevision,command)
          store.put(result)
        }catch(cause){reason=cause instanceof Error?cause.message:reason;tx.abort()}
      }
    })
  }catch(cause){
    if(cause instanceof DOMException)throw new Error('Permintaan belum tersimpan. Periksa ruang dan izin penyimpanan browser.')
    throw cause
  }finally{db.close()}
}

export async function changeFindingRepair(id:string,expectedRevision:number,command:RepairCommand,space:FindingsSpace='practice'):Promise<Finding>{
  const db=await openDatabase(space)
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE)
      let result:Finding|undefined,reason='Kartu belum tersimpan. Draf tetap tersedia.'
      tx.oncomplete=()=>result?resolve(result):reject(new Error(reason))
      tx.onerror=tx.onabort=()=>reject(new Error(reason))
      const request=store.get(id)
      request.onsuccess=()=>{
        try{
          if(!request.result)throw new Error('Pekerjaan tidak ditemukan.')
          result=applyRepairCommand(request.result as Finding,expectedRevision,command)
          store.put(result)
        }catch(cause){reason=cause instanceof Error?cause.message:reason;tx.abort()}
      }
    })
  }catch(cause){
    if(cause instanceof DOMException)throw new Error('Kartu belum tersimpan. Periksa ruang dan izin penyimpanan browser. Draf tetap tersedia.')
    throw cause
  }finally{db.close()}
}

/** Reset only the dedicated presentation database, never the practice notebook. */
export async function replaceScenarioFindings(findings:Finding[]):Promise<void> {
  if(findings.length!==3 || findings.some(f=>!f.sample || f.aircraftId!==DEMO_AIRCRAFT_ID))throw new Error('Skenario contoh belum lengkap.')
  const db=await openDatabase('scenario')
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite')
      tx.oncomplete=()=>resolve()
      tx.onerror=tx.onabort=()=>reject(new Error('Demo belum dapat diulang. Data sebelumnya tetap tersedia.'))
      const store=tx.objectStore(STORE)
      try {
        store.clear()
        for(const finding of findings)store.put(finding)
      } catch {tx.abort()}
    })
  } catch(cause) {
    if(cause instanceof DOMException)throw new Error('Demo belum tersimpan. Periksa ruang dan izin penyimpanan browser.')
    throw cause
  } finally {db.close()}
}

/** Read the target afresh, including malformed known-aircraft rows, so a valid
 * backup can replace a damaged notebook. The signature is not an authenticity
 * claim; it is a guard against intervening writes while a preview is open. */
export async function getRestoreState(space:FindingsSpace):Promise<{token:string;count:number}>{
  const {findingSnapshotToken}=await import('./backupCodec')
  const db=await openDatabase(space)
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).getAll()
    tx.oncomplete=()=>{try{const records=(request.result as Finding[]).filter(f=>f?.aircraftId===DEMO_AIRCRAFT_ID);resolve({token:findingSnapshotToken(records),count:records.length})}catch{reject(new Error('Kondisi data saat ini belum dapat dibaca.'))}}
    tx.onerror=tx.onabort=()=>reject(new Error('Kondisi data saat ini belum dapat dibaca.'))
  })}finally{db.close()}
}
export async function restoreFindingsBackup(file:Blob,expectedToken:string):Promise<{records:Finding[];space:FindingsSpace}>{
  const {decodeBackup,getBackupContext,findingSnapshotToken}=await import('./backupCodec')
  const decoded=await decodeBackup(file,await getBackupContext()),space=decoded.summary.space
  const db=await openDatabase(space)
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),request=store.getAll()
    let restored:Finding[]|undefined,reason='Backup belum dipulihkan. Data lama tetap tersimpan.'
    tx.oncomplete=()=>restored?resolve({records:restored,space}):reject(new Error(reason))
    tx.onerror=tx.onabort=()=>reject(new Error(reason))
    request.onsuccess=()=>{try{
      const all=request.result as Finding[],current=all.filter(f=>f?.aircraftId===DEMO_AIRCRAFT_ID)
      if(findingSnapshotToken(current)!==expectedToken)throw new Error('Data berubah setelah pratinjau. Validasi ulang file sebelum memulihkan.')
      if(decoded.records.some(f=>all.some(existing=>existing.id===f.id&&existing.aircraftId!==DEMO_AIRCRAFT_ID)))throw new Error('ID backup bertabrakan dengan data pesawat lain.')
      const maximum=[...current,...decoded.records].reduce((n,f)=>Number.isSafeInteger(f.revision)?Math.max(n,f.revision):n,Date.now())
      if(maximum>Number.MAX_SAFE_INTEGER-decoded.records.length-2)throw new Error('Nomor revisi data sudah melewati batas pemulihan.')
      const at=new Date().toISOString()
      restored=decoded.records.map((f,i)=>({...f,revision:maximum+i+1,updatedAt:at,history:[...f.history,{id:crypto.randomUUID(),at,actor:'Pengguna demo',type:'backup_restored',to:f.status,note:`Data dipulihkan dari backup mode ${space==='practice'?'latihan':'presentasi'} bertanggal ${decoded.summary.exportedAt}.`}]}))
      for(const record of current)store.delete(record.id)
      for(const record of restored)store.put(record)
    }catch(cause){reason=cause instanceof Error?cause.message:reason;tx.abort()}}
  })}catch(cause){if(cause instanceof DOMException)throw new Error('Pemulihan gagal. Data lama tetap tersimpan. Periksa ruang dan izin penyimpanan.');throw cause}finally{db.close()}
}
