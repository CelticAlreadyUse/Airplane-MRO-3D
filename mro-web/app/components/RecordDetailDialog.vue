<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'
import type { RecordDetails } from '../types/workspace'
const props=defineProps<{record:RecordDetails|null}>()
const emit=defineEmits<{closed:[]}>()
const dialog=useTemplateRef<HTMLDialogElement>('dialog')
watch(()=>props.record,async record=>{if(!record){dialog.value?.close();return}await nextTick();dialog.value?.showModal()})
function close(){dialog.value?.close();emit('closed')}
</script>
<template>
 <dialog ref="dialog" class="finding-dialog record-detail-dialog" aria-labelledby="record-detail-title" @cancel.prevent="close"><div v-if="record" class="record-detail-inner"><header class="dialog-header"><div><p>{{ record.eyebrow }}</p><h2 id="record-detail-title">{{ record.title }}</h2></div><button class="icon-button" aria-label="Tutup detail data" @click="close"><PhX :size="21" /></button></header><div class="dialog-body"><p class="record-detail-description">{{ record.description }}</p><dl class="record-detail-fields"><div v-for="field in record.fields" :key="field.label"><dt>{{ field.label }}</dt><dd>{{ field.value }}</dd></div></dl><p v-if="record.note" class="record-detail-note">{{ record.note }}</p></div><footer class="dialog-footer"><span>Cessna 208 Caravan · Data contoh</span><button class="button" @click="close">Tutup</button></footer></div></dialog>
</template>
