<script setup lang="ts">
import type { WorkspaceTab,RecordDetails,WorkspaceNavigation,WorkspaceDestination } from '../types/workspace'
import type { Finding } from '../types/findings'
import type { RepairDialogTarget } from '../types/repairWork'
import type { MaterialDialogTarget } from '../types/materialRequests'
defineProps<{tab:WorkspaceTab;findings:Finding[];storageReady:boolean;storageError:string;viewerReady:boolean;scenarioActive:boolean;navigation:WorkspaceNavigation|null}>()
defineEmits<{openFinding:[id:string];materialAction:[target:MaterialDialogTarget];repair:[target:RepairDialogTarget];backup:[];navigate:[destination:WorkspaceDestination];demo:[];locate:[assetId:string];locateSource:[sourceName:string];reload:[];aircraft:[]}>()
const details=shallowRef<RecordDetails|null>(null)
</script>
<template>
 <div class="operations-workspace">
  <AircraftDashboard v-show="tab==='dashboard'" :findings="findings" :storage-ready="storageReady" :storage-error="storageError" :viewer-ready="viewerReady" :scenario-active="scenarioActive" @navigate="$emit('navigate',$event)" @open="$emit('openFinding',$event)" @locate="$emit('locate',$event)" @reload="$emit('reload')" @demo="$emit('demo')" />
  <WorkOrdersPanel :navigation="navigation" v-show="tab==='work'" :findings="findings" :storage-ready="storageReady" :storage-error="storageError" :viewer-ready="viewerReady" @open="$emit('openFinding',$event)" @repair="$emit('repair',$event)" @backup="$emit('backup')" @request=" $emit('materialAction',{findingId:$event})" @locate="$emit('locate',$event)" @reload="$emit('reload')" @aircraft="$emit('aircraft')" />
  <InventoryPanel :navigation="navigation" v-show="tab==='inventory'" :findings="findings" :storage-ready="storageReady" :storage-error="storageError" :viewer-ready="viewerReady" @material-action="$emit('materialAction',$event)" @open-work="$emit('openFinding',$event)" @inspect="details=$event" @locate="$emit('locateSource',$event)" />
  <FlightLogPanel v-show="tab==='flights'" @inspect="details=$event" />
  <MaintenancePanel :navigation="navigation" v-show="tab==='maintenance'" :viewer-ready="viewerReady" @inspect="details=$event" @locate="$emit('locateSource',$event)" />
  <RecordDetailDialog :record="details" @closed="details=null" />
 </div>
</template>
