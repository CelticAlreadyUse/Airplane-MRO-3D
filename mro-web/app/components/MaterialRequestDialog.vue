<script setup lang="ts">
import {PhX,PhPackage,PhWarningCircle} from '@phosphor-icons/vue'
import type { Finding } from '../types/findings'
import type { MaterialCommand,MaterialDialogTarget } from '../types/materialRequests'
import {inventoryWithRequests,workOrderCode,materialQuantities,materialEditingAllowed} from '../utils/materialRequests'
import {availableStock} from '../data/operations'
const props=defineProps<{target:MaterialDialogTarget|null;findings:Finding[];save:(id:string,revision:number,command:MaterialCommand)=>Promise<Finding>}>()
const emit=defineEmits<{closed:[];saved:[]}>()
const dialog=useTemplateRef<HTMLDialogElement>('dialog')
const partId=ref(''),quantity=ref(1),note=ref(''),baseline=ref(0)
const actor=ref(''),serialLot=ref('')
const saving=ref(false),error=ref(''),discard=ref(false)
const finding=computed(()=>props.findings.find(f=>f.id===props.target?.findingId))
const request=computed(()=>finding.value?.materialRequests?.find(r=>r.id===props.target?.requestId))
const parts=computed(()=>inventoryWithRequests(props.findings))
const selectedPart=computed(()=>parts.value.find(p=>p.id===(request.value?.partId??partId.value)))
const stale=computed(()=>!!finding.value && finding.value.revision!==baseline.value)
const dirty=computed(()=>!!note.value||quantity.value!==1||!!partId.value||!!actor.value||!!serialLot.value)
const title=computed(()=>props.target?.disposition?(props.target.disposition==='used'?'Catat pemakaian part':'Kembalikan part'):!props.target?.requestId?'Request sparepart':props.target.status==='ready'?'Siapkan sparepart':props.target.status==='issued'?'Serahkan sparepart':'Batalkan permintaan')
function close(){dialog.value?.close();emit('closed')}
function requestClose(){if(saving.value)return;if(dirty.value){discard.value=true;return}close()}
watch(()=>props.target,async target=>{
  if(!target){dialog.value?.close();return}
  partId.value='';quantity.value=1;note.value='';actor.value='';serialLot.value='';error.value='';discard.value=false;baseline.value=finding.value?.revision??0
  await nextTick();dialog.value?.showModal()
})
async function submit(){
  if(!finding.value||!props.target||saving.value||stale.value)return
  const target=props.target
  const command:MaterialCommand=target.requestId&&target.disposition
    ?{kind:'disposition',requestId:target.requestId,disposition:target.disposition,quantity:Number(quantity.value),actor:actor.value,serialLot:serialLot.value,note:note.value}
    :target.requestId&&target.status
    ?{kind:'transition',requestId:target.requestId,status:target.status,note:note.value}
    :{kind:'request',draft:{partId:partId.value,quantity:Number(quantity.value),note:note.value}}
  saving.value=true;error.value=''
  try{await props.save(finding.value.id,baseline.value,command);emit('saved');close()}
  catch(cause){error.value=cause instanceof Error?cause.message:'Permintaan belum tersimpan.'}
  finally{saving.value=false}
}
</script>
<template>
 <dialog ref="dialog" class="finding-dialog material-dialog" aria-labelledby="material-dialog-title" @cancel.prevent="requestClose">
  <form v-if="target && finding" @submit.prevent="submit">
   <header class="dialog-header"><div><p>Pekerjaan · {{ workOrderCode(finding) }}</p><h2 id="material-dialog-title">{{ title }}</h2></div><button type="button" class="icon-button" aria-label="Tutup permintaan sparepart" :disabled="saving" @click="requestClose"><PhX :size="21" /></button></header>
   <div class="dialog-body">
    <div class="material-work-context"><PhPackage :size="21" /><div><strong>{{ finding.title }}</strong><p>{{ finding.componentLabel }}</p></div></div>
    <p class="material-flow">Diajukan → Disiapkan → Diserahkan → Dipakai / Dikembalikan</p>
    <template v-if="!target.requestId">
     <label class="form-field">Sparepart <span class="required-hint">Wajib</span><select v-model="partId" name="request-part" required :disabled="saving||stale"><option value="" disabled>Pilih dari katalog sparepart…</option><option v-for="part in parts" :key="part.id" :value="part.id">{{ part.name }} · {{ availableStock(part) }} {{ part.unit }} tersedia</option></select></label>
     <label class="form-field">Jumlah yang dibutuhkan<input v-model.number="quantity" name="request-quantity" type="number" inputmode="numeric" min="1" max="999" step="1" required :disabled="saving||stale" /><small class="field-help">Jumlah utuh 1–999 {{ selectedPart?.unit??'unit' }}. Permintaan boleh diajukan saat stok kosong.</small></label>
    </template>
    <div v-else-if="request && selectedPart" class="material-action-context"><strong>{{ selectedPart.name }}</strong><p>{{ request.quantity }} {{ selectedPart.unit }} · {{ selectedPart.partNumber }}</p><p>{{ request.note }}</p></div>
    <template v-if="target.disposition&&request"><p class="material-usage-summary">Dipakai {{ materialQuantities(request).used }} · Dikembalikan {{ materialQuantities(request).returned }} · Belum dicatat {{ materialQuantities(request).remaining }}</p><label class="form-field">Jumlah {{ target.disposition==='used'?'dipakai':'dikembalikan' }}<input v-model.number="quantity" name="request-quantity" type="number" inputmode="numeric" min="1" :max="materialQuantities(request).remaining" step="1" required :disabled="saving||stale" /></label><label class="form-field">Nama pelaksana<input v-model="actor" name="material-actor" required minlength="2" maxlength="80" :disabled="saving||stale" placeholder="Nama yang mencatat pemakaian / pengembalian" /></label><label v-if="target.disposition==='used'" class="form-field">Nomor seri / lot <small>Opsional</small><input v-model="serialLot" name="material-serial" maxlength="100" :disabled="saving||stale" placeholder="Nomor seri atau lot jika tersedia" /></label></template>
    <p v-if="selectedPart" class="material-stock-context">{{ selectedPart.partNumber }} · {{ selectedPart.location }}<br />Fisik {{ selectedPart.quantity }} · Alokasi {{ selectedPart.reserved }} · Tersedia {{ availableStock(selectedPart) }} {{ selectedPart.unit }}</p>
    <p class="field-help">{{ target.disposition?(target.disposition==='used'?'Pemakaian mencatat part pada pekerjaan. Stok sudah berkurang saat penyerahan.':'Pengembalian hanya untuk jumlah yang belum dicatat dipakai. Stok fisik bertambah sesuai jumlah yang dikembalikan.'):!target.requestId?'Permintaan muncul di tab Sparepart. Stok dialokasikan setelah disiapkan.':target.status==='ready'?'Menyiapkan part menambah alokasi untuk pekerjaan ini.':target.status==='issued'?'Penyerahan mengurangi stok fisik dan melepaskan alokasi. Pekerjaan kemudian dapat dilanjutkan.':'Pembatalan melepaskan alokasi jika part sudah disiapkan.' }}</p>
    <label class="form-field">{{ target.requestId?'Catatan tindakan':'Alasan kebutuhan' }}<textarea v-model="note" name="request-note" rows="3" required minlength="5" maxlength="1000" :disabled="saving||stale" :placeholder="target.requestId?'Catat penyiapan, penyerahan, atau alasan pembatalan.':'Misalnya: penggantian ban untuk menindaklanjuti temuan ini.'" /><small class="field-help">Minimal 5 karakter · masuk ke riwayat pekerjaan.</small></label>
    <div v-if="stale" class="form-error" role="alert">Pekerjaan telah berubah. Periksa permintaan terbaru sebelum menyimpan.<button type="button" class="text-button" @click="baseline=finding.revision;error=''">Gunakan data terbaru</button></div>
    <p v-if="error" class="form-error" role="alert"><PhWarningCircle :size="17" />{{ error }}</p>
    <div v-if="discard" class="discard-confirm" role="alert"><strong>Buang draf permintaan?</strong><p>Data yang sudah tersimpan tetap tersedia.</p><div><button type="button" class="button subtle" @click="discard=false">Kembali mengisi</button><button type="button" class="button danger" @click="close">Buang draf</button></div></div>
   </div>
   <footer class="dialog-footer"><span>Stok simulasi · Browser ini</span><div><button type="button" class="button" :disabled="saving" @click="requestClose">Batal</button><button type="submit" class="button primary" :disabled="saving||stale||discard||!materialEditingAllowed(finding)">{{ saving?'Menyimpan…':target.requestId?'Simpan tindakan':'Ajukan permintaan' }}</button></div></footer>
  </form>
 </dialog>
</template>
