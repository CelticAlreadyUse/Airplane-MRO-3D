<script setup lang="ts">
import { PhCaretDown,PhPalette } from '@phosphor-icons/vue'
import { severityOrder } from '../types/severity'
defineProps<{activeCount:number;unassessed:number}>()
</script>
<template>
 <details class="finding-legend severity-legend"><summary><PhPalette :size="16" /><span>{{ activeCount }} temuan aktif · Warna kekritisan</span><PhCaretDown :size="13" /></summary><div class="severity-legend-content"><strong>Legenda tingkat kritis</strong><div v-for="severity in severityOrder" :key="severity"><SeverityBadge :severity="severity" /></div><p>Warna komponen mengikuti tingkat tertinggi yang sudah dinilai dari temuan aktifnya. Penilaian diisi pengguna.</p><p v-if="unassessed">{{ unassessed }} temuan aktif belum dinilai. Catatan lama tidak diberi tingkat kerusakan secara otomatis.</p></div></details>
</template>
