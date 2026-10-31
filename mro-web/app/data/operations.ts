import { DEMO_AIRCRAFT_ID } from '../types/findings'

// Synthetic demonstration data. Part identifiers, flight logs and intervals are
// not records of an actual operator and are not an approved maintenance program.
export const demoSnapshot='2026-10-31'
export const aircraftOptions=[{id:DEMO_AIRCRAFT_ID,label:'Cessna 208 Caravan · Demo'}] as const
export interface InventoryPart {
  id:string;name:string;partNumber:string;category:'Landing gear'|'Propulsi'|'Struktur'|'Pintu'|'Consumable'
  quantity:number;reserved:number;minimum:number;unit:string;location:string;sourceName?:string;note:string
}
export const inventoryParts:InventoryPart[]=[
 {id:'inv-01',name:'Ban roda utama',partNumber:'DEMO-TIRE-MAIN',category:'Landing gear',quantity:4,reserved:1,minimum:2,unit:'unit',location:'Rak A-01',sourceName:'roueG',note:'Contoh stok untuk demonstrasi. Ukuran, approval dan kesesuaian pemasangan belum diverifikasi.'},
 {id:'inv-02',name:'Set brake lining',partNumber:'DEMO-BRAKE-SET',category:'Landing gear',quantity:2,reserved:1,minimum:2,unit:'set',location:'Rak A-02',sourceName:'roueD',note:'Referensi ke area roda; geometri internal rem belum tersedia pada model.'},
 {id:'inv-03',name:'Ban roda depan',partNumber:'DEMO-TIRE-NOSE',category:'Landing gear',quantity:0,reserved:0,minimum:1,unit:'unit',location:'Rak A-03',sourceName:'roueA',note:'Contoh item kosong untuk alur pemeriksaan inventori.'},
 {id:'inv-04',name:'Seal pintu awak',partNumber:'DEMO-DOOR-SEAL',category:'Pintu',quantity:3,reserved:0,minimum:1,unit:'set',location:'Rak B-01',sourceName:'porteAG',note:'Item contoh dihubungkan ke area pintu depan secara visual.'},
 {id:'inv-05',name:'Kit inspeksi propeller',partNumber:'DEMO-PROP-KIT',category:'Propulsi',quantity:2,reserved:0,minimum:1,unit:'kit',location:'Rak C-01',sourceName:'helice',note:'Kit demonstrasi; bukan daftar material resmi dari produsen.'},
 {id:'inv-06',name:'Panel fastener',partNumber:'DEMO-FASTENER',category:'Struktur',quantity:36,reserved:4,minimum:12,unit:'buah',location:'Rak B-04',sourceName:'fuselage',note:'Nomor part sintetis. Identitas teknis perlu dicocokkan dengan IPC sebelum penggunaan nyata.'},
 {id:'inv-07',name:'Pelumas servis',partNumber:'DEMO-LUBRICANT',category:'Consumable',quantity:8,reserved:2,minimum:4,unit:'botol',location:'Lemari D-01',note:'Contoh consumable tanpa merek atau spesifikasi penggunaan.'},
 {id:'inv-08',name:'Filter servis',partNumber:'DEMO-FILTER',category:'Consumable',quantity:1,reserved:0,minimum:2,unit:'unit',location:'Rak C-03',note:'Contoh inventori; tidak menyatakan kecocokan teknis dengan mesin tertentu.'},
]
export function availableStock(part:InventoryPart){return part.quantity-part.reserved}
export function stockState(part:InventoryPart):'available'|'low'|'empty'{const quantity=availableStock(part);return quantity<=0?'empty':quantity<part.minimum?'low':'available'}

