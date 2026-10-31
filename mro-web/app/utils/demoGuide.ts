import type { Finding } from '../types/findings'
import { materialQuantities } from './materialRequests'
import { repairSubmissionIssue } from './repairWork'

export function demoGuide(finding:Finding|undefined,selectedId:string|null,exportedRevision:number|undefined) {
  const requests=finding?.materialRequests??[],latest=finding?.repairCards?.at(-1)
  const issued=requests.filter(r=>r.status==='issued')
  const waiting=requests.some(r=>['requested','ready'].includes(r.status)||materialQuantities(r).remaining>0)
  const materialsDone=issued.length>0&&!waiting
  const accepted=finding?.status==='closed'&&latest?.review?.result==='accepted'
  const repairReady=!!finding&&!repairSubmissionIssue(finding)
  return [
    {title:'Pilih komponen',description:'Temukan lokasi pekerjaan pada pesawat, lalu gunakan fokus atau isolasi untuk melihat areanya.',action:'Lihat lokasi 3D',done:!!finding&&selectedId===finding.assetId,enabled:!!finding,kind:'locate'},
    {title:'Catat temuan',description:'Baca contoh yang tersedia, atau pilih Catat baru untuk mencoba pengamatan sendiri. Catatan baru menjadi fokus panduan.',action:finding?'Buka temuan':'Pilih pekerjaan dahulu',done:!!finding,enabled:!!finding,kind:'finding'},
    {title:'Request sparepart',description:materialsDone?'Penyerahan dan pemakaian/pengembalian sudah tercatat. Lihat rinciannya di inventori.':'Ajukan part, siapkan, serahkan, lalu catat jumlah dipakai atau dikembalikan di tab Sparepart.',action:requests.some(r=>r.status!=='cancelled')?'Kelola sparepart':'Ajukan sparepart',done:materialsDone,enabled:!!finding&&(['open','in_progress','rework'].includes(finding.status)||requests.length>0),kind:'material'},
    {title:'Catat perbaikan',description:waiting?'Selesaikan permintaan dan catatan pemakaian part terlebih dahulu.':finding?.status==='open'?'Buka detail temuan dan ubah status menjadi Ditindaklanjuti sebelum mencatat hasil.':finding?.status==='rework'?'Pemeriksa meminta pengerjaan ulang. Catat kartu baru; kartu lama tetap tersimpan.':'Isi teknisi, waktu, tindakan, rujukan, serta foto sebelum dan sesudah. Ajukan kartu untuk pemeriksaan.',action:waiting?'Selesaikan material':finding?.status==='open'?'Mulai tindak lanjut':repairReady?'Isi kartu pengerjaan':'Lihat kartu tersimpan',done:!!latest&&latest.review?.result!=='rework',enabled:!!finding,kind:'repair'},
    {title:'Periksa hasil',description:accepted?'Hasil diterima oleh pemeriksa dan pekerjaan ditutup. Riwayat pemeriksaan tetap dapat dibaca.':finding?.status==='rework'?'Hasil sebelumnya perlu dikerjakan ulang. Kembali ke langkah perbaikan dan ajukan kartu baru.':'Pemeriksa dengan nama berbeda meninjau tindakan, foto, dan material. Terima hasil atau minta pengerjaan ulang.',action:finding?.status==='awaiting_review'?'Periksa hasil':accepted?'Lihat hasil diterima':'Menunggu kartu pengerjaan',done:accepted,enabled:finding?.status==='awaiting_review'||accepted,kind:'review'},
    {title:'Unduh laporan',description:'Buka detail pekerjaan, lalu pilih Unduh laporan PDF. Progres mencatat unduhan yang dimulai pada sesi ini untuk revisi tersimpan saat ini.',action:'Buka unduhan PDF',done:!!finding&&exportedRevision===finding.revision,enabled:!!finding,kind:'report'},
  ] as const
}
