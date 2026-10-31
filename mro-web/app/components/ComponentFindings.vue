<script setup lang="ts">
import { PhClipboardText,PhCaretRight,PhArrowClockwise } from '@phosphor-icons/vue'
import { getFindingSeverity } from '../types/severity'
import { findingStatuses,type Finding } from '../types/findings'
defineProps<{findings:Finding[];storageReady:boolean;storageError:string}>()
defineEmits<{open:[id:string];reload:[]}>()
</script>
<template>
  <section class="detail-section component-findings" aria-label="Catatan komponen">
    <h3>Catatan perawatan <span class="count-badge">{{ storageReady ? findings.length : '—' }}</span></h3>
    <p v-if="storageError" class="form-error" role="alert">{{ storageError }}<button class="text-button" @click="$emit('reload')"><PhArrowClockwise :size="14" /> Coba muat lagi</button></p>
    <p v-else-if="!storageReady" class="storage-loading" role="status">Membuka catatan lokal…</p>
    <template v-else>
      <div v-if="!findings.length" class="maintenance-empty"><PhClipboardText :size="24" /><strong>Belum ada temuan</strong><p>Tambahkan hasil pengamatan dan foto pada komponen ini.</p></div>
      <div v-else class="component-finding-list"><button v-for="finding in findings" :key="finding.id" class="finding-row" :aria-label="`Buka temuan ${finding.title}`" :data-finding-id="finding.id" @click="$emit('open',finding.id)"><div><span class="finding-status" :class="finding.status">{{ findingStatuses[finding.status] }}</span><SeverityBadge :severity="getFindingSeverity(finding)" /><strong>{{ finding.title }}</strong><small>{{ finding.photos.length ? `${finding.photos.length} foto · ` : '' }}{{ finding.priority==='high' ? 'Prioritas tinggi' : 'Prioritas normal' }}</small></div><PhCaretRight :size="15" /></button></div>
      <p class="local-storage-note">Tersimpan di browser ini · Data demo</p>
    </template>
  </section>
</template>