export interface FlightRecord { id:string;date:string;from:string;to:string;departure:string;arrival:string;minutes:number;distanceKm:number;crew:string;note:string }
export const flightRecords:FlightRecord[]=[
 {id:'DEMO-101',date:'2026-10-22',from:'Sentani',to:'Wamena',departure:'07:10',arrival:'08:00',minutes:50,distanceKm:220,crew:'Awak contoh A',note:'Penerbangan sintetis untuk menunjukkan pencatatan utilisasi pesawat.'},
 {id:'DEMO-102',date:'2026-10-22',from:'Wamena',to:'Sentani',departure:'09:00',arrival:'09:55',minutes:55,distanceKm:220,crew:'Awak contoh A',note:'Rute dan jarak contoh; bukan rekaman penerbangan operator.'},
 {id:'DEMO-103',date:'2026-10-24',from:'Sentani',to:'Dekai',departure:'08:20',arrival:'09:30',minutes:70,distanceKm:300,crew:'Awak contoh B',note:'Data contoh dengan satu siklus takeoff/landing per catatan.'},
 {id:'DEMO-104',date:'2026-10-24',from:'Dekai',to:'Sentani',departure:'11:00',arrival:'12:05',minutes:65,distanceKm:300,crew:'Awak contoh B',note:'Durasi dan jarak disediakan sebagai data demo, bukan hasil pelacakan GPS.'},
 {id:'DEMO-105',date:'2026-10-27',from:'Sentani',to:'Wamena',departure:'07:30',arrival:'08:20',minutes:50,distanceKm:220,crew:'Awak contoh A',note:'Data penerbangan contoh untuk perhitungan akumulasi.'},
 {id:'DEMO-106',date:'2026-10-27',from:'Wamena',to:'Sentani',departure:'10:10',arrival:'11:00',minutes:50,distanceKm:220,crew:'Awak contoh A',note:'Jarak contoh pulang dihitung sebagai satu catatan terpisah.'},
 {id:'DEMO-107',date:'2026-10-30',from:'Sentani',to:'Bokondini',departure:'08:00',arrival:'09:00',minutes:60,distanceKm:260,crew:'Awak contoh C',note:'Data sintetis, belum tersambung dengan flight log operator.'},
 {id:'DEMO-108',date:'2026-10-30',from:'Bokondini',to:'Sentani',departure:'10:00',arrival:'11:00',minutes:60,distanceKm:260,crew:'Awak contoh C',note:'Satu siklus contoh. Tidak menyatakan status kelaikudaraan pesawat.'},
]
export const flightTotals=flightRecords.reduce((total,flight)=>({distanceKm:total.distanceKm+flight.distanceKm,minutes:total.minutes+flight.minutes,cycles:total.cycles+1}),{distanceKm:0,minutes:0,cycles:0})
export function formatMinutes(minutes:number){return `${Math.floor(minutes/60)} j ${minutes%60} m`}
export function formatNumber(number:number){return number.toLocaleString('id-ID')}
export function formatDate(date:string){return new Date(date.length===10?`${date}T00:00:00+09:00`:date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Jayapura'})}

export interface MaintenancePlan {id:string;title:string;sourceName:string;category:string;everyDays?:number;everyMinutes?:number;everyCycles?:number;lastDate:string;lastMinutes:number;lastCycles:number;note:string}
export const maintenancePlans:MaintenancePlan[]=[
 {id:'MP-DEMO-01',title:'Pemeriksaan visual area roda',sourceName:'roueG',category:'Landing gear',everyDays:14,everyMinutes:300,lastDate:'2026-10-12',lastMinutes:0,lastCycles:0,note:'Interval 14 hari atau 5 jam adalah aturan simulasi. Bukan interval resmi Cessna.'},
 {id:'MP-DEMO-02',title:'Pemeriksaan akses pintu awak',sourceName:'porteAG',category:'Pintu',everyDays:30,everyCycles:10,lastDate:'2026-10-05',lastMinutes:0,lastCycles:0,note:'Jadwal contoh untuk menunjukkan perulangan kalender dan siklus; tidak diambil dari AMM.'},
 {id:'MP-DEMO-03',title:'Pemeriksaan visual propeller',sourceName:'helice',category:'Propulsi',everyDays:30,everyMinutes:900,lastDate:'2026-10-24',lastMinutes:240,lastCycles:4,note:'Contoh jadwal. Pekerjaan nyata mengikuti publikasi dan program perawatan yang berlaku.'},
 {id:'MP-DEMO-04',title:'Tinjauan visual struktur pesawat',sourceName:'fuselage',category:'Struktur',everyDays:90,everyMinutes:1800,lastDate:'2026-10-15',lastMinutes:0,lastCycles:0,note:'Interval hanya untuk demonstrasi aplikasi, bukan rekomendasi perawatan.'},
]
export function addDays(date:string,days:number){const result=new Date(`${date}T00:00:00Z`);result.setUTCDate(result.getUTCDate()+days);return result.toISOString().slice(0,10)}
export function maintenanceDue(plan:MaintenancePlan){
 const nextDate=plan.everyDays?addDays(plan.lastDate,plan.everyDays):undefined
 const daysLeft=nextDate?Math.round((Date.parse(nextDate)-Date.parse(demoSnapshot))/86400000):undefined
 const minutesLeft=plan.everyMinutes!==undefined?plan.lastMinutes+plan.everyMinutes-flightTotals.minutes:undefined
 const cyclesLeft=plan.everyCycles!==undefined?plan.lastCycles+plan.everyCycles-flightTotals.cycles:undefined
 const overdue=(daysLeft!==undefined&&daysLeft<=0)||(minutesLeft!==undefined&&minutesLeft<=0)||(cyclesLeft!==undefined&&cyclesLeft<=0)
 const soon=(daysLeft!==undefined&&daysLeft<=7)||(minutesLeft!==undefined&&minutesLeft<=120)||(cyclesLeft!==undefined&&cyclesLeft<=2)
 return {nextDate,daysLeft,minutesLeft,cyclesLeft,status:overdue?'due':soon?'soon':'planned'} as const
}
export function intervalLabel(plan:MaintenancePlan){return [plan.everyDays?`${plan.everyDays} hari`:null,plan.everyMinutes?`${plan.everyMinutes/60} jam terbang`:null,plan.everyCycles?`${plan.everyCycles} siklus`:null].filter(Boolean).join(' / ')}
export const maintenanceStatusLabels={due:'Jatuh tempo',soon:'Segera',planned:'Terjadwal'} as const
