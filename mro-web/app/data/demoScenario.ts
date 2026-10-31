import { DEMO_AIRCRAFT_ID,type Finding } from '../types/findings'
import type { AircraftComponent } from './components'
import { applyRepairCommand } from '../utils/repairWork'

export async function buildDemoScenario(components:AircraftComponent[]):Promise<Finding[]> {
  const definitions=[
    {name:'roueG',title:'Contoh · Pengamatan roda utama kiri',description:'Skenario demo: teknisi mencatat pengamatan permukaan roda dan meminta pemeriksaan lanjutan. Gambar adalah ilustrasi model 3D, bukan foto inspeksi aktual.',category:'wear',priority:'high',severity:'high',status:'open'},
    {name:'porteAG',title:'Contoh · Pemeriksaan pintu depan kiri',description:'Skenario demo: catatan pemeriksaan visual panel pintu sedang ditindaklanjuti. Ilustrasi menunjukkan objek sumber, tanpa simulasi kerusakan aktual.',category:'inspection',priority:'normal',severity:'medium',status:'in_progress'},
    {name:'helice',title:'Contoh · Catatan visual propeller',description:'Skenario demo: pengamatan propeller telah ditutup pada alur pencatatan. Penutupan catatan ini hanya bagian dari demonstrasi aplikasi.',category:'inspection',priority:'normal',severity:'low',status:'closed'},
  ] as const
  return Promise.all(definitions.map(async(definition,index)=>{
    const component=components.find(c=>c.sourceName===definition.name)
    if(!component)throw new Error('Komponen skenario belum tersedia. Tunggu model selesai dibuka.')
    const response=await fetch(`/demo/ilustrasi-${definition.name}.jpg`)
    if(!response.ok)throw new Error('Ilustrasi demo belum tersedia. Coba siapkan ulang demo.')
    const blob=await response.blob()
    if(blob.type!=='image/jpeg' || blob.size>1024*1024)throw new Error('Ilustrasi demo belum sesuai.')
    const createdAt=new Date(Date.now()-(120-index*15)*60_000).toISOString()
    const updatedAt=new Date(Date.now()-(60-index*10)*60_000).toISOString()
    const finding:Finding={
      id:`scenario-${definition.name}`,sample:true,aircraftId:DEMO_AIRCRAFT_ID,assetId:component.id,
      sourceName:component.sourceName,componentLabel:component.label,
      title:definition.title,description:definition.description,category:definition.category,priority:definition.priority,severity:definition.severity,
      status:definition.status,createdAt,updatedAt:definition.status==='open'?createdAt:updatedAt,revision:definition.status==='open'?1:2,
      photos:[{id:`illustration-${definition.name}`,name:`ilustrasi-model-${definition.name}.jpg`,blob}],
      history:[{id:`created-${definition.name}`,at:createdAt,actor:'Teknisi contoh',type:'created',to:'open',note:'Catatan contoh untuk presentasi.',toSeverity:definition.severity}],
    }
    if(definition.status==='closed'){
      const submittedAt=new Date(Date.parse(updatedAt)-60_000).toISOString()
      const working:Finding={...finding,status:'in_progress',history:[...finding.history,{id:`working-${definition.name}`,at:createdAt,actor:'Teknisi contoh',type:'status_changed',from:'open',to:'in_progress',note:'Pengerjaan contoh untuk presentasi.'}]}
      const submitted=applyRepairCommand(working,working.revision,{kind:'submit',draft:{technician:'Teknisi contoh',startedAt:createdAt,completedAt:new Date(Date.parse(updatedAt)-120_000).toISOString(),actions:'Simulasi pencatatan pengamatan visual propeller. Foto sebelum dan sesudah memakai ilustrasi model yang sama; bukan bukti pengerjaan aktual.',reference:'Dokumen skenario presentasi MRO, rev. demo — bukan prosedur perawatan.',beforePhotos:finding.photos,afterPhotos:[{id:`after-${definition.name}`,name:'ilustrasi-sesudah-demo.jpg',blob}]}},submittedAt)
      return applyRepairCommand(submitted,submitted.revision,{kind:'review',cardId:submitted.repairCards!.at(-1)!.id,inspector:'Pemeriksa contoh',result:'accepted',note:'Hasil skenario diterima untuk demonstrasi alur. Tidak menyatakan pemeriksaan atau pelepasan pesawat aktual.',checks:['record','photos','materials']},updatedAt)
    }
    if(definition.status!=='open')finding.history.push({id:`updated-${definition.name}`,at:updatedAt,actor:'Teknisi contoh',type:'status_changed',from:'open',to:definition.status,note:'Contoh pengamatan diteruskan untuk tindak lanjut.'})
    return finding
  }))
}
