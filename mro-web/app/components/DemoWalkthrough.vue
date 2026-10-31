<script setup lang="ts">
import {PhCheck,PhCaretDown,PhCaretUp,PhArrowLeft,PhArrowRight,PhPlus} from '@phosphor-icons/vue'
import type { Finding } from '../types/findings'
import { demoGuide } from '../utils/demoGuide'
const props=defineProps<{findings:Finding[];findingId:string;selectedId:string|null;exportedRevision?:number;ready:boolean;viewerReady:boolean;busy:boolean}>()
const emit=defineEmits<{target:[id:string];run:[kind:string];create:[]}>()
const step=ref(0),expanded=ref(true)
const finding=computed(()=>props.findings.find(f=>f.id===props.findingId))
const steps=computed(()=>demoGuide(finding.value,props.selectedId,props.exportedRevision))
const current=computed(()=>steps.value[step.value]!)
const completed=computed(()=>steps.value.filter(s=>s.done).length)
onMounted(()=>{expanded.value=window.innerWidth>1180})
watch(()=>props.findingId,()=>{step.value=1})
</script>
<template>
 <section class="presentation-guide demo-walkthrough" aria-labelledby="guide-title">
  <div class="guide-heading"><div><span class="guide-eyebrow">PRESENTASI TERPANDU · {{ completed }}/6 TERPENUHI</span><h2 id="guide-title">{{ completed===6?'Alur pekerjaan lengkap':'Dari komponen sampai laporan' }}</h2></div><button class="button subtle guide-toggle" :aria-expanded="expanded" aria-controls="guide-body" @click="expanded=!expanded">{{ expanded?'Ringkas':'Buka panduan' }}<PhCaretUp v-if="expanded" :size="17" /><PhCaretDown v-else :size="17" /></button></div>
  <div v-show="expanded" id="guide-body"><div class="guide-track" aria-label="Langkah presentasi"><button v-for="(item,index) in steps" :key="item.kind" :data-guide-step="index" :aria-current="index===step?'step':undefined" :class="{current:index===step,fulfilled:item.done}" @click="step=index"><span><PhCheck v-if="item.done" :size="13" /><template v-else>{{ index+1 }}</template></span>{{ item.title }}<small class="sr-only">{{ item.done?'Terpenuhi':'Belum terpenuhi' }}</small></button></div><div class="guide-body"><div class="guide-current"><strong>{{ step+1 }}. {{ current.title }}</strong><p>{{ current.description }}</p><span class="guide-progress-note">{{ current.done?'Terpenuhi pada catatan / sesi saat ini.':'Progres mengikuti data yang tersimpan; pindah langkah tidak menyelesaikan pekerjaan.' }}</span></div><div class="guide-controls"><label>Pekerjaan panduan<select :value="finding?findingId:''" aria-label="Pekerjaan panduan" :disabled="busy" @change="emit('target',($event.target as HTMLSelectElement).value)"><option disabled value="">Pilih pekerjaan</option><option v-for="record in findings" :key="record.id" :value="record.id">{{ record.title }}</option></select></label><div><button class="button primary guide-action" :disabled="!ready||busy||!current.enabled||(current.kind==='locate'&&!viewerReady)" @click="emit('run',current.kind)">{{ current.action }}<PhArrowRight :size="16" /></button><button v-if="step===1" class="button subtle guide-create" :disabled="!ready||!viewerReady||busy" @click="emit('create')"><PhPlus :size="17" /> Catat baru</button></div></div></div><footer class="guide-footer"><span>Mode presentasi · terpisah dari catatan latihan</span><div><button class="button subtle" aria-label="Langkah demo sebelumnya" :disabled="step===0" @click="step--"><PhArrowLeft :size="16" /> Sebelumnya</button><button class="button subtle" aria-label="Langkah demo berikutnya" :disabled="step===5" @click="step++">Berikutnya<PhArrowRight :size="16" /></button></div></footer></div>
 </section>
</template>
