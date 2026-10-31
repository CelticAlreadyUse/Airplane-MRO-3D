import { classificationDetail, getSourceClassification, type ComponentGroup } from './componentClassification'
export { groupOrder } from './componentClassification'
export type { ComponentGroup } from './componentClassification'

export interface AircraftComponent {
  id: string
  label: string
  sourceName: string
  group: ComponentGroup
  description: string
  mapping: 'visual' | 'unmapped'
  assembly?: string
  detailLabel?: string
}

// Source object names are preserved. Labels are draft visual mappings, not a parts catalogue.
const definitions: Record<string, [string, ComponentGroup, string]> = {
  fuselage: ['Badan pesawat', 'Struktur', 'Bentuk luar badan pesawat dan sirip ekor yang tergabung dalam objek sumber.'],
  ailes: ['Sayap utama', 'Struktur', 'Kedua sisi sayap berada dalam satu objek sumber. Pemilihan per sisi memerlukan pemisahan aset.'],
  ailes2: ['Stabilizer horizontal', 'Struktur', 'Permukaan ekor horizontal sebagai satu objek visual.'],
  helice: ['Propeller', 'Propulsi', 'Geometri propeller terpisah dari badan pesawat.'],
  roueA: ['Roda depan', 'Landing gear', 'Objek roda depan; bagian dalam assembly belum dipetakan.'],
  roueG: ['Roda utama kiri', 'Landing gear', 'Roda kiri menurut nama sumber dan posisi model. Detail internal rem belum tersedia sebagai pemetaan terverifikasi.'],
  roueD: ['Roda utama kanan', 'Landing gear', 'Roda kanan menurut nama sumber dan posisi model.'],
  porteAG: ['Pintu depan kiri', 'Pintu', 'Objek panel pintu luar; kaca dan lapisan interior dapat berupa objek lain.'],
  porteAD: ['Pintu depan kanan', 'Pintu', 'Objek panel pintu luar; kaca dan lapisan interior dapat berupa objek lain.'],
  porteB: ['Panel pintu B', 'Pintu', 'Nama netral mengikuti sumber sampai fungsi dan posisi pintu dikonfirmasi.'],
  porteH: ['Panel pintu H', 'Pintu', 'Nama netral mengikuti sumber sampai fungsi dan posisi pintu dikonfirmasi.'],
  aileronG: ['Aileron kiri', 'Permukaan kendali', 'Pemetaan visual berdasarkan nama sumber; perlu validasi teknis.'],
  aileronD: ['Aileron kanan', 'Permukaan kendali', 'Pemetaan visual berdasarkan nama sumber; perlu validasi teknis.'],
  voletG: ['Flap kiri', 'Permukaan kendali', 'Pemetaan visual berdasarkan nama sumber; perlu validasi teknis.'],
  voletD: ['Flap kanan', 'Permukaan kendali', 'Pemetaan visual berdasarkan nama sumber; perlu validasi teknis.'],
  profondeur: ['Elevator', 'Permukaan kendali', 'Permukaan kendali ekor, mengikuti pemisahan objek sumber.'],
  direction: ['Rudder', 'Permukaan kendali', 'Permukaan kendali vertikal, mengikuti objek sumber.'],
}

export function describeComponent(id: string, sourceName: string): AircraftComponent {
  const known = Object.hasOwn(definitions, sourceName) ? definitions[sourceName] : undefined
  const family = getSourceClassification(sourceName)
  const detail = family ? classificationDetail(sourceName, family) : undefined
  return {
    id, sourceName,
    label: known?.[0] ?? (family ? `${family.label} — ${detail}` : sourceName),
    group: known?.[1] ?? family?.group ?? 'Belum teridentifikasi',
    description: known?.[2] ?? family?.description ?? 'Objek visual dari model sumber. Fungsi dan identitas komponen belum dipetakan.',
    mapping: known || family?.classified ? 'visual' : 'unmapped',
    assembly: family?.label,
    detailLabel: detail,
  }
}

export const quickParts = ['roueG', 'roueD', 'roueA', 'helice']
