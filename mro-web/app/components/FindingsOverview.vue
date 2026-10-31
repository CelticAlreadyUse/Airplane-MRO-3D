<script setup lang="ts">
import { PhX,PhMagnifyingGlass,PhCaretRight,PhClipboardText } from '@phosphor-icons/vue'
import { getFindingSeverity,findingSeverities,type FindingSeverity } from '../types/severity'
import { findingStatuses,type Finding,type FindingStatus } from '../types/findings'
const props=defineProps<{open:boolean;findings:Finding[];storageReady:boolean;storageError:string}>()
const emit=defineEmits<{closed:[];select:[id:string];reload:[]}>()
const dialog=useTemplateRef<HTMLDialogElement>('dialog')
const severityFilter=ref<'all'|FindingSeverity>('all')
const query=ref(''),filter=ref<'all'|FindingStatus>('all')
const filtered=computed(()=>props.findings.filter(f=>(filter.value==='all'||f.status===filter.value)&&(severityFilter.value==='all'||getFindingSeverity(f)===severityFilter.value)&&`${f.title} ${f.description} ${f.componentLabel} ${f.sourceName}`.toLocaleLowerCase('id').includes(query.value.trim().toLocaleLowerCase('id'))))
watch(()=>props.open,async open=>{if(open){await nextTick();dialog.value?.showModal()}else dialog.value?.close()})
function close(){dialog.value?.close();emit('closed')}
function select(id:string){close();emit('select',id)}
</script>
<template>
  <dialog ref="dialog" class="finding-dialog overview-dialog" aria-labelledby="findings-overview-title" @cancel.prevent="close">
    <header class="dialog-header"><div><p>Cessna 208 Caravan · Demo</p><h2 id="findings-overview-title">Temuan pesawat <span class="overview-total">{{ storageReady ? findings.length : '—' }}</span></h2></div><button class="icon-button" aria-label="Tutup daftar temuan" @click="close"><PhX :size="21" /></button></header>
    <div class="dialog-body">
      <p class="overview-intro">Semua catatan pada pesawat demo ini, dikelompokkan melalui komponen yang dipilih.</p>
      <div class="overview-filters"><label class="form-field">Cari temuan<input v-model="query" name="finding-search" placeholder="Cari judul atau komponen…" aria-label="Cari temuan" /></label><label class="form-field">Status pencatatan<select v-model="filter" aria-label="Filter status temuan"><option value="all">Semua status</option><option v-for="(label,key) in findingStatuses" :key="key" :value="key">{{ label }}</option></select></label><label class="form-field">Kekritisan<select v-model="severityFilter" aria-label="Filter kekritisan temuan"><option value="all">Semua tingkat</option><option v-for="(label,key) in findingSeverities" :key="key" :value="key">{{ label }}</option></select></label></div>
      <div v-if="storageError" class="form-error" role="alert">{{ storageError }}<button class="text-button" @click="$emit('reload')">Coba muat lagi</button></div>
      <p v-else-if="!storageReady" role="status">Membuka penyimpanan lokal…</p>
      <template v-else>
        <div v-if="!filtered.length" class="overview-empty"><PhClipboardText :size="33" /><h3>{{ findings.length ? 'Tidak ada temuan yang sesuai' : 'Mulai dari komponen pesawat' }}</h3><p>{{ findings.length ? 'Ubah kata pencarian atau filter status.' : 'Pilih bagian pada model, lalu tekan Catat temuan.' }}</p></div>
        <div v-else class="overview-records"><button v-for="finding in filtered" :key="finding.id" class="finding-row" :aria-label="`Buka temuan ${finding.title}`" @click="select(finding.id)"><div><span class="finding-status" :class="finding.status">{{ findingStatuses[finding.status] }}</span><SeverityBadge :severity="getFindingSeverity(finding)" /><span v-if="finding.sample" class="sample-label">Data contoh</span><strong>{{ finding.title }}</strong><small>{{ finding.componentLabel }} · {{ finding.photos.length }} foto</small><p>{{ finding.description }}</p></div><PhCaretRight :size="17" /></button></div>
        <p class="overview-count">{{ filtered.length }} dari {{ findings.length }} temuan</p>
      </template>
    </div>
    <footer class="dialog-footer"><span>Tersimpan di browser ini · Demo lokal</span><button class="button" @click="close">Kembali ke pesawat</button></footer>
  </dialog>
</template>
