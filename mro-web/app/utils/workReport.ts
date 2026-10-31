import {PDFDocument,PDFFont,PDFPage,rgb,pushGraphicsState,popGraphicsState,rectangle,clip,endPath,type PDFImage} from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import {findingCategories,findingStatuses,type Finding,type FindingPhoto} from '../types/findings'
import {findingSeverities,getFindingSeverity} from '../types/severity'
import {reviewChecks} from '../types/repairWork'
import {materialRequestStatuses} from '../types/materialRequests'
import {inventoryParts} from '../data/operations'
import {materialQuantities,workOrderCode} from './materialRequests'
import {findingEventTitle} from './findingEventTitle'
import {getBackupContext,sha256,type BackupContext} from './backupCodec'
import {validateBackupRecords} from './backupValidation'
import type { FindingsSpace } from './findingsRepository'

export interface ReportAssets {regular:Uint8Array;bold:Uint8Array;logo:Uint8Array}
async function asset(path:string){const r=await fetch(path);if(!r.ok)throw new Error('Aset laporan belum tersedia. Coba unduh lagi.');return new Uint8Array(await r.arrayBuffer())}
let assetsPromise:Promise<ReportAssets>|undefined
export function loadReportAssets():Promise<ReportAssets>{
  if(!assetsPromise)assetsPromise=Promise.all([asset('/fonts/reports/DejaVuSans.ttf'),asset('/fonts/reports/DejaVuSans-Bold.ttf'),asset('/brand/mantiq-light.png')]).then(([regular,bold,logo])=>({regular:regular!,bold:bold!,logo:logo!})).catch(cause=>{assetsPromise=undefined;throw cause})
  return assetsPromise
}
const W=595.28,H=841.89,M=42,BOTTOM=66,CONTENT=W-2*M
const ink=rgb(.09,.17,.19),muted=rgb(.33,.41,.43),teal=rgb(0,.39,.37),line=rgb(.81,.87,.86),soft=rgb(.94,.97,.96)
const when=(iso:string)=>new Date(iso).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'})+' WIB'
class Writer {
  page!:PDFPage;y=0;sectionName='Ringkasan';fallback=false
  supported:Set<number>
  constructor(readonly doc:PDFDocument,readonly regular:PDFFont,readonly bold:PDFFont,readonly logo:PDFImage,readonly code:string,readonly space:FindingsSpace){const boldChars=new Set(bold.getCharacterSet());this.supported=new Set(regular.getCharacterSet().filter(c=>boldChars.has(c)));this.addPage()}
  clean(value:string){return [...value.replace(/\r\n?/g,'\n').replace(/[\u2010-\u2015]/g,'-').replace(/\t/g,'    ')].map(c=>{const n=c.codePointAt(0)!;if(c==='\n'||this.supported.has(n))return c;this.fallback=true;return `[U+${n.toString(16).toUpperCase().padStart(4,'0')}]`}).join('')}
  addPage(){
    if(this.doc.getPageCount()>=200)throw new Error('Laporan melebihi 200 halaman. Simpan backup lengkap untuk data sebesar ini.')
    this.page=this.doc.addPage([W,H]);this.page.drawRectangle({x:0,y:H-98,width:W,height:98,color:soft})
    this.page.drawText('MANTIQ / AIRCRAFT MAINTENANCE',{x:M,y:H-35,size:8,font:this.bold,color:teal})
    this.page.drawText('Laporan pekerjaan',{x:M,y:H-59,size:19,font:this.bold,color:ink})
    this.page.drawText(this.clean(`${this.code} | ${this.space==='practice'?'Latihan lokal':'Presentasi'} | ${this.sectionName}`),{x:M,y:H-79,size:8,font:this.regular,color:muted})
    const x=W-M-128,y=H-72,s=128/465
    this.page.pushOperators(pushGraphicsState(),rectangle(x,y,128,51),clip(),endPath())
    this.page.drawImage(this.logo,{x:x-95*s,y:y-(408-280)*s,width:612*s,height:408*s})
    this.page.pushOperators(popGraphicsState())
    this.page.drawLine({start:{x:M,y:H-99},end:{x:W-M,y:H-99},thickness:.6,color:line});this.y=H-122
  }
  ensure(height:number){if(this.y-height<BOTTOM)this.addPage()}
  wrap(value:string,size=10,font=this.regular,width=CONTENT):string[]{
    const lines:string[]=[]
    for(const paragraph of this.clean(value).split('\n')){
      let current=''
      for(const token of paragraph.split(/\s+/).filter(Boolean)){
        const candidate=current?`${current} ${token}`:token
        if(font.widthOfTextAtSize(candidate,size)<=width){current=candidate;continue}
        if(current){lines.push(current);current=''}
        for(const char of token){if(font.widthOfTextAtSize(current+char,size)>width&&current){lines.push(current);current=''}current+=char}
      }
      lines.push(current)
    }
    return lines
  }
  text(value:string,size=10,font=this.regular,color=ink,x=M,width=CONTENT){
    for(const text of this.wrap(value,size,font,width)){this.ensure(size*1.5);if(text)this.page.drawText(text,{x,y:this.y,size,font,color});this.y-=size*1.5}this.y-=5
  }
  section(title:string){this.sectionName=title;this.ensure(90);this.y-=10;this.text(title,12,this.bold,teal);this.page.drawLine({start:{x:M,y:this.y+3},end:{x:W-M,y:this.y+3},thickness:.5,color:line});this.y-=9}
  sub(title:string){this.ensure(60);this.text(title,10,this.bold);this.y-=2}
  field(label:string,value:string){this.ensure(20);const values=this.wrap(value,9,this.regular,CONTENT-132);let first=true;for(const text of values){this.ensure(14);if(first)this.page.drawText(this.clean(label),{x:M,y:this.y,size:8,font:this.regular,color:muted});this.page.drawText(text,{x:M+132,y:this.y,size:9,font:this.regular,color:ink});this.y-=14;first=false}this.y-=5}
  finish(){for(const [i,page] of this.doc.getPages().entries()){page.drawLine({start:{x:M,y:47},end:{x:W-M,y:47},thickness:.5,color:line});page.drawText('Demo lokal - bukan pelepasan pesawat',{x:M,y:31,size:7,font:this.regular,color:muted});const number=`${i+1} / ${this.doc.getPageCount()}`;page.drawText(number,{x:W-M-this.regular.widthOfTextAtSize(number,8),y:31,size:8,font:this.regular,color:muted})}}
}
export async function createWorkReport(finding:Finding,space:FindingsSpace,assets?:ReportAssets,createdAt=new Date().toISOString(),context?:BackupContext):Promise<{blob:Blob;pages:number}>{
  const ctx=context??await getBackupContext();validateBackupRecords([finding],ctx.identities)
  const source=assets??await loadReportAssets(),doc=await PDFDocument.create();doc.registerFontkit(fontkit)
  const regular=await doc.embedFont(source.regular,{subset:true}),bold=await doc.embedFont(source.bold,{subset:true}),logo=await doc.embedPng(source.logo)
  const code=workOrderCode(finding),writer=new Writer(doc,regular,bold,logo,code,space)
  doc.setTitle(`${code} - ${finding.title}`);doc.setAuthor('Mantiq MRO Demo');doc.setSubject('Catatan pekerjaan dan pemeriksaan demo');doc.setCreator('Mantiq MRO Demo');doc.setCreationDate(new Date(createdAt))
  const images=new Map<string,PDFImage>();let imageBytes=0
  async function image(photo:FindingPhoto){const bytes=new Uint8Array(await photo.blob.arrayBuffer()),hash=await sha256(bytes);if(!images.has(hash)){imageBytes+=bytes.length;if(imageBytes>40*1024*1024)throw new Error('Foto laporan melebihi batas 40 MB.');images.set(hash,await doc.embedJpg(bytes))}return images.get(hash)!}
  async function photoRows(before:FindingPhoto[],after:FindingPhoto[]=[],leftLabel='Foto temuan',rightLabel='Sesudah'){
    const width=(CONTENT-16)/2,imageH=170
    for(let i=0;i<Math.max(before.length,after.length);i++){
      const items=[before[i],after[i]],captions=items.map(p=>p?writer.wrap(p.name,8,regular,width-16):[]),height=16+imageH+Math.max(...captions.map(c=>c.length),1)*11+20
      writer.ensure(height)
      const top=writer.y
      for(let col=0;col<2;col++){
        const p=items[col];if(!p)continue
        const x=M+col*(width+16),embedded=await image(p)
        writer.page.drawText(writer.clean(`${col?rightLabel:leftLabel} ${i+1}`),{x,y:top,size:9,font:bold,color:teal})
        writer.page.drawRectangle({x,y:top-12-imageH,width,height:imageH,color:soft,borderColor:line,borderWidth:.5})
        const scale=Math.min((width-12)/embedded.width,(imageH-12)/embedded.height)
        writer.page.drawImage(embedded,{x:x+(width-embedded.width*scale)/2,y:top-12-imageH+(imageH-embedded.height*scale)/2,width:embedded.width*scale,height:embedded.height*scale})
        for(const [n,text] of captions[col]!.entries())writer.page.drawText(text,{x,y:top-12-imageH-14-n*11,size:8,font:regular,color:muted})
      }
      writer.y=top-height
    }
  }
  writer.section('Ringkasan pekerjaan');writer.text(finding.title,14,bold)
  for(const [label,value] of [['Pesawat','Cessna 208 Caravan - Demo'],['Kode pekerjaan',code],['ID catatan',finding.id],['Status',findingStatuses[finding.status]],['Kekritisan',findingSeverities[getFindingSeverity(finding)]],['Kategori',findingCategories[finding.category]],['Prioritas pencatatan',finding.priority==='high'?'Tinggi':'Normal'],['Komponen tercatat',finding.componentLabel],['Nama sumber / ID aset',`${finding.sourceName} / ${finding.assetId}`],['Dibuat',when(finding.createdAt)],['Diperbarui',when(finding.updatedAt)],['Revisi data',String(finding.revision)],['Laporan dibuat',when(createdAt)]])writer.field(label!,value!)
  writer.section('Pengamatan awal');writer.text(finding.description)
  if(finding.photos.length)await photoRows(finding.photos)
  writer.section('Permintaan dan pemakaian sparepart')
  if(!finding.materialRequests?.length)writer.text('Tidak ada permintaan sparepart pada catatan ini.')
  for(const [i,r] of (finding.materialRequests??[]).entries()){
    const part=inventoryParts.find(p=>p.id===r.partId)!,q=materialQuantities(r)
    writer.sub(`${i+1}. ${part.name} - ${r.quantity} ${part.unit}`);writer.field('Part number contoh',part.partNumber);writer.field('Status / ID permintaan',`${materialRequestStatuses[r.status]} / ${r.id}`);writer.field('Alasan kebutuhan',r.note)
    if(r.status==='issued')writer.field('Jumlah tercatat',`Dipakai ${q.used}; dikembalikan ${q.returned}; belum dicatat ${q.remaining} ${part.unit}`)
    for(const d of r.dispositions??[]){writer.sub(`${d.kind==='used'?'Dipakai':'Dikembalikan'} ${d.quantity} ${part.unit} - ${d.actor}`);writer.field('Waktu / seri atau lot',`${when(d.at)}${d.serialLot?` / ${d.serialLot}`:''}`);writer.text(d.note,9)}
  }
  writer.section('Kartu pengerjaan dan pemeriksaan')
  if(!finding.repairCards?.length)writer.text('Belum ada kartu pengerjaan pada catatan ini. Riwayat lama dipertahankan sesuai data tersimpan.')
  for(const [i,card] of (finding.repairCards??[]).entries()){
    writer.section(`Kartu pengerjaan ${i+1}`);writer.field('ID kartu',card.id);writer.field('Teknisi',card.technician);writer.field('Mulai / selesai',`${when(card.startedAt)} / ${when(card.completedAt)}`);writer.field('Durasi tercatat',`${Math.round((Date.parse(card.completedAt)-Date.parse(card.startedAt))/60000)} menit`);writer.field('Diajukan',when(card.submittedAt));writer.sub('Tindakan yang dicatat');writer.text(card.actions);writer.sub('Dokumen rujukan pekerjaan');writer.text(card.reference);writer.ensure(310);writer.sub('Bukti foto');await photoRows(card.beforePhotos,card.afterPhotos,'Sebelum','Sesudah')
    writer.sub('Snapshot material saat diajukan')
    if(!card.materials.length)writer.text('Tidak ada material diserahkan yang tercatat pada kartu ini.',9)
    for(const m of card.materials){writer.text(`${m.name} / ${m.partNumber}\nDiserahkan ${m.issued}; dipakai ${m.used}; dikembalikan ${m.returned} ${m.unit}`,9);for(const d of m.dispositions)writer.text(`${d.kind==='used'?'Dipakai':'Dikembalikan'} ${d.quantity} - ${d.actor}${d.serialLot?` - Seri/lot ${d.serialLot}`:''}\n${d.note}`,8)}
    const review=card.review
    writer.sub('Pemeriksaan hasil')
    if(!review)writer.text('Menunggu pemeriksaan demo.')
    else{writer.field('Keputusan',review.result==='accepted'?'Diterima - pekerjaan ditutup':'Perlu pengerjaan ulang');writer.field('Pemeriksa / waktu',`${review.inspector} / ${when(review.at)}`);writer.text(review.note);writer.sub('Tinjauan kelengkapan');for(const [key,label] of Object.entries(reviewChecks))writer.text(`${review.checks.includes(key as keyof typeof reviewChecks)?'[x]':'[ ]'} ${label}`,9)}
  }
  writer.section('Riwayat catatan')
  for(const [i,event] of finding.history.entries()){writer.sub(`${i+1}. ${findingEventTitle(event)}`);writer.field('Waktu / pelaksana',`${when(event.at)} / ${event.actor}`);if(event.requestId)writer.field('ID permintaan',event.requestId);if(event.repairCardId)writer.field('ID kartu',event.repairCardId);if(event.toSeverity)writer.field('Kekritisan',`${event.fromSeverity?findingSeverities[event.fromSeverity]+' -> ':''}${findingSeverities[event.toSeverity]}`);writer.text(event.note,9)}
  if(writer.fallback){writer.section('Catatan karakter');writer.text('Karakter di luar cakupan font ditulis sebagai kode Unicode [U+....] agar informasi aslinya tetap dapat ditelusuri.',8)}
  writer.finish();const bytes=await doc.save()
  return {blob:new Blob([Uint8Array.from(bytes).buffer],{type:'application/pdf'}),pages:doc.getPageCount()}
}
