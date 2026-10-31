import {DEMO_AIRCRAFT_ID,type Finding,type FindingPhoto} from '../types/findings'
import {inventoryParts} from '../data/operations'
import {BACKUP_LIMITS,keys,object,validateBackupRecords} from './backupValidation'
import type { FindingsSpace } from './findingsRepository'

export interface BackupContext {identities:ReadonlyMap<string,string>;modelSignature:string;catalogSignature:string}
export interface BackupSummary {space:FindingsSpace;exportedAt:string;records:number;requests:number;cards:number;photos:number;attachments:number;photoBytes:number}
export interface DecodedBackup {records:Finding[];summary:BackupSummary}
interface PhotoAsset {mime:'image/jpeg';bytes:number;base64:string}
const format='mantiq-mro-backup'
export async function sha256(bytes:Uint8Array):Promise<string>{return [...new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(bytes).buffer))].map(n=>n.toString(16).padStart(2,'0')).join('')}
const hashText=(text:string)=>sha256(new TextEncoder().encode(text))
export async function buildBackupContext(manifest:unknown):Promise<BackupContext>{
  if(!Array.isArray(manifest)||!manifest.length||manifest.length>10000)throw new Error('Daftar identitas model belum tersedia.')
  const identities=new Map<string,string>()
  for(const row of manifest){if(!object(row)||typeof row.asset_object_id!=='string'||typeof row.source_object_name!=='string'||identities.has(row.asset_object_id))throw new Error('Identitas model tidak valid.');identities.set(row.asset_object_id,row.source_object_name)}
  return {identities,modelSignature:await hashText(JSON.stringify([...identities].sort(([a],[b])=>a.localeCompare(b)))),catalogSignature:await hashText(JSON.stringify(inventoryParts))}
}
let contextPromise:Promise<BackupContext>|undefined
export function getBackupContext():Promise<BackupContext>{
  if(!contextPromise)contextPromise=(async()=>{const response=await fetch('/models/component-map.json');if(!response.ok)throw new Error('Identitas model belum dapat dimuat untuk validasi backup.');return buildBackupContext(await response.json())})().catch(cause=>{contextPromise=undefined;throw cause})
  return contextPromise
}
export function findingSnapshotToken(records:readonly Finding[]):string{
  // Synchronous for comparison inside an IndexedDB transaction. Supported writes
  // always change revision; full metadata also catches scenario resets.
  return JSON.stringify([...records].sort((a,b)=>a.id.localeCompare(b.id)),(_key,value)=>value instanceof Blob?{blobBytes:value.size,blobType:value.type}:value)
}
function base64(bytes:Uint8Array){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s)}
function decodeBase64(value:string):Uint8Array{
  if(value.length>Math.ceil(BACKUP_LIMITS.photoBytes/3)*4||value.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw new Error('Encoding foto pada backup tidak valid.')
  const raw=atob(value),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0))
  if(base64(bytes)!==value)throw new Error('Encoding foto tidak kanonis.')
  return bytes
}
export function jpegDimensions(bytes:Uint8Array):{width:number;height:number}{
  if(bytes.length<12||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)throw new Error('Isi foto bukan JPEG yang lengkap.')
  let offset=2
  while(offset+4<bytes.length){
    if(bytes[offset++]!==255)throw new Error('Struktur JPEG tidak valid.')
    while(bytes[offset]===255)offset++
    const marker=bytes[offset++]!
    if(marker===0xd9||marker===0xda)break
    if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue
    const size=(bytes[offset]!<<8)|bytes[offset+1]!
    if(size<2||offset+size>bytes.length)throw new Error('Ukuran segmen JPEG tidak valid.')
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
      if(size<8)break
      const height=(bytes[offset+3]!<<8)|bytes[offset+4]!,width=(bytes[offset+5]!<<8)|bytes[offset+6]!
      if(!width||!height||width>8192||height>8192||width*height>16_000_000)throw new Error('Resolusi foto pada backup terlalu besar atau tidak valid.')
      return {width,height}
    }
    offset+=size
  }
  throw new Error('Dimensi JPEG tidak ditemukan.')
}
export function backupSummary(records:readonly Finding[],space:FindingsSpace,exportedAt:string,photos:number,photoBytes:number):BackupSummary{return {space,exportedAt,records:records.length,requests:records.reduce((n,f)=>n+(f.materialRequests?.length??0),0),cards:records.reduce((n,f)=>n+(f.repairCards?.length??0),0),photos,attachments:records.reduce((n,f)=>n+f.photos.length+(f.repairCards??[]).reduce((m,c)=>m+c.beforePhotos.length+c.afterPhotos.length,0),0),photoBytes}}
export async function encodeBackup(records:Finding[],space:FindingsSpace,context:BackupContext,exportedAt=new Date().toISOString()):Promise<{blob:Blob;summary:BackupSummary}>{
  validateBackupRecords(records,context.identities)
  const assets:Record<string,PhotoAsset>=Object.create(null),hashes=new Map<Blob,Promise<string>>()
  let photoBytes=0
  async function photo(p:FindingPhoto){
    let promise=hashes.get(p.blob)
    if(!promise){promise=(async()=>{const bytes=new Uint8Array(await p.blob.arrayBuffer());jpegDimensions(bytes);const hash=await sha256(bytes);if(!Object.hasOwn(assets,hash)){photoBytes+=bytes.length;if(photoBytes>BACKUP_LIMITS.totalPhotoBytes||Object.keys(assets).length>=BACKUP_LIMITS.photos)throw new Error('Foto terlalu banyak untuk satu backup (maksimal 40 MB foto unik).');assets[hash]={mime:'image/jpeg',bytes:bytes.length,base64:base64(bytes)}}return hash})();hashes.set(p.blob,promise)}
    return {id:p.id,name:p.name,hash:await promise}
  }
  const serialized=[]
  for(const f of records){
    const row:any={...f,photos:await Promise.all(f.photos.map(photo))}
    if(f.repairCards)row.repairCards=await Promise.all(f.repairCards.map(async c=>({...c,beforePhotos:await Promise.all(c.beforePhotos.map(photo)),afterPhotos:await Promise.all(c.afterPhotos.map(photo))})))
    serialized.push(row)
  }
  const payload={format,schemaVersion:1,aircraftId:DEMO_AIRCRAFT_ID,space,exportedAt,modelSignature:context.modelSignature,catalogSignature:context.catalogSignature,records:serialized,photos:assets}
  const blob=new Blob([JSON.stringify(payload)],{type:'application/json'})
  if(blob.size>BACKUP_LIMITS.fileBytes)throw new Error('Backup melebihi batas 64 MB.')
  return {blob,summary:backupSummary(records,space,exportedAt,Object.keys(assets).length,photoBytes)}
}
export async function decodeBackup(file:Blob,context:BackupContext):Promise<DecodedBackup>{
  if(file.size<2||file.size>BACKUP_LIMITS.fileBytes)throw new Error('Pilih file backup JSON berukuran maksimal 64 MB.')
  let data:unknown
  try{data=JSON.parse(await file.text())}catch{throw new Error('File bukan JSON backup yang dapat dibaca.')}
  keys(data,['format','schemaVersion','aircraftId','space','exportedAt','modelSignature','catalogSignature','records','photos'],'Backup')
  if(data.format!==format||data.schemaVersion!==1)throw new Error('Format atau versi backup tidak didukung.')
  if(data.aircraftId!==DEMO_AIRCRAFT_ID||data.modelSignature!==context.modelSignature||data.catalogSignature!==context.catalogSignature)throw new Error('Backup tidak cocok dengan model atau katalog stok pada versi demo ini.')
  if(!['practice','scenario'].includes(data.space)||typeof data.exportedAt!=='string'||!Number.isFinite(Date.parse(data.exportedAt)))throw new Error('Mode atau tanggal backup tidak valid.')
  if(!Array.isArray(data.records)||data.records.length>BACKUP_LIMITS.records||!object(data.photos)||Object.keys(data.photos).length>BACKUP_LIMITS.photos)throw new Error('Jumlah pekerjaan atau foto melewati batas backup.')
  const blobs=new Map<string,Blob>(),used=new Set<string>();let photoBytes=0
  for(const [hash,value] of Object.entries(data.photos)){
    keys(value,['mime','bytes','base64'],'File foto')
    if(!/^[a-f0-9]{64}$/.test(hash)||value.mime!=='image/jpeg'||!Number.isInteger(value.bytes)||value.bytes<1||value.bytes>BACKUP_LIMITS.photoBytes||typeof value.base64!=='string')throw new Error('Metadata foto backup tidak valid.')
    const bytes=decodeBase64(value.base64)
    if(bytes.length!==value.bytes||await sha256(bytes)!==hash)throw new Error('Isi atau checksum foto tidak sesuai. Backup tidak dipulihkan.')
    photoBytes+=bytes.length
    if(photoBytes>BACKUP_LIMITS.totalPhotoBytes)throw new Error('Ukuran total foto melebihi 40 MB.')
    jpegDimensions(bytes)
    const blob=new Blob([Uint8Array.from(bytes).buffer],{type:'image/jpeg'})
    if(typeof createImageBitmap==='function'){
      let bitmap:ImageBitmap|undefined
      try{bitmap=await createImageBitmap(blob)}catch{throw new Error('Salah satu foto pada backup tidak dapat dibuka.')}finally{bitmap?.close()}
    }
    blobs.set(hash,blob)
  }
  function photo(p:unknown):FindingPhoto{
    keys(p,['id','name','hash'],'Referensi foto')
    if(typeof p.hash!=='string'||!blobs.has(p.hash))throw new Error('Backup memiliki referensi foto yang hilang.')
    used.add(p.hash);return {id:p.id,name:p.name,blob:blobs.get(p.hash)!}
  }
  const records:any[]=[]
  for(const f of data.records){
    if(!object(f)||!Array.isArray(f.photos)||f.photos.length>3)throw new Error('Daftar foto pekerjaan tidak valid.')
    const row:any={...f,photos:f.photos.map(photo)}
    if(f.repairCards!==undefined){
      if(!Array.isArray(f.repairCards)||f.repairCards.length>BACKUP_LIMITS.cards)throw new Error('Daftar kartu tidak valid.')
      row.repairCards=f.repairCards.map((c:unknown)=>{
        if(!object(c)||!Array.isArray(c.beforePhotos)||!Array.isArray(c.afterPhotos)||c.beforePhotos.length>3||c.afterPhotos.length>3)throw new Error('Foto kartu pengerjaan tidak valid.')
        return {...c,beforePhotos:c.beforePhotos.map(photo),afterPhotos:c.afterPhotos.map(photo)}
      })
    }
    records.push(row)
  }
  if(used.size!==blobs.size)throw new Error('Backup memuat foto yang tidak terhubung ke pekerjaan.')
  validateBackupRecords(records,context.identities)
  return {records,summary:backupSummary(records,data.space,data.exportedAt,blobs.size,photoBytes)}
}
