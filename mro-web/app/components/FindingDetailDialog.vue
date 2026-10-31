<script setup lang="ts">
import { PhX,PhClockCounterClockwise,PhWarningCircle,PhArrowRight } from '@phosphor-icons/vue'
import { findingSeverities,getFindingSeverity,type FindingSeverity } from '../types/severity'
import { findingStatuses,findingCategories,type Finding,type FindingStatus,type FindingEvent } from '../types/findings'
import type { FindingsSpace } from '../utils/findingsRepository'
import {findingEventTitle} from '../utils/findingEventTitle'
import { statusChangeIssue } from '../utils/repairWork'
const props=defineProps<{finding:Finding|null;space:FindingsSpace;saveStatus:(id:string,revision:number,status:FindingStatus,note:string,severity?:FindingSeverity)=>Promise<Finding>}>()
const emit=defineEmits<{closed:[];saved:[];reportExported:[report:{findingId:string;revision:number;space:FindingsSpace}];locate:[assetId:string];requestMaterial:[id:string];repair:[target:{findingId:string;mode:'record'|'review'}]}>()
const dialog=useTemplateRef<HTMLDialogElement>('dialog')
const nextSeverity=ref<FindingSeverity>('unassessed')
const nextStatus=ref<FindingStatus>('open'),note=ref(''),baseline=ref(0)
const reportBusy=ref(false)
const saving=ref(false),error=ref(''),discard=ref(false),success=ref('')
const stale=computed(()=>!!props.finding && baseline.value!==props.finding.revision)
const dirty=computed(()=>!!note.value || (!!props.finding && (nextStatus.value!==props.finding.status || nextSeverity.value!==getFindingSeverity(props.finding))))
const formatTime=(iso:string)=>new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'}).format(new Date(iso))
watch(()=>props.finding?.id,async id=>{
  if (!id || !props.finding) {dialog.value?.close();return}
  nextStatus.value=props.finding.status;nextSeverity.value=getFindingSeverity(props.finding);baseline.value=props.finding.revision
  note.value='';error.value='';success.value='';discard.value=false
  await nextTick();dialog.value?.showModal()
})
function close() {dialog.value?.close();emit('closed')}
function requestClose() {if(saving.value||reportBusy.value)return;if(dirty.value){discard.value=true;return}close()}
function rebase() {if (!props.finding)return;baseline.value=props.finding.revision;nextStatus.value=props.finding.status;nextSeverity.value=getFindingSeverity(props.finding);error.value=''}
async function submit() {
  if (!props.finding || saving.value || stale.value) return
  saving.value=true;error.value='';success.value=''
  try {
    const saved=await props.saveStatus(props.finding.id,baseline.value,nextStatus.value,note.value,nextSeverity.value)
    baseline.value=saved.revision;nextStatus.value=saved.status;nextSeverity.value=getFindingSeverity(saved);note.value=''
    success.value='Catatan dan riwayat tersimpan di browser ini.';emit('saved')
  } catch(cause) {error.value=cause instanceof Error ? cause.message : 'Perubahan belum tersimpan.'}
  finally {saving.value=false}
}
const eventTitle=findingEventTitle
</script>
<template>
  <dialog ref="dialog" class="finding-dialog detail-dialog" aria-labelledby="finding-detail-title" @cancel.prevent="requestClose">
    <div v-if="finding">
      <header class="dialog-header"><div><p>Temuan · C208 Demo</p><h2 id="finding-detail-title">{{ finding.title }}</h2></div><button type="button" class="icon-button" aria-label="Tutup detail temuan" :disabled="saving||reportBusy" @click="requestClose"><PhX :size="21" /></button></header>
      <div class="dialog-body">
        <div class="finding-heading-meta"><span class="finding-status" :class="finding.status">{{ findingStatuses[finding.status] }}</span><SeverityBadge :severity="getFindingSeverity(finding)" /><span v-if="finding.sample" class="sample-label">Data contoh</span><span>{{ findingCategories[finding.category] }}</span><span v-if="finding.priority==='high'" class="priority-label">Prioritas tinggi</span></div>
        <WorkReportButton :finding-id="finding.id" :space="space" :disabled="saving||dirty" @busy="reportBusy=$event" @exported="emit('reportExported',$event)" />
        <div class="finding-target"><span>Komponen</span><strong>{{ finding.componentLabel }}</strong><small>{{ finding.sourceName }} · {{ finding.assetId }}</small><button type="button" class="text-button" :disabled="saving || dirty" @click="emit('locate',finding.assetId);close()">Lihat pada pesawat <PhArrowRight :size="13" /></button></div>
        <h3 class="finding-section-title">Deskripsi pengamatan</h3><p class="finding-description">{{ finding.description }}</p>
        <div v-if="finding.photos.length" class="saved-photo-grid"><figure v-for="photo in finding.photos" :key="photo.id"><FindingPhoto :photo="photo" large /><figcaption>{{ photo.name }}</figcaption></figure></div>
        <WorkMaterialDetails :finding="finding" :disabled="saving||dirty" @request="emit('requestMaterial',finding.id);close()" />
        <WorkRepairSummary :finding="finding" :disabled="saving||dirty" @open="emit('repair',{findingId:finding.id,mode:$event});close()" />
        <form class="status-update-form" @submit.prevent="submit"><h3 class="finding-section-title">Tindak lanjut</h3><label class="form-field">Status pencatatan<select v-model="nextStatus" name="finding-status" :disabled="saving || stale"><option v-for="(label,key) in findingStatuses" :key="key" :value="key" :disabled="!!statusChangeIssue(finding,key)">{{ label }}</option></select><small class="field-help">Status pemeriksaan, pengerjaan ulang, dan penutupan mengikuti kartu pengerjaan. Catatan lama yang ditutup tetap dapat dibuka kembali.</small></label><label class="form-field">Tingkat kritis kerusakan<select v-model="nextSeverity" name="assessment-severity" aria-describedby="assessment-severity-help" :disabled="saving || stale"><option v-for="(label,key) in findingSeverities" :key="key" :value="key">{{ label }}</option></select><small id="assessment-severity-help" class="field-help">Penilaian pengguna. Bisa diperbarui tanpa mengubah status; perubahan dicatat pada riwayat.</small></label><div class="severity-form-preview"><SeverityBadge :severity="nextSeverity" /></div><label class="form-field">Catatan tindak lanjut<textarea v-model="note" name="status-note" aria-describedby="status-note-help" rows="3" required minlength="5" maxlength="1000" placeholder="Jelaskan tindak lanjut atau alasan perubahan status / tingkat kritis." :disabled="saving || stale" /><small id="status-note-help" class="field-help">Catat tindakan dan alasan perubahan · minimal 5 karakter.</small></label><p class="status-disclaimer">Status “Ditutup” hanya menutup catatan demo ini, bukan persetujuan pelepasan pesawat.</p><div v-if="stale" class="form-error" role="alert"><span>Temuan berubah di tab lain. Gunakan versi terbaru sebelum melanjutkan.</span><button type="button" class="text-button" @click="rebase">Gunakan versi terbaru</button></div><p v-if="error" class="form-error" role="alert"><PhWarningCircle :size="18" />{{ error }}</p><p v-if="success" class="save-success" role="status">{{ success }}</p><button type="submit" class="button primary" :disabled="saving || stale || (nextStatus===finding.status && nextSeverity===getFindingSeverity(finding)) || discard">{{ saving ? 'Menyimpan…' : 'Simpan tindak lanjut' }}</button></form>
        <section class="finding-history" aria-label="Riwayat temuan"><h3 class="finding-section-title"><PhClockCounterClockwise :size="17" /> Riwayat <span>{{ finding.history.length }}</span></h3><ol><li v-for="event in [...finding.history].reverse()" :key="event.id"><div><strong>{{ eventTitle(event) }}</strong><time :datetime="event.at">{{ formatTime(event.at) }} WIB</time></div><p v-if="event.toSeverity" class="severity-history-line">Kekritisan: <template v-if="event.fromSeverity">{{ findingSeverities[event.fromSeverity] }} → </template>{{ findingSeverities[event.toSeverity] }}</p><p>{{ event.note }}</p><small>{{ event.actor }}</small></li></ol></section>
        <div v-if="discard" class="discard-confirm" role="alert"><strong>Buang draf tindak lanjut?</strong><p>Catatan yang sudah tersimpan tetap tersedia.</p><div><button type="button" class="button subtle" @click="discard=false">Kembali mengisi</button><button type="button" class="button danger" @click="close">Buang draf</button></div></div>
      </div>
      <footer class="dialog-footer"><span>Tersimpan di browser ini · Demo lokal</span><button type="button" class="button" :disabled="saving||reportBusy" @click="requestClose">Tutup</button></footer>
    </div>
  </dialog>
</template>
