<script setup lang="ts">
import type { FindingPhoto } from '../types/findings'
const props=defineProps<{photo:FindingPhoto;large?:boolean}>()
const url=ref('')
watch(()=>props.photo.blob,blob=>{
  if (url.value) URL.revokeObjectURL(url.value)
  url.value=URL.createObjectURL(blob)
},{immediate:true})
onBeforeUnmount(()=>{ if (url.value) URL.revokeObjectURL(url.value) })
</script>
<template><img :src="url" :alt="`Foto temuan: ${photo.name}`" :class="{ 'large-finding-photo':large }" /></template>
