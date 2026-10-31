import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
const require=createRequire(new URL('../mro-web/package.json',import.meta.url)),{createJiti}=require('jiti'),jiti=createJiti(import.meta.url)
export async function fixture(){
 const manifest=JSON.parse(await readFile(new URL('../mro-web/public/models/component-map.json',import.meta.url)))
 const codec=await jiti.import('../mro-web/app/utils/backupCodec.ts'),{applyMaterialCommand:material}=await jiti.import('../mro-web/app/utils/materialRequests.ts'),{applyRepairCommand:repair}=await jiti.import('../mro-web/app/utils/repairWork.ts')
 const source=manifest.find(r=>r.source_object_name==='roueG'),at='2026-10-31T03:00:00.000Z'
 const blob=new Blob([await readFile(new URL('../mro-web/public/demo/ilustrasi-roueG.jpg',import.meta.url))],{type:'image/jpeg'})
 let f={id:'backup-report-example',aircraftId:'cessna-208-demo',assetId:source.asset_object_id,sourceName:'roueG',componentLabel:'Roda utama kiri',title:'Contoh - Pengerjaan roda dan tinjauan hasil',description:'Skenario demonstrasi alur dokumentasi pekerjaan. Foto yang digunakan merupakan ilustrasi model 3D, bukan foto inspeksi atau pengerjaan aktual.',category:'wear',priority:'high',status:'in_progress',createdAt:'2026-10-31T00:00:00.000Z',updatedAt:at,revision:1,photos:[{id:'original-photo',name:'ilustrasi-temuan-roda.jpg',blob}],history:[{id:'original-event',at:'2026-10-31T00:00:00.000Z',actor:'Pengguna demo',type:'created',to:'open',note:'Contoh catatan untuk demonstrasi laporan.'}]}
 const command=cmd=>{f=material([f],f,f.revision,cmd,at)}
 command({kind:'request',draft:{partId:'inv-01',quantity:2,note:'Material contoh untuk memperagakan pemakaian dan pengembalian.'}})
 for(const status of ['ready','issued'])command({kind:'transition',requestId:f.materialRequests[0].id,status,note:'Tindakan material pada skenario demo.'})
 for(const disposition of ['used','returned'])command({kind:'disposition',requestId:f.materialRequests[0].id,disposition,quantity:1,actor:'José Wibowo',serialLot:'LOT-DEMO-12',note:'Pencatatan jumlah pada skenario demonstrasi.'})
 const draft={technician:'José Wibowo',startedAt:'2026-10-31T01:00:00.000Z',completedAt:'2026-10-31T02:00:00.000Z',actions:'Demonstrasi pencatatan tindakan dan pengamatan ulang pada area roda. Foto sebelum dan sesudah menggunakan ilustrasi model yang sama untuk memperlihatkan alur bukti; bukan rekaman perbaikan aktual.',reference:'Dokumen skenario MRO DEMO-12, rev. 1, bagian demonstrasi pencatatan. Bukan prosedur perawatan pesawat.',beforePhotos:f.photos,afterPhotos:[{id:'after-photo',name:'ilustrasi-sesudah-demo.jpg',blob}]}
 f=repair(f,f.revision,{kind:'submit',draft},at)
 f=repair(f,f.revision,{kind:'review',cardId:f.repairCards.at(-1).id,inspector:'Maya Putri',result:'rework',note:'Contoh tinjauan: lengkapi uraian tindakan agar hasil demonstrasi lebih mudah ditinjau.',checks:['record','photos']},at)
 f=repair(f,f.revision,{kind:'submit',draft:{...draft,actions:'Uraian demonstrasi dilengkapi setelah membaca catatan pemeriksa. Referensi, waktu, foto ilustrasi dan jumlah material diperiksa kembali sebelum diajukan ulang.'}},at)
 f=repair(f,f.revision,{kind:'review',cardId:f.repairCards.at(-1).id,inspector:'Maya Putri',result:'accepted',note:'Hasil dokumentasi contoh diterima untuk presentasi. Keputusan ini bukan persetujuan pelepasan pesawat.',checks:['record','photos','materials']},at)
 const old={...f,id:'legacy-report',title:'Contoh catatan lama',photos:[],history:[],revision:1,materialRequests:undefined,repairCards:undefined}
 return {codec,context:await codec.buildBackupContext(manifest),records:[f,old],blob,at}
}
