import { getSourceClassification } from './componentClassification'

// Curated Indonesian paraphrases of the local C208 POH. Page numbers refer to
// this exact archived PDF, not another edition. Source mesh identity remains a
// visual mapping; a system reference does not certify its internal geometry.
export interface ComponentManualCitation {
  manualId: 'c208-poh'
  section: string
  bookPage: string
  pdfPage: number
}
export interface ComponentManualEntry {
  title: string
  summary: string
  scope?: string
  coverage?: 'function' | 'system' | 'location'
  citations: readonly ComponentManualCitation[]
}
const cite=(section:string,bookPage:string,pdfPage:number):ComponentManualCitation=>({manualId:'c208-poh',section,bookPage,pdfPage})
const airframe=cite('Airframe','7-7',377)
const tail=cite('Airframe — empennage','7-8',378)
const controls=cite('Flight controls & trim systems','7-9',379)
const ground=cite('Ground control','7-20',390)
const flap=cite('Wing flap system','7-22',392)
const landing=cite('Landing gear system','7-23',393)
const doors=cite('Cabin entry doors & crew entry doors','7-29',399)
const propeller=cite('Propeller','7-58',428)
const brakes=cite('Brake system','7-68',438)
const mainWheel:ComponentManualEntry={
  title:'Roda utama & sistem rem',
  summary:'Landing gear terdiri dari dua roda utama dan satu roda depan. Pada setiap roda utama terdapat rem cakram tunggal yang digerakkan secara hidraulik; sistemnya terhubung ke master cylinder pada pedal rudder.',
  scope:'Referensi membahas sistem landing gear dan rem. Bagian internal rem belum dipetakan pada objek roda 3D.',
  citations:[landing,brakes],
}
const aileron:ComponentManualEntry={
  title:'Aileron & hubungan dengan spoiler',
  summary:'Aileron digerakkan secara mekanis melalui control wheel dan terhubung dengan sistem spoiler. Spoiler membantu kendali lateral pada kecepatan rendah dengan mengganggu gaya angkat pada flap terkait.',
  citations:[controls],
}
const wingFlap:ComponentManualEntry={
  title:'Sistem flap sayap',
  summary:'Flap merupakan permukaan single-slot dengan bentang besar yang digerakkan motor listrik. Sistemnya mencakup penggerak utama, indikator posisi, dan penggerak standby untuk kondisi gangguan pada sistem utama.',
  citations:[flap],
}
const crewDoor:ComponentManualEntry={
  title:'Akses awak ke kabin',
  summary:'Pintu di sisi kiri dan kanan bagian depan kabin menyediakan akses masuk dan keluar pada posisi pilot serta penumpang depan. Manual menjelaskan handle, penguncian, dan mekanisme latch pintu awak.',
  scope:'Pemetaan mengacu pada pintu depan secara visual. Panel luar, kaca, dan lapisan interior dapat berupa objek terpisah.',
  citations:[doors],
}
export const componentManuals:Readonly<Record<string,ComponentManualEntry>>={
  fuselage:{title:'Konstruksi badan pesawat',summary:'Badan pesawat memakai konstruksi semimonocoque dari bulkhead, stringer, dan skin. Struktur utamanya menyediakan sambungan untuk sayap, landing gear utama, dan strut sayap.',scope:'Objek sumber juga menggabungkan sirip ekor. Rujukan ini membahas badan pesawat.',citations:[airframe]},
  ailes:{title:'Struktur sayap & tangki integral',summary:'Sayap ditopang strut dan memiliki tangki bahan bakar integral. Konstruksinya mencakup spar depan dan belakang, rib, stringer, serta skin aluminium.',scope:'Objek model menggabungkan sayap kiri dan kanan; penjelasan berlaku untuk sistem sayap.',citations:[airframe]},
  ailes2:{title:'Stabilizer horizontal & trim elevator',summary:'Stabilizer horizontal merupakan bagian dari empennage bersama rudder, stabilizer vertikal, dan elevator. Di dalam stabilizer horizontal terdapat aktuator yang menggerakkan trim tab elevator.',citations:[tail]},
  helice:{title:'Propeller & pengaturan pitch',summary:'POH mendeskripsikan propeller McCauley tiga bilah dengan sistem constant-speed, full-feathering, dan reversible. Governor serta tekanan oli mengatur pitch bilah untuk menyesuaikan kecepatan putaran dengan beban mesin.',scope:'Spesifikasi ini mengikuti konfigurasi dalam POH; identitas propeller pada unit AMA belum diverifikasi.',citations:[propeller]},
  roueA:{title:'Roda depan & kendali di darat',summary:'Roda depan merupakan bagian yang dapat diarahkan pada landing gear tricycle. Pengarahannya terhubung ke pedal rudder melalui steering bungee; penyerapan guncangan melibatkan shock strut berisi oli dan drag link baja pegas.',citations:[ground,landing]},
  roueG:mainWheel,
  roueD:mainWheel,
  porteAG:crewDoor,
  porteAD:crewDoor,
  aileronG:aileron,
  aileronD:aileron,
  voletG:wingFlap,
  voletD:wingFlap,
  profondeur:{title:'Elevator & sistem trim',summary:'Elevator merupakan permukaan kendali ekor yang digerakkan secara mekanis melalui control wheel. Masing-masing elevator memiliki trim tab; aktuator pada stabilizer horizontal meneruskan gerakan ke tab tersebut.',citations:[controls,tail]},
  direction:{title:'Rudder & sistem trim',summary:'Rudder merupakan permukaan kendali vertikal yang digerakkan melalui pedal rudder. Manual juga menjelaskan hubungan trim rudder dengan steering bungee pada sistem roda depan.',citations:[controls,tail]},
}
const panel=cite('Instrument panel','7-12',382)
const panelRight=cite('Instrument panel & right flight instrument panel','7-13',383)
const pitot=cite('Pitot-static system and instruments','7-90',460)
const flightInstruments=cite('Airspeed indicator(s), vertical speed indicator(s), altimeter(s)','7-92',462)
const avionics:ComponentManualEntry={
  title:'Area avionik — rujukan tata letak',
  summary:'POH menempatkan perangkat avionik dalam dua susunan vertikal di bagian tengah panel instrumen. Penjelasan peralatan radio diarahkan ke suplemen pada Section 9.',
  coverage:'location',
  scope:'Rujukan ini hanya tata letak dan pengantar avionik. Tipe KX165, KMA20, KT70, KI252a, KRA, KI266, atau GPS dari aset sumber belum dicocokkan dengan suplemen perangkat yang tepat. Fungsi setiap tombol dan digit tidak disimpulkan dari halaman ini.',
  citations:[panelRight,cite('Avionics support equipment — introduction','7-97',467)],
}
// Shared entries and citation objects are stable: navigation validates that the
// clicked citation belongs to the selected source object by object identity.
export const familyManuals:Readonly<Record<string,ComponentManualEntry>>={
  seats:{title:'Kursi awak & penumpang',summary:'POH membedakan kursi pilot/penumpang depan yang dapat disetel dengan beberapa konfigurasi kursi kabin. Manual juga membahas headrest, seat belt, dan shoulder harness.',scope:'Rujukan berlaku untuk kelompok kursi. Nomor objek 3D bukan nomor posisi kursi; mekanisme pengaturan dan sabuk belum dipetakan sebagai objek tersendiri.',citations:[cite('Seats — pilot and front passenger seats','7-24',394),cite('Passenger seats, headrests, seat belts and shoulder harnesses','7-25',395)]},
  altimeter:{title:'Altimeter — ketinggian barometrik',summary:'Altimeter menunjukkan ketinggian pesawat berdasarkan tekanan barometrik. Knob pada instrumen dipakai untuk menyesuaikan skala tekanan dengan altimeter setting.',scope:'Jarum, muka, skala, dan kaca merupakan bagian grafis dari instrumen yang sama. Salinan objek belum ditetapkan sebagai panel kiri atau kanan.',citations:[flightInstruments]},
  airspeed:{title:'Airspeed indicator — kecepatan udara',summary:'Airspeed indicator menampilkan kecepatan udara dalam knots. Instrumen kiri yang dijelaskan POH memiliki cincin putar untuk pembacaan true airspeed dengan koreksi ketinggian dan temperatur.',scope:'Rujukan menjelaskan instrumen secara keseluruhan, bukan tiap objek grafis. Jenis instalasi pada unit AMA belum diverifikasi.',citations:[flightInstruments]},
  vsi:{title:'Vertical speed indicator — laju naik/turun',summary:'Vertical speed indicator menunjukkan laju naik atau turun pesawat dalam feet per minute. Jarumnya digerakkan oleh perubahan tekanan dari sumber statis saat ketinggian berubah.',scope:'Muka, jarum, latar, dan kaca berbagi fungsi instrumen yang sama.',citations:[flightInstruments]},
  attitude:{title:'Attitude indicator — sikap pesawat',summary:'Attitude indicator memberikan gambaran pitch dan bank melalui simbol pesawat, horizon, serta skala kemiringan. POH membedakan instrumen kiri bertenaga vakum dengan instrumen kanan bertenaga listrik bila panel kanan dipasang.',scope:'Pemetaan mengidentifikasi keluarga instrumen, belum menentukan catu daya atau posisi setiap salinan model.',citations:[cite('Vacuum system and instruments — attitude indicator','7-93',463)]},
  clock:{title:'Jam — lokasi pada panel',summary:'POH menempatkan jam di sebelah kiri kelompok instrumen penerbangan.',coverage:'location',scope:'Halaman ini menjelaskan lokasi jam; tidak mengidentifikasi tipe jam atau mekanisme jarum yang digunakan aset 3D.',citations:[panel]},
  adf:{title:'ADF — suplemen KR-87 dengan KI 227-01',summary:'Suplemen menjelaskan automatic direction finder yang mencakup receiver, timer, bearing indicator, dan antena. Sistem ini digunakan untuk penentuan posisi serta homing; KI 227-01 merupakan indikator bearing pada konfigurasi tersebut.',scope:'Nama sumber KI227 cocok pada tingkat keluarga indikator. Varian KI 227-01 dan pasangan receiver KR-87 pada model atau pesawat AMA belum dikonfirmasi; suplemen ini menjadi rujukan bersyarat.',citations:[cite('Section 9 · Supplement 3 — KR-87 ADF / KI 227-01, General','S3-3',571)]},
  avionics,
  turn:{title:'Indikator belok — lokasi panel kanan',summary:'POH menyebut turn and bank indicator serta vertical speed indicator sebagai bagian dari kelompok instrumen pada panel penerbangan kanan.',coverage:'location',scope:'Rujukan ini hanya keberadaan dan penataan instrumen. Halaman tersebut tidak menjelaskan fungsi bola slip atau setiap bagian grafis.',citations:[panelRight]},
  compass:{title:'Kompas — identifikasi pada gambar panel',summary:'Gambar dan daftar keterangan panel pada POH mencantumkan magnetic compass sebagai salah satu instrumen kokpit.',coverage:'location',scope:'Rujukan gambar panel, bukan prosedur kalibrasi atau identifikasi model kompas pada aset sumber.',citations:[cite('Instrument panel — Figure 7-2, legend','7-15',385)]},
  'engine-instruments':{title:'Kelompok instrumen pemantau mesin',summary:'POH menjelaskan instrumen pemantau torque, putaran propeller, ITT, putaran gas generator, aliran bahan bakar, serta tekanan dan temperatur oli.',coverage:'system',scope:'Objek memakai tekstur instrumen mesin bersama. Jarum atau muka tertentu belum ditetapkan sebagai torque, RPM, temperatur, atau jenis gauge lainnya. Nama tank pada sumber tidak diperlakukan sebagai tangki fisik.',citations:[cite('Engine instruments — torque indicator','7-43',413),cite('Propeller RPM, ITT and Ng indicators','7-44',414),cite('Oil pressure and oil temperature gages','7-45',415)]},
  panel:{title:'Penataan panel instrumen',summary:'Panel instrumen disusun mengikuti konfigurasi dasar T. Instrumen penerbangan berada di depan pilot, avionik di bagian tengah, dan instrumen mesin di bagian atas susunan avionik.',coverage:'system',scope:'Rujukan menjelaskan penataan panel secara keseluruhan. Tiap subpanel belum dipetakan ke nomor part.',citations:[panel,panelRight]},
  yoke:{title:'Control wheel & kendali penerbangan',summary:'Sistem kendali penerbangan digerakkan secara mekanis melalui control wheel untuk aileron dan elevator, serta pedal untuk rudder.',citations:[controls]},
  pedals:{title:'Pedal rudder & hubungan ke kendali darat',summary:'Pedal menggerakkan rudder dan terhubung ke pengarah roda depan melalui steering bungee. POH juga menjelaskan hubungan pedal dengan sistem rem roda utama.',scope:'Rujukan menjelaskan sistem pedal. Bagian master cylinder dan sambungan internal tidak dipetakan pada mesh pedal.',citations:[controls,ground,brakes]},
  power:{title:'Power lever — pengaturan tenaga mesin',summary:'Power lever mengatur tenaga mesin melalui linkage ke fuel control unit. POH menjelaskan rentang pengaturan tenaga dan hubungannya dengan pitch propeller pada rentang BETA.',scope:'Label Throttle dipertahankan sebagai nama sumber. Hubungan mekanis tidak dimodelkan secara terpisah.',citations:[cite('Engine controls — power lever','7-40',410)]},
  pitch:{title:'Propeller control lever',summary:'Propeller control lever terhubung ke governor untuk mengatur putaran propeller dan feathering.',scope:'Pemetaan visual pada tuas PropPitch; sambungan governor tidak ditampilkan sebagai komponen tersendiri.',citations:[cite('Propeller control lever','7-42',412)]},
  'crew-door':crewDoor,
  cabin:{title:'Area kabin & bagasi',summary:'POH membahas area bagasi di bagian belakang kabin, jalur aksesnya, serta perangkat pengikat untuk barang.',coverage:'system',scope:'Rujukan hanya area kabin/bagasi. Bahan pelapis, panel lantai, dan detail interior tertentu tidak dijelaskan sebagai part tersendiri pada halaman ini.',citations:[cite('Baggage/cargo compartment','7-24',394)]},
  windows:{title:'Jendela kabin & windshield',summary:'POH menjelaskan windshield dua bagian dan jendela kabin. Susunan jendela berbeda antara versi penumpang dan kargo, termasuk kaca pada pintu awak serta pintu belakang.',scope:'Beberapa objek adalah sisi dalam/luar kaca yang sama. Jumlah mesh tidak digunakan sebagai jumlah jendela fisik.',citations:[cite('Cabin windows','7-35',405)]},
  lights:{title:'Sistem lampu eksterior',summary:'POH mencakup lampu navigasi, landing, taxi/recognition, strobe, serta lampu luar opsional. Lampu navigasi berada di ujung sayap dan ekor.',coverage:'system',scope:'Objek lampu dan penutup dikelompokkan secara visual; tipe setiap lampu belum dikonfirmasi.',citations:[cite('Lighting system — exterior lighting','7-77',447)]},
  pitot:{title:'Sistem pitot-static',summary:'Sistem pitot-static menyediakan tekanan untuk airspeed indicator, altimeter, dan vertical speed indicator. Tekanan pitot dan tekanan statis digunakan oleh instrumen sesuai fungsinya.',scope:'Objek probe tidak mencakup seluruh jalur tekanan, static ports, atau pemanas internal.',citations:[pitot,flightInstruments]},
  exhaust:{title:'Jalur gas buang mesin',summary:'POH menjelaskan gas buang dari power turbine yang diarahkan melalui exhaust plenum menuju saluran buang di sisi kanan mesin.',coverage:'system',scope:'Rujukan sistem mesin untuk objek luar echappe; komponen internal mesin tidak ditetapkan dari objek ini.',citations:[cite('Engine — exhaust and accessories','7-39',409)]},
}
export function getComponentManual(sourceName:string):ComponentManualEntry|undefined {
  if(Object.hasOwn(componentManuals,sourceName)) return componentManuals[sourceName]
  const key=getSourceClassification(sourceName)?.referenceKey
  return key && Object.hasOwn(familyManuals,key) ? familyManuals[key] : undefined
}
