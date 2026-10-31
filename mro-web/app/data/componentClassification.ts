import sourceFamilies from './componentClassifications.json'

export const groupOrder = ['Struktur', 'Propulsi', 'Landing gear', 'Pintu', 'Permukaan kendali', 'Kabin & interior', 'Instrumen penerbangan', 'Avionik & navigasi', 'Panel & kendali kokpit', 'Lampu eksterior', 'Perlu verifikasi', 'Belum teridentifikasi'] as const
export type ComponentGroup = typeof groupOrder[number]
interface SourceFamily {
  id: string
  label: string
  group: ComponentGroup
  description: string
  referenceKey: string | null
  classified: boolean
  evidence: string
  sourceNames: string[]
}

// Closed list from the unchanged GLB. Never infer technical identity from an
// arbitrary prefix typed by a caller. Material evidence lives in phase-9 reports.
export const classificationFamilies = sourceFamilies as SourceFamily[]
const bySource = new Map<string, SourceFamily>()
for (const family of classificationFamilies) {
  for (const name of family.sourceNames) {
    if (bySource.has(name)) throw new Error(`Duplicate classification: ${name}`)
    bySource.set(name, family)
  }
}
export const getSourceClassification = (sourceName: string) => bySource.get(sourceName)

const detailNames: Record<string, string> = {
  face:'Muka instrumen', fond:'Latar instrumen', vitre:'Kaca instrumen', needle:'Jarum',
  knob:'Knob', ring:'Cincin skala', aircraft:'Simbol pesawat', background:'Latar horizon',
  float:'Elemen horizon', scale:'Skala', inhg:'Skala tekanan barometrik', InhgKnob:'Knob tekanan barometrik',
  needle100:'Jarum ratusan kaki', needle1000:'Jarum ribuan kaki', needle10000:'Jarum puluhan ribu kaki',
  HourHand:'Jarum jam', MinuteHand:'Jarum menit', SecondHand:'Jarum detik', button:'Tombol',
  card:'Kartu arah', screws:'Sekrup', visses:'Sekrup', Chassis:'Chassis',
  Yoke:'Control wheel', LeftPedal:'Pedal kiri', RightPedal:'Pedal kanan',
  Airplane:'Simbol pesawat', Ball:'Bola slip', BallEnclosure:'Rumah bola slip',
  panel:'Panel utama', panel2:'Panel tambahan 2', panel3:'Panel tambahan 3',
  interieur:'Pelapis interior', planchet:'Lantai kabin', 'barres.001':'Detail interior barres.001',
}
export function classificationDetail(sourceName: string, family: SourceFamily): string {
  if (family.id === 'seats') return `Objek kursi ${Number(sourceName.split('.')[1] ?? 0) + 1}`
  const normalized = sourceName.replace(/\.\d+$/, '')
  const token = normalized.includes('.') ? normalized.slice(normalized.indexOf('.') + 1) : normalized
  const label = detailNames[sourceName] ?? detailNames[token] ?? sourceName
  // Show the original suffix without assigning an aircraft side or seat position.
  return label !== sourceName && /\.\d+$/.test(sourceName) ? `${label} · ${sourceName}` : label
}
