<script setup lang="ts">
import { findingSeverities,type FindingSeverity } from '../types/severity'
defineProps<{severity:FindingSeverity}>()
</script>
<template><span class="severity-badge" :class="`severity-${severity}`" :data-severity="severity"><span class="severity-dot" aria-hidden="true" />Kekritisan: {{ findingSeverities[severity] }}</span></template>
