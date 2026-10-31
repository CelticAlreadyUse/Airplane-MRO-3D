<script setup lang="ts">
import { PhX,PhCamera,PhWarningCircle,PhPlus } from '@phosphor-icons/vue'
import type { AircraftComponent } from '../data/components'
import { findingCategories,type FindingDraft,type FindingPhoto } from '../types/findings'
import { findingSeverities,type FindingSeverity } from '../types/severity'
import { prepareFindingPhoto } from '../utils/findingPhotos'
const props=defineProps<{component:AircraftComponent|null;presentation?:boolean;save:(component:AircraftComponent,draft:FindingDraft)=>Promise<unknown>}>()
const emit=defineEmits<{closed:[];saved:[]}>()
const dialog=useTemplateRef<HTMLDialogElement>('dialog')
const title=ref(''),description=ref('')
const category=ref<FindingDraft['category']>('inspection')
const priority=ref<FindingDraft['priority']>('normal')
const severity=ref<FindingSeverity>('unassessed')
const photos=shallowRef<FindingPhoto[]>([])
const saving=ref(false),processing=ref(false),discard=ref(false),error=ref('')
const dirty=computed(()=>!!title.value || !!description.value || photos.value.length>0 || category.value!=='inspection' || priority.value!=='normal' || severity.value!=='unassessed')
const canClose=computed(()=>!saving.value && !processing.value)
let fileRun=0
function requestClose() {
  if (!canClose.value) return
  if (dirty.value) {discard.value=true;return}
  close()
}
function close() { dialog.value?.close();emit('closed') }
watch(()=>props.component,async component=>{
  if (!component) {dialog.value?.close();return}
  fileRun++
  title.value='';description.value='';category.value='inspection';priority.value='normal';severity.value='unassessed'
  photos.value=[];error.value='';discard.value=false
  await nextTick();dialog.value?.showModal()
})
async function addPhotos(event:Event) {
  const input=event.target as HTMLInputElement
  const files=[...input.files ?? []]
  input.value=''
  if (!files.length) return
  if (photos.value.length+files.length>3) {error.value='Lampirkan paling banyak 3 foto per temuan.';return}
  processing.value=true;error.value=''
  const run=++fileRun
  try {
    const prepared=await Promise.all(files.map(prepareFindingPhoto))
    if (run===fileRun) photos.value=[...photos.value,...prepared]
  } catch (cause) {error.value=cause instanceof Error ? cause.message : 'Foto belum dapat ditambahkan.'}
  finally {if (run===fileRun) processing.value=false}
}
async function submit() {
  if (!props.component || saving.value || processing.value) return
  saving.value=true;error.value=''
  try {
    // Capture identity at submission; camera/list selection cannot change the record target.
    await props.save(props.component,{title:title.value,description:description.value,category:category.value,priority:priority.value,severity:severity.value,photos:photos.value})
    dialog.value?.close();emit('saved');emit('closed')
  } catch (cause) {error.value=cause instanceof Error ? cause.message : 'Temuan belum tersimpan. Draf tetap tersedia.'}
  finally {saving.value=false}
}
</script>
<template>
  <dialog ref="dialog" class="finding-dialog" aria-labelledby="new-finding-title" @cancel.prevent="requestClose">
    <form v-if="component" class="finding-form" @submit.prevent="submit">
      <header class="dialog-header"><div><p>Temuan baru · C208 Demo</p><h2 id="new-finding-title">Catat temuan</h2></div><button type="button" class="icon-button" aria-label="Tutup formulir temuan" :disabled="!canClose" @click="requestClose"><PhX :size="21" /></button></header>
      <div class="dialog-body">
        <div class="finding-target"><span>Komponen terpilih</span><strong>{{ component.label }}</strong><small>{{ component.sourceName }} · {{ component.id }}</small></div>
        <div class="form-section-heading"><span>01</span><div><strong>Pengamatan teknisi</strong><p>Tuliskan kondisi yang benar-benar terlihat pada komponen.</p></div></div>
        <label class="form-field">Judul temuan <span class="required-hint">Wajib</span><input v-model="title" name="finding-title" aria-describedby="finding-title-help" required minlength="3" maxlength="120" placeholder="Contoh: indikasi keausan pada roda" autofocus :disabled="saving" /><small id="finding-title-help" class="field-help">Ringkas dan spesifik · 3–120 karakter</small></label>
        <div class="form-row"><label class="form-field">Kategori<select v-model="category" name="finding-category" :disabled="saving"><option v-for="(label,key) in findingCategories" :key="key" :value="key">{{ label }}</option></select></label><label class="form-field">Prioritas pencatatan<select v-model="priority" name="finding-priority" :disabled="saving"><option value="normal">Normal</option><option value="high">Tinggi</option></select></label></div>
        <label class="form-field">Tingkat kritis kerusakan<select v-model="severity" name="finding-severity" aria-describedby="severity-new-help" :disabled="saving"><option v-for="(label,key) in findingSeverities" :key="key" :value="key">{{ label }}</option></select><small id="severity-new-help" class="field-help">Diisi berdasarkan penilaian pengguna, terpisah dari prioritas pekerjaan. Foto dan model tidak menilai kerusakan secara otomatis.</small></label>
        <div class="severity-form-preview"><SeverityBadge :severity="severity" /><span>Warna pada komponen 3D mengikuti tingkat tertinggi dari temuan aktif.</span></div>
        <label class="form-field">Deskripsi temuan <span class="required-hint">Wajib</span><textarea v-model="description" name="finding-description" aria-describedby="finding-description-help finding-description-count" required minlength="10" maxlength="2000" rows="4" placeholder="Jelaskan kondisi yang terlihat, lokasi, dan hasil pengamatan." :disabled="saving" /><small id="finding-description-help" class="field-help">Sertakan lokasi, kondisi, dan hasil pengamatan · minimal 10 karakter.</small><small id="finding-description-count">{{ description.length }}/2.000 karakter</small></label>
        <fieldset class="photo-fieldset"><legend><PhCamera :size="17" /> Foto temuan <span>Opsional</span></legend><p>JPG, PNG, atau WebP · maksimal 3 foto, masing-masing 4 MB. Foto diperkecil sebelum disimpan.</p><div class="photo-drafts"><figure v-for="photo in photos" :key="photo.id"><FindingPhoto :photo="photo" /><button type="button" :aria-label="`Hapus foto ${photo.name}`" :disabled="saving || processing" @click="photos=photos.filter(p=>p.id!==photo.id)"><PhX :size="14" /></button><figcaption>{{ photo.name }}</figcaption></figure><label v-if="photos.length<3" class="photo-upload" :class="{disabled:saving || processing}"><PhPlus :size="21" /><span>{{ processing ? 'Memproses…' : 'Tambah foto' }}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Lampirkan foto temuan" :disabled="saving || processing" @change="addPhotos" /></label></div></fieldset>
        <p v-if="error" class="form-error" role="alert"><PhWarningCircle :size="18" />{{ error }}</p>
        <div v-if="discard" class="discard-confirm" role="alert"><strong>Buang draf temuan ini?</strong><p>Isi yang belum disimpan akan hilang.</p><div><button type="button" class="button subtle" @click="discard=false">Kembali mengisi</button><button type="button" class="button danger" @click="close">Buang draf</button></div></div>
      </div>
      <footer class="dialog-footer"><span>{{ presentation?'Mode presentasi · Dapat diulang':'Catatan latihan · Browser ini' }}</span><div><button type="button" class="button" :disabled="!canClose" @click="requestClose">Batal</button><button type="submit" class="button primary" :disabled="saving || processing || discard">{{ saving ? 'Menyimpan…' : 'Simpan temuan' }}</button></div></footer>
    </form>
  </dialog>
</template>
