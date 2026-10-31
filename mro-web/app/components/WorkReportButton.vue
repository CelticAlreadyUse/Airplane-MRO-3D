<script setup lang="ts">
import {PhFilePdf,PhWarningCircle} from '@phosphor-icons/vue'
import type { FindingsSpace } from '../utils/findingsRepository'
const props=defineProps<{findingId:string;space:FindingsSpace;disabled:boolean}>()
const emit=defineEmits<{busy:[value:boolean];exported:[report:{findingId:string;revision:number;space:FindingsSpace}]}>()
const busy=ref(false),error=ref(''),success=ref('')
watch(()=>props.findingId,()=>{error.value='';success.value=''})
async function exportReport(){
  if(busy.value||props.disabled)return
  busy.value=true;emit('busy',true);error.value='';success.value=''
  const id=props.findingId,space=props.space
  try{
    const [{listFindings},{createWorkReport},{downloadFile},{workOrderCode}]=await Promise.all([import('../utils/findingsRepository'),import('../utils/workReport'),import('../utils/downloadFile'),import('../utils/materialRequests')])
    const record=(await listFindings(space)).find(f=>f.id===id)
    if(!record)throw new Error('Pekerjaan sudah tidak tersedia. Buka data terbaru.')
    const result=await createWorkReport(record,space)
    downloadFile(result.blob,`${workOrderCode(record)}-C208-${new Date().toISOString().slice(0,10)}.pdf`)
    emit('exported',{findingId:id,revision:record.revision,space})
    success.value=`Unduhan PDF ${result.pages} halaman dimulai.`
  }catch(cause){error.value=cause instanceof Error?cause.message:'Laporan belum dapat diunduh.'}finally{busy.value=false;emit('busy',false)}
}
</script>
<template><section class="work-report-export" aria-label="Laporan pekerjaan"><button type="button" class="button subtle export-work-report" :disabled="busy||disabled" @click="exportReport"><PhFilePdf :size="18" />{{ busy?'Menyusun laporan…':'Unduh laporan PDF' }}</button><p>Laporan memuat catatan dan foto yang sudah tersimpan.</p><p v-if="error" class="form-error" role="alert"><PhWarningCircle :size="17" />{{ error }}</p><p v-if="success" class="save-success" role="status">{{ success }}</p></section></template>
