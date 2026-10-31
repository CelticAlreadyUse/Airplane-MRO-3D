<script setup lang="ts">
import { PhBookOpen,PhArrowRight,PhInfo } from '@phosphor-icons/vue'
import type { AircraftComponent } from '../data/components'
import { getComponentManual,type ComponentManualCitation } from '../data/componentManuals'
const props=defineProps<{component:AircraftComponent}>()
defineEmits<{open:[citation:ComponentManualCitation]}>()
const entry=computed(()=>getComponentManual(props.component.sourceName))
</script>
<template>
  <section class="component-manual" :class="{'component-manual-empty':!entry}" aria-labelledby="component-manual-title" :data-reference-source="component.sourceName" :data-coverage="entry ? entry.coverage??'function' : 'unmatched'">
    <div class="component-manual-heading"><PhBookOpen :size="17" /><h3 id="component-manual-title" tabindex="-1">{{ entry?'Dari buku manual':'Referensi manual' }}</h3><span v-if="entry">POH</span></div>
    <template v-if="entry">
      <h4>{{ entry.title }}</h4>
      <p class="manual-coverage">{{ entry.coverage==='location'?'Rujukan lokasi / identifikasi':entry.coverage==='system'?'Rujukan umum sistem / area':'Fungsi dijelaskan di manual' }}</p>
      <p class="component-manual-summary">{{ entry.summary }}</p>
      <p v-if="entry.scope" class="component-manual-scope"><PhInfo :size="14" />{{ entry.scope }}</p>
      <div class="component-manual-citations"><button v-for="citation in entry.citations" :key="citation.pdfPage" class="component-manual-link" :data-pdf-page="citation.pdfPage" :aria-label="`Buka ${citation.section}, halaman buku ${citation.bookPage}, halaman PDF ${citation.pdfPage}`" @click="$emit('open',citation)"><span><strong>{{ citation.section }}</strong><small>Buku {{ citation.bookPage }} <span>·</span> PDF {{ citation.pdfPage }}</small></span><PhArrowRight :size="16" /></button></div>
      <p class="component-manual-credit">Ringkasan bahasa Indonesia · POH C208 Rev. 6 / 2002, arsip pelatihan. Revisi tiap halaman mengikuti PDF.</p>
    </template>
    <p v-else class="component-manual-summary">Komponen ini belum dicocokkan dengan bagian tertentu dalam POH. Fungsi dan identitasnya perlu diperiksa sebelum referensi ditambahkan.</p>
  </section>
</template>
