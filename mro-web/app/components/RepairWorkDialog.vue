<script setup lang="ts">
import {PhX,PhWarningCircle,PhBookOpen} from '@phosphor-icons/vue'
import type { Finding,FindingPhoto } from '../types/findings'
import {reviewChecks,type RepairCommand,type RepairDialogTarget,type ReviewCheck} from '../types/repairWork'
import {repairSubmissionIssue} from '../utils/repairWork'
import {workOrderCode} from '../utils/materialRequests'
import {getComponentManual} from '../data/componentManuals'
const props=defineProps<{target:RepairDialogTarget|null;findings:Finding[];save:(id:string,revision:number,command:RepairCommand)=>Promise<Finding>}>()
const emit=defineEmits<{closed:[];saved:[]}>()
const dialog=useTemplateRef<HTMLDialogElement>('dialog')
const technician=ref(''),started=ref(''),completed=ref(''),actions=ref(''),reference=ref('')
const beforePhotos=shallowRef<FindingPhoto[]>([]),afterPhotos=shallowRef<FindingPhoto[]>([])
const inspector=ref(''),result=ref<'accepted'|'rework'>('accepted'),note=ref(''),checks=ref<ReviewCheck[]>([])
const saving=ref(false),beforeProcessing=ref(false),afterProcessing=ref(false),discard=ref(false),error=ref(''),baseline=ref(0),initial=ref('')
const finding=computed(()=>props.findings.find(f=>f.id===props.target?.findingId))
const latest=computed(()=>finding.value?.repairCards?.at(-1))
const manual=computed(()=>finding.value?getComponentManual(finding.value.sourceName):undefined)
const processing=computed(()=>beforeProcessing.value||afterProcessing.value)
const stale=computed(()=>!!finding.value&&finding.value.revision!==baseline.value)
const isReview=computed(()=>props.target?.mode==='review')
const issue=computed(()=>!finding.value?'Pekerjaan belum tersedia.':isReview.value?(finding.value.status!=='awaiting_review'||!latest.value||latest.value.review?'Kartu ini tidak sedang menunggu pemeriksaan.':''):repairSubmissionIssue(finding.value))
const snapshot=()=>JSON.stringify({technician:technician.value,started:started.value,completed:completed.value,actions:actions.value,reference:reference.value,before:beforePhotos.value.map(p=>p.id),after:afterPhotos.value.map(p=>p.id),inspector:inspector.value,result:result.value,note:note.value,checks:checks.value})
const dirty=computed(()=>snapshot()!==initial.value)
const locked=computed(()=>saving.value||processing.value||stale.value||!!issue.value)
function localTime(time:Date){return new Date(time.getTime()-time.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function close(){dialog.value?.close();emit('closed')}
function requestClose(){if(saving.value||processing.value)return;if(dirty.value){discard.value=true;return}close()}
watch(()=>props.target,async target=>{
  if(!target){dialog.value?.close();return}
  baseline.value=finding.value?.revision??0;technician.value='';started.value=localTime(new Date(Date.now()-30*60000));completed.value=localTime(new Date())
  actions.value='';reference.value='';beforePhotos.value=[...(finding.value?.photos??[])];afterPhotos.value=[]
  inspector.value='';result.value='accepted';note.value='';checks.value=[];error.value='';discard.value=false;beforeProcessing.value=false;afterProcessing.value=false
  initial.value=snapshot();await nextTick();dialog.value?.showModal()
})
async function submit(){
  if(!finding.value||locked.value)return
  saving.value=true;error.value=''
  try{
    let command:RepairCommand
    if(isReview.value){
      if(!latest.value)throw new Error('Kartu belum tersedia.')
      command={kind:'review',cardId:latest.value.id,inspector:inspector.value,result:result.value,note:note.value,checks:checks.value}
    }else{
      if(!Number.isFinite(Date.parse(started.value))||!Number.isFinite(Date.parse(completed.value)))throw new Error('Isi waktu mulai dan selesai yang valid.')
      command={kind:'submit',draft:{technician:technician.value,startedAt:new Date(started.value).toISOString(),completedAt:new Date(completed.value).toISOString(),actions:actions.value,reference:reference.value,beforePhotos:beforePhotos.value,afterPhotos:afterPhotos.value}}
    }
    await props.save(finding.value.id,baseline.value,command);emit('saved');close()
  }catch(cause){error.value=cause instanceof Error?cause.message:'Kartu belum tersimpan.'}
  finally{saving.value=false}
}
</script>
<template>
 <dialog ref="dialog" class="finding-dialog repair-dialog" aria-labelledby="repair-dialog-title" @cancel.prevent="requestClose"><form v-if="target&&finding" @submit.prevent="submit">
  <header class="dialog-header"><div><p>{{ workOrderCode(finding) }} · {{ isReview?'Pemeriksaan demo':'Kartu pengerjaan' }}</p><h2 id="repair-dialog-title">{{ isReview?'Periksa hasil pengerjaan':'Catat hasil pengerjaan' }}</h2></div><button type="button" class="icon-button" aria-label="Tutup kartu pengerjaan" :disabled="saving||processing" @click="requestClose"><PhX :size="21" /></button></header>
  <div class="dialog-body"><div class="repair-context"><strong>{{ finding.title }}</strong><p>{{ finding.componentLabel }}</p></div><p class="repair-flow">Pengerjaan → Pemeriksaan → Ditutup / Pengerjaan ulang</p><p v-if="issue" class="repair-notice" role="status">{{ issue }}</p>
   <template v-if="isReview"><RepairCardReadout v-if="latest" :card="latest" /><fieldset class="repair-form-group" :disabled="locked"><legend>Hasil pemeriksaan demo</legend><label class="form-field">Nama pemeriksa<input v-model="inspector" name="repair-inspector" required minlength="2" maxlength="80" placeholder="Nama pemeriksa, berbeda dari teknisi" /><small class="field-help">Nama dicatat untuk simulasi pemeriksaan.</small></label><label class="form-field">Keputusan<select v-model="result" name="repair-result"><option value="accepted">Diterima — tutup pekerjaan</option><option value="rework">Perlu pengerjaan ulang</option></select></label><fieldset class="repair-review-checks"><legend>Tinjauan kelengkapan</legend><label v-for="(label,key) in reviewChecks" :key="key"><input v-model="checks" type="checkbox" :value="key" :name="`review-check-${key}`" :required="result==='accepted'" /><span>{{ label }}</span></label></fieldset><label class="form-field">Catatan pemeriksaan<textarea v-model="note" name="repair-review-note" required minlength="10" maxlength="2000" rows="3" placeholder="Catat hasil tinjauan atau hal yang perlu dikerjakan ulang." /></label></fieldset></template>
   <fieldset v-else class="repair-form-group" :disabled="locked"><legend>Kartu pengerjaan</legend><label class="form-field">Nama teknisi<input v-model="technician" name="repair-technician" required minlength="2" maxlength="80" placeholder="Nama pelaksana pengerjaan" /></label><div class="repair-time-fields"><label class="form-field">Mulai pengerjaan<input v-model="started" name="repair-started" type="datetime-local" required /></label><label class="form-field">Selesai pengerjaan<input v-model="completed" name="repair-completed" type="datetime-local" required /></label></div><label class="form-field">Tindakan yang dilakukan<textarea v-model="actions" name="repair-actions" required minlength="10" maxlength="4000" rows="4" placeholder="Jelaskan pekerjaan yang dilakukan dan hasil pengamatannya." /></label><label class="form-field">Dokumen rujukan pekerjaan<textarea v-model="reference" name="repair-reference" required minlength="5" maxlength="500" rows="2" placeholder="Nama dokumen, revisi, dan bagian/halaman yang digunakan." /></label><details v-if="manual" class="repair-reference-help"><summary><PhBookOpen :size="16" /> Rujukan pengenalan komponen</summary><p>Rujukan POH berikut menjelaskan komponen; catat dokumen pengerjaan yang digunakan pada kolom di atas.</p><a v-for="citation in manual.citations" :key="citation.pdfPage" :href="`/manuals/c208-poh-training-1998.pdf#page=${citation.pdfPage}`" target="_blank" rel="noopener noreferrer">{{ citation.section }} · Buku {{ citation.bookPage }} / PDF {{ citation.pdfPage }}</a></details><RepairPhotoField v-model="beforePhotos" stage="before" :disabled="locked" @processing="beforeProcessing=$event" /><RepairPhotoField v-model="afterPhotos" stage="after" :disabled="locked" @processing="afterProcessing=$event" /></fieldset>
   <div v-if="stale" class="form-error" role="alert">Pekerjaan berubah di tab lain. Tutup dialog dan buka kembali data terbaru. Draf di layar belum diubah.</div><p v-if="error" class="form-error" role="alert"><PhWarningCircle :size="18" />{{ error }}</p><div v-if="discard" class="discard-confirm" role="alert"><strong>Buang draf {{ isReview?'pemeriksaan':'pengerjaan' }}?</strong><p>Kartu yang sudah tersimpan tetap tersedia.</p><div><button type="button" class="button subtle" @click="discard=false">Kembali mengisi</button><button type="button" class="button danger" @click="close">Buang draf</button></div></div>
  </div><footer class="dialog-footer"><span>{{ isReview?'Pemeriksaan demo · bukan pelepasan pesawat':'Foto dan kartu tersimpan di browser ini' }}</span><div><button type="button" class="button" :disabled="saving||processing" @click="requestClose">Tutup</button><button type="submit" class="button primary" :disabled="locked||discard">{{ saving?'Menyimpan…':processing?'Memproses foto…':isReview?(result==='accepted'?'Terima & tutup pekerjaan':'Minta pengerjaan ulang'):'Simpan & ajukan pemeriksaan' }}</button></div></footer>
 </form></dialog>
</template>
