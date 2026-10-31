export interface AircraftManual {
  id: string
  title: string
  subtitle: string
  category: string
  publisher: string
  revision: string
  applicability: string
  note: string
  file: string
  source: string
  sourceLabel: string
  bytes: number
  pages: number
  startPage: number
}
export const aircraftManuals: AircraftManual[] = [
  {
    id:'c208-poh', title:'Pilot’s Operating Handbook', subtitle:'C208 · 675 SHP · FAA Airplane Flight Manual',
    category:'POH / AFM · Arsip pelatihan', publisher:'Cessna Aircraft Company',
    revision:'D1352-6-13PH · Rev. 6, 30 Oktober 2002; termasuk temporary revision 2004',
    applicability:'Model 208 (675 SHP), serial 20800277 dan seterusnya sesuai halaman judul. Kesesuaian unit demo belum diverifikasi.',
    note:'Salinan bertanda “For Training Purposes Only”. Buku operasi pilot, bukan Aircraft Maintenance Manual (AMM). Berkas arsip mencakup halaman revisi dan suplemen; dibuka pada halaman judul 79.',
    file:'/manuals/c208-poh-training-1998.pdf',
    source:'https://www.aeroelectric.com/Reference_Docs/Cessna/cessna-poh/C208_675HP_1998_POH_Cessna-Caravan-updated-to-2004.pdf',
    sourceLabel:'AeroElectric · mirror publik', bytes:63671391, pages:1112, startPage:79,
  },
  {
    id:'c208-type', title:'Type Acceptance Report', subtitle:'Textron Aviation 208 Series · TAR 96/10',
    category:'Referensi sertifikasi', publisher:'Civil Aviation Authority of New Zealand',
    revision:'Revision 3 · 21 Februari 2017',
    applicability:'Seri 208 / 208B yang tercantum dalam laporan penerimaan tipe Selandia Baru.',
    note:'Dokumen regulator untuk identitas tipe dan referensi publikasi. Bukan petunjuk pekerjaan perawatan atau pengganti AMM.',
    file:'/manuals/c208-type-acceptance.pdf',
    source:'https://www.aviation.govt.nz/assets/aircraft/type-acceptance-reports/Cessna_208_Series.pdf',
    sourceLabel:'CAA New Zealand · sumber resmi', bytes:108586, pages:18, startPage:1,
  },
]
