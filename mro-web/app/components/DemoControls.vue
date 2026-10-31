<script setup lang="ts">
import { PhPlay,PhArrowCounterClockwise,PhX,PhCheck,PhPresentationChart } from '@phosphor-icons/vue'
const props=defineProps<{ready:boolean;active:boolean;busy:boolean;prepare:()=>Promise<void>;leave:()=>Promise<void>}>()
const dialog=useTemplateRef<HTMLDialogElement>('dialog')
const error=ref('')
defineExpose({open})
function open(){error.value='';dialog.value?.showModal()}
function close(){if(!props.busy)dialog.value?.close()}
async function prepare(){error.value='';try{await props.prepare();dialog.value?.close()}catch(cause){error.value=cause instanceof Error?cause.message:'Demo belum dapat disiapkan.'}}
async function leave(){error.value='';try{await props.leave();dialog.value?.close()}catch(cause){error.value=cause instanceof Error?cause.message:'Catatan latihan belum dapat dimuat.'}}
</script>
<template>
  <button class="button demo-launch" :disabled="!ready || busy" @click="open"><PhArrowCounterClockwise v-if="active" :size="16" /><PhPlay v-else :size="16" weight="fill" />{{ active?'Ulangi demo':'Demo terarah' }}</button>
  <dialog ref="dialog" class="finding-dialog demo-dialog" aria-labelledby="demo-title" @cancel.prevent="close">
    <header class="dialog-header"><div><p>Presentasi MRO Visual</p><h2 id="demo-title">{{ active?'Mulai ulang skenario?':'Siapkan demo dalam satu langkah' }}</h2></div><button class="icon-button" aria-label="Tutup pengaturan demo" :disabled="busy" @click="close"><PhX :size="20" /></button></header>
    <div class="dialog-body"><div class="demo-intro-symbol"><PhPresentationChart :size="28" /></div><p class="demo-explanation">{{ active?'Temuan, permintaan sparepart, dan perubahan stok dalam mode presentasi ini akan dikembalikan ke kondisi awal. Catatan latihan tetap tersimpan.':'Mulai dengan tiga temuan contoh, ilustrasi komponen, dan panduan enam langkah dari komponen sampai laporan PDF. Skenario presentasi sebelumnya akan diganti.' }}</p><ul class="demo-inclusions"><li><PhCheck :size="16" /> Roda kiri: temuan terbuka</li><li><PhCheck :size="16" /> Pintu depan kiri: sedang ditindaklanjuti</li><li><PhCheck :size="16" /> Propeller: contoh catatan ditutup</li></ul><div class="demo-preservation"><strong>Catatan latihan tetap tersimpan.</strong><p>Mode presentasi menggunakan ruang terpisah. Lo bisa kembali ke catatan latihan kapan saja.</p></div><p v-if="error" class="form-error" role="alert">{{ error }}</p></div>
    <footer class="dialog-footer"><button v-if="active" class="button" :disabled="busy" @click="leave">Kembali ke latihan</button><button v-else class="button" :disabled="busy" @click="close">Batal</button><button class="button primary" :disabled="busy" @click="prepare">{{ busy?'Menyiapkan…':active?'Mulai ulang demo':'Mulai presentasi' }}</button></footer>
  </dialog>
</template>
