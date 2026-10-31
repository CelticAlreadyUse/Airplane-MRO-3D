<script setup lang="ts">
import {PhPackage,PhArrowRight} from '@phosphor-icons/vue'
import type { Finding } from '../types/findings'
import {inventoryParts} from '../data/operations'
import {materialRequestStatuses} from '../types/materialRequests'
import {hasUnsettledMaterials,materialQuantities,materialEditingAllowed} from '../utils/materialRequests'
defineProps<{finding:Finding;disabled:boolean}>()
defineEmits<{request:[]}>()
const partName=(id:string)=>inventoryParts.find(p=>p.id===id)
</script>
<template>
 <section class="work-material-details" aria-labelledby="work-material-title"><h3 id="work-material-title" class="finding-section-title"><PhPackage :size="17" /> Kebutuhan sparepart</h3>
  <p v-if="!finding.materialRequests?.length" class="field-help">Ajukan material yang dibutuhkan untuk perbaikan. Permintaan diproses melalui tab Sparepart.</p>
  <ul v-else class="work-material-list"><li v-for="request in finding.materialRequests" :key="request.id"><div><strong>{{ partName(request.partId)?.name }} · {{ request.quantity }} {{ partName(request.partId)?.unit }}</strong><span class="material-status" :class="request.status">{{ materialRequestStatuses[request.status] }}</span></div><p>{{ request.note }}</p><p v-if="request.status==='issued'">Dipakai {{ materialQuantities(request).used }} · Dikembalikan {{ materialQuantities(request).returned }} · Belum dicatat {{ materialQuantities(request).remaining }}</p></li></ul>
  <p v-if="hasUnsettledMaterials(finding)" class="material-waiting">Selesaikan permintaan dan catat seluruh jumlah yang dipakai atau dikembalikan sebelum mengajukan hasil pengerjaan.</p>
  <button type="button" class="button subtle" :disabled="disabled||!materialEditingAllowed(finding)" @click="$emit('request')">Request sparepart<PhArrowRight :size="16" /></button>
  <small v-if="!materialEditingAllowed(finding)" class="field-help">Material terkunci saat pekerjaan ditutup atau menunggu pemeriksaan.</small>
 </section>
</template>
