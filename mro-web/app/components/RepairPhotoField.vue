<script setup lang="ts">
import {PhPlus,PhX} from '@phosphor-icons/vue'
import type { FindingPhoto } from '../types/findings'
import {prepareFindingPhoto} from '../utils/findingPhotos'
const props=defineProps<{modelValue:FindingPhoto[];stage:'before'|'after';disabled:boolean}>()
const emit=defineEmits<{'update:modelValue':[photos:FindingPhoto[]];processing:[busy:boolean]}>()
const processing=ref(false),error=ref('')
let run=0
async function upload(event:Event){
  const input=event.target as HTMLInputElement,files=[...(input.files??[])];input.value=''
  if(!files.length)return
  if(props.modelValue.length+files.length>3){error.value='Maksimal 3 foto per tahap.';return}
  const token=++run;processing.value=true;emit('processing',true);error.value=''
  try{const added=await Promise.all(files.map(prepareFindingPhoto));if(token===run)emit('update:modelValue',[...props.modelValue,...added])}
  catch(cause){if(token===run)error.value=cause instanceof Error?cause.message:'Foto belum dapat diproses.'}
  finally{if(token===run){processing.value=false;emit('processing',false)}}
}
onBeforeUnmount(()=>{run++})
</script>
<template>
 <fieldset class="repair-photo-field" :data-stage="stage"><legend>Foto {{ stage==='before'?'sebelum':'sesudah' }} <span>1–3 foto</span></legend><p>JPG, PNG, atau WebP · maksimal 4 MB per foto. Foto temuan awal dapat digunakan sebagai bukti sebelum pengerjaan.</p><div class="repair-photo-grid"><figure v-for="photo in modelValue" :key="photo.id"><FindingPhoto :photo="photo" /><figcaption>{{ photo.name }}</figcaption><button type="button" class="icon-button" :aria-label="`Hapus foto ${stage==='before'?'sebelum':'sesudah'} ${photo.name}`" :disabled="disabled||processing" @click="emit('update:modelValue',modelValue.filter(p=>p.id!==photo.id))"><PhX :size="16" /></button></figure><label v-if="modelValue.length<3" class="repair-photo-upload"><PhPlus :size="21" /><span>{{ processing?'Memproses…':'Tambah foto' }}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple :aria-label="stage==='before'?'Foto sebelum pengerjaan':'Foto sesudah pengerjaan'" :disabled="disabled||processing" @change="upload" /></label></div><p v-if="error" class="form-error" role="alert">{{ error }}</p></fieldset>
</template>
