<script setup lang="ts">
import { PhMagnifyingGlass, PhFilePdf, PhArrowSquareOut, PhInfo, PhBookOpen, PhArrowLeft } from '@phosphor-icons/vue'
import { aircraftManuals } from '../data/manuals'
import type { ManualPageRequest } from '../types/manualNavigation'
const props=defineProps<{ active:boolean;navigation?:ManualPageRequest|null }>()
defineEmits<{returnToComponent:[assetId:string]}>()
const readerRequest=shallowRef<ManualPageRequest|null>(null)
const referenceContext=useTemplateRef<HTMLElement>('referenceContext')
const query=ref('')
const selectedId=ref(aircraftManuals[0]!.id)
const selected=computed(()=>aircraftManuals.find(m=>m.id===selectedId.value)!)
const filtered=computed(()=>aircraftManuals.filter(m=>`${m.title} ${m.subtitle} ${m.category} ${m.publisher}`.toLocaleLowerCase('id').includes(query.value.trim().toLocaleLowerCase('id'))))
function selectManual(id:string) { selectedId.value=id;readerRequest.value=null }
watch(()=>props.navigation,async request=>{
  if(!request || !aircraftManuals.some(manual=>manual.id===request.manualId)) return
  selectedId.value=request.manualId;query.value='';readerRequest.value=request
  await nextTick()
  if(props.active){
    referenceContext.value?.focus()
    if(window.matchMedia('(max-width: 680px)').matches) referenceContext.value?.scrollIntoView({block:'start'})
  }
},{immediate:true})
</script>
<template>
  <div class="manuals-workspace">
    <aside class="manual-library" aria-label="Daftar manual pesawat">
      <div class="manual-library-heading"><span class="manual-eyebrow">C208 / DOCUMENT LIBRARY</span><h2>Manual pesawat</h2><p>Dokumen dan referensi untuk mengenali Caravan.</p></div>
      <label class="manual-search-label" for="manual-search">Cari dokumen</label>
      <div class="search-wrap manual-search"><PhMagnifyingGlass :size="18" /><input id="manual-search" v-model="query" placeholder="Judul, jenis, atau penerbit…" /><button v-if="query" class="text-button" @click="query=''" aria-label="Hapus pencarian manual">Hapus</button></div>
      <div class="manual-result-count" role="status">{{ filtered.length }} dokumen PDF tersedia</div>
      <div class="manual-cards"><button v-for="manual in filtered" :key="manual.id" class="manual-card" :class="{selected:manual.id===selectedId}" :aria-pressed="manual.id===selectedId" @click="selectManual(manual.id)"><span class="manual-file-icon"><PhFilePdf :size="24" /></span><span class="manual-card-copy"><small>{{ manual.category }}</small><strong>{{ manual.title }}</strong><span>{{ manual.subtitle }}</span><em>{{ manual.pages.toLocaleString('id-ID') }} halaman · {{ (manual.bytes/1_000_000).toFixed(1) }} MB</em></span></button></div>
      <p v-if="!filtered.length" class="manual-no-results">Tidak ada dokumen yang cocok. Coba “POH”, “C208”, atau “sertifikasi”.</p>
      <div class="official-manual"><PhBookOpen :size="22" /><h3>Manual perawatan resmi</h3><p>AMM, IPC, dan wiring diagram terkendali tersedia melalui Textron 1View. Pilih publikasi sesuai serial dan konfigurasi pesawat.</p><a href="https://pubs.txtav.com/" target="_blank" rel="noopener noreferrer">Buka Textron 1View <PhArrowSquareOut :size="15" /></a><small>Akses mengikuti akun atau langganan penerbit.</small></div>
      <p class="manual-library-note"><PhInfo :size="16" /> Koleksi referensi demo. Revisi dan kesesuaian dokumen dengan unit pesawat perlu diperiksa.</p>
    </aside>
    <section class="manual-document" :aria-label="selected.title">
      <div v-if="readerRequest" ref="referenceContext" class="manual-reference-context" tabindex="-1" aria-label="Konteks referensi komponen"><div><span>Dari Struktur pesawat</span><strong>{{ readerRequest.componentLabel }}</strong><p>{{ readerRequest.section }} · Buku {{ readerRequest.bookPage }} · PDF {{ readerRequest.pdfPage }}</p></div><button class="button subtle" @click="$emit('returnToComponent',readerRequest.assetId)"><PhArrowLeft :size="15" /> Kembali ke komponen</button></div>
      <header class="manual-document-heading"><div><span class="manual-eyebrow">{{ selected.category }}</span><h2>{{ selected.title }}</h2><p>{{ selected.publisher }}</p></div><a class="button subtle" :href="selected.source" target="_blank" rel="noopener noreferrer">Sumber asli <PhArrowSquareOut :size="15" /></a></header>
      <details class="manual-metadata"><summary><PhInfo :size="16" /><span>{{ selected.revision }}</span><span class="metadata-more">Detail dokumen</span></summary><div><dl><div><dt>Cakupan</dt><dd>{{ selected.applicability }}</dd></div><div><dt>Sumber salinan</dt><dd><a :href="selected.source" target="_blank" rel="noopener noreferrer">{{ selected.sourceLabel }}</a> · diakses 31 Oktober 2026</dd></div></dl><p>{{ selected.note }}</p></div></details>
      <p class="manual-reference-note"><PhInfo :size="16" /><span>{{ selected.id==='c208-poh' ? 'Arsip pelatihan · POH/AFM, bukan manual perawatan terkini.' : 'Referensi sertifikasi · bukan prosedur pekerjaan perawatan.' }}</span></p>
      <ClientOnly><PdfReader :url="selected.file" :title="selected.title" :initial-page="selected.startPage" :navigation="readerRequest" :active="active" /><template #fallback><div class="pdf-state" role="status">Menyiapkan pembaca PDF…</div></template></ClientOnly>
    </section>
  </div>
</template>
