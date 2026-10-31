<script setup lang="ts">
import {PhX,PhDownloadSimple,PhUploadSimple,PhWarningCircle} from '@phosphor-icons/vue'
import {findingStatuses} from '../types/findings'
import type { FindingsSpace } from '../utils/findingsRepository'
import {listFindings,getRestoreState} from '../utils/findingsRepository'
import {encodeBackup,decodeBackup,getBackupContext,type DecodedBackup} from '../utils/backupCodec'
import {downloadFile} from '../utils/downloadFile'
const props=defineProps<{open:boolean;activeSpace:FindingsSpace;restore:(file:Blob,token:string)=>Promise<void>}>()
const emit=defineEmits<{closed:[];restored:[]}>()
const dialog=useTemplateRef<HTMLDialogElement>('dialog'),fileInput=useTemplateRef<HTMLInputElement>('fileInput')
const exportSpace=ref<FindingsSpace>('practice'),busy=ref(false),progress=ref(''),error=ref(''),success=ref(''),acknowledged=ref(false)
const selectedFile=shallowRef<File|null>(null)
const preview=shallowRef<{backup:DecodedBackup;token:string;currentCount:number}|null>(null)
const spaceLabel=(space:FindingsSpace)=>space==='practice'?'latihan':'presentasi'
const time=(iso:string)=>new Date(iso).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'})+' WIB'
function close(){if(busy.value)return;dialog.value?.close();emit('closed')}
async function show(){
  exportSpace.value=props.activeSpace;error.value='';success.value='';preview.value=null;selectedFile.value=null;acknowledged.value=false
  await nextTick();if(fileInput.value)fileInput.value.value='';if(dialog.value&&!dialog.value.open)dialog.value.showModal()
}
watch(()=>props.open,open=>{if(open)void show();else dialog.value?.close()})
onMounted(()=>{if(props.open)void show()})
async function exportBackup(space=exportSpace.value){
  if(busy.value)return
  busy.value=true;error.value='';success.value='';progress.value='Mengumpulkan catatan dan foto…'
  try{
    const records=await listFindings(space),result=await encodeBackup(records,space,await getBackupContext())
    downloadFile(result.blob,`mantiq-mro-${space}-${new Date().toISOString().replace(/[:.]/g,'-')}.backup.json`)
    success.value=`Unduhan backup mode ${spaceLabel(space)} dimulai: ${result.summary.records} pekerjaan, ${result.summary.attachments} lampiran foto.`
  }catch(cause){error.value=cause instanceof Error?cause.message:'Backup belum dapat diunduh.'}finally{busy.value=false;progress.value=''}
}
async function inspect(event:Event){
  const file=(event.target as HTMLInputElement).files?.[0]
  if(!file||busy.value)return
  selectedFile.value=file;preview.value=null;acknowledged.value=false;error.value='';success.value='';busy.value=true;progress.value='Memvalidasi file, foto, dan transaksi stok…'
  try{const backup=await decodeBackup(file,await getBackupContext()),current=await getRestoreState(backup.summary.space);preview.value={backup,token:current.token,currentCount:current.count}}
  catch(cause){error.value=cause instanceof Error?cause.message:'File belum dapat divalidasi.'}finally{busy.value=false;progress.value=''}
}
async function restore(){
  if(!preview.value||!selectedFile.value||!acknowledged.value||busy.value)return
  busy.value=true;error.value='';success.value='';progress.value='Memvalidasi ulang dan memulihkan data…'
  const target=preview.value.backup.summary.space
  try{await props.restore(selectedFile.value,preview.value.token);exportSpace.value=target;success.value=`Data mode ${spaceLabel(target)} berhasil dipulihkan. Mode tersebut sekarang aktif.`;preview.value=null;selectedFile.value=null;acknowledged.value=false;if(fileInput.value)fileInput.value.value='';emit('restored')}
  catch(cause){error.value=cause instanceof Error?cause.message:'Data belum dipulihkan.';preview.value=null;acknowledged.value=false;if(fileInput.value)fileInput.value.value=''}
  finally{busy.value=false;progress.value=''}
}
</script>
<template>
 <dialog ref="dialog" class="finding-dialog backup-dialog" aria-labelledby="backup-title" @cancel.prevent="close"><div class="backup-dialog-layout"><header class="dialog-header"><div><p>C208 Demo · Data browser ini</p><h2 id="backup-title">Data & backup</h2></div><button class="icon-button" aria-label="Tutup data dan backup" :disabled="busy" @click="close"><PhX :size="21" /></button></header><div class="dialog-body">
  <section class="backup-export"><h3>Unduh backup lengkap</h3><p>Temuan, foto, kartu pengerjaan, pemeriksaan, dan transaksi sparepart disimpan bersama. Setiap mode memiliki file backup terpisah.</p><label class="form-field">Mode data<select v-model="exportSpace" name="backup-space" :disabled="busy"><option value="practice">Latihan lokal</option><option value="scenario">Presentasi</option></select></label><button class="button primary export-backup" :disabled="busy" @click="exportBackup()"><PhDownloadSimple :size="18" /> Unduh backup</button><small>Format JSON lengkap · maksimal 64 MB per file.</small></section>
  <section class="backup-import"><h3>Pulihkan dari backup</h3><p>Pilih backup yang diunduh dari aplikasi ini. Isi file diperiksa terlebih dahulu; data baru diganti setelah konfirmasi.</p><label class="backup-file-picker"><PhUploadSimple :size="21" /><span>{{ selectedFile?.name??'Pilih file backup JSON' }}</span><input ref="fileInput" type="file" accept="application/json,.json" aria-label="Pilih file backup" :disabled="busy" @change="inspect" /></label>
   <div v-if="preview" class="backup-preview"><div class="backup-preview-heading"><strong>Pratinjau backup mode {{ spaceLabel(preview.backup.summary.space) }}</strong><span>{{ time(preview.backup.summary.exportedAt) }}</span></div><div class="backup-counts"><div><strong>{{ preview.backup.summary.records }}</strong><span>Pekerjaan</span></div><div><strong>{{ preview.backup.summary.attachments }}</strong><span>Lampiran foto</span></div><div><strong>{{ preview.backup.summary.cards }}</strong><span>Kartu pengerjaan</span></div><div><strong>{{ preview.backup.summary.requests }}</strong><span>Permintaan part</span></div></div><ul v-if="preview.backup.records.length" class="backup-record-preview"><li v-for="record in preview.backup.records.slice(0,5)" :key="record.id"><strong>{{ record.title }}</strong><span>{{ findingStatuses[record.status] }} · {{ record.componentLabel }}</span></li></ul><p v-else class="backup-empty-note">File ini kosong. Pemulihan akan mengosongkan catatan pesawat pada mode tersebut.</p><p class="backup-replace-note">{{ preview.currentCount }} pekerjaan mode {{ spaceLabel(preview.backup.summary.space) }} saat ini akan diganti dengan isi file. Mode {{ spaceLabel(preview.backup.summary.space==='practice'?'scenario':'practice') }} tetap tersimpan.</p><button class="button subtle export-current-backup" :disabled="busy" @click="exportBackup(preview.backup.summary.space)">Unduh data saat ini dulu</button><label class="backup-ack"><input v-model="acknowledged" name="confirm-restore" type="checkbox" :disabled="busy" /><span>Saya memahami bahwa data mode {{ spaceLabel(preview.backup.summary.space) }} akan diganti.</span></label><button class="button primary restore-backup" :disabled="!acknowledged||busy" @click="restore">Ganti data mode {{ spaceLabel(preview.backup.summary.space) }}</button></div>
  </section><p v-if="busy" class="backup-progress" role="status">{{ progress }}</p><p v-if="error" class="form-error backup-error" role="alert"><PhWarningCircle :size="18" />{{ error }}</p><p v-if="success" class="save-success backup-success" role="status">{{ success }}</p>
 </div><footer class="dialog-footer"><span>File dan foto diproses pada perangkat ini</span><button class="button" :disabled="busy" @click="close">Tutup</button></footer></div></dialog>
</template>
