<script setup lang="ts">
import {
  PhSquaresFour, PhAirplaneTilt, PhMagnifyingGlass, PhCaretRight, PhCube,
  PhCrosshair, PhEye, PhEyeSlash, PhArrowCounterClockwise, PhArrowsOut,
  PhTreeStructure, PhInfo, PhX, PhCheck, PhWarningCircle, PhStack,
  PhCursorClick, PhMouse, PhList, PhClipboardText, PhPlus, PhMoon, PhSun, PhBookOpen, PhBriefcase, PhPackage, PhCalendarCheck, PhPath,
} from '@phosphor-icons/vue'
import { groupOrder, quickParts, type AircraftComponent } from './data/components'
import type { CameraView, ViewerApi, ViewerMetrics, ViewerReady } from './types/viewer'
import type { RepairDialogTarget } from './types/repairWork'
import type { MaterialDialogTarget } from './types/materialRequests'
import type { FindingDraft } from './types/findings'
import { getComponentManual, type ComponentManualCitation } from './data/componentManuals'
import type { ManualPageRequest } from './types/manualNavigation'
import type { WorkspaceTab,WorkspaceNavigation,WorkspaceDestination } from './types/workspace'
import { aircraftOptions } from './data/operations'
import { summarizeActiveSeverities,severitySummaryLabel } from './types/severity'
import { hasUnsettledMaterials } from './utils/materialRequests'
import { DEMO_AIRCRAFT_ID } from './types/findings'

const { dark, toggle: toggleTheme } = useColorTheme()
const workspaceTab = ref<WorkspaceTab>('dashboard')
const activeAircraftId=ref(DEMO_AIRCRAFT_ID)
const operationsVisited=ref(true)
const workspaceTabs=[{id:'dashboard',label:'Ringkasan',icon:PhSquaresFour},{id:'aircraft',label:'Model 3D',icon:PhCube},{id:'manuals',label:'Manual pesawat',icon:PhBookOpen},{id:'work',label:'Pekerjaan',icon:PhBriefcase},{id:'inventory',label:'Sparepart',icon:PhPackage},{id:'flights',label:'Penerbangan',icon:PhPath},{id:'maintenance',label:'Jadwal maintenance',icon:PhCalendarCheck}] as const
const isOperations=computed(()=>!['aircraft','manuals'].includes(workspaceTab.value))
function moveWorkspace(current:WorkspaceTab,delta:number){
  const index=workspaceTabs.findIndex(tab=>tab.id===current)
  changeWorkspace(workspaceTabs[(index+delta+workspaceTabs.length)%workspaceTabs.length]!.id,true)
}
const manualsVisited = ref(false)
const manualRequest = shallowRef<ManualPageRequest|null>(null)
let manualRequestId = 0
function openComponentManual(citation:ComponentManualCitation) {
  const component=selected.value
  if (!component || !getComponentManual(component.sourceName)?.citations.includes(citation)) return
  manualRequest.value={...citation,requestId:++manualRequestId,assetId:component.id,componentLabel:component.label}
  changeWorkspace('manuals')
  announcement.value=`Membuka ${citation.section}, halaman PDF ${citation.pdfPage}, untuk ${component.label}.`
}
function returnFromManual(assetId:string) {
  if (!components.value.some(component=>component.id===assetId)) return
  changeWorkspace('aircraft');select(assetId)
  nextTick(()=>document.getElementById('component-manual-title')?.focus({preventScroll:false}))
}
function changeWorkspace(tab:WorkspaceTab, focusTab = false) {
  if (tab === 'manuals') manualsVisited.value = true
  if (!['aircraft','manuals'].includes(tab)) operationsVisited.value=true
  workspaceTab.value = tab
  panelOpen.value = false
  nextTick(()=>{
    const button=document.getElementById(`workspace-tab-${tab}`),nav=button?.parentElement
    if(focusTab)button?.focus({preventScroll:true})
    if(button&&nav){const b=button.getBoundingClientRect(),n=nav.getBoundingClientRect();if(b.right>n.right)nav.scrollLeft+=b.right-n.right+14;else if(b.left<n.left)nav.scrollLeft-=n.left-b.left+14}
  })
}

const {findings,storageReady,storageError,reload:createReload,create,changeStatus,changeMaterial,changeRepair,restoreBackup,scenarioActive,changingSpace,prepareDemo,returnToPractice}=useFindings()
const workspaceNavigation=shallowRef<WorkspaceNavigation|null>(null)
let navigationId=0
function navigate(destination:WorkspaceDestination){workspaceNavigation.value={...destination,id:++navigationId};changeWorkspace(destination.tab)}
const demoControls=useTemplateRef<{open:()=>void}>('demoControls')
const guideSession=ref(0)
const guidedFindingId=ref('scenario-roueG')
const guidedFinding=computed(()=>findings.value.find(f=>f.id===guidedFindingId.value))
const reportExports=ref<Record<string,number>>({})
function reportExported(report:{findingId:string;revision:number;space:'practice'|'scenario'}){if(scenarioActive.value&&report.space==='scenario')reportExports.value={...reportExports.value,[report.findingId]:report.revision}}
function newGuidedFinding(){const part=components.value.find(c=>c.id===guidedFinding.value?.assetId)??components.value.find(c=>c.sourceName==='roueG');if(part){changeWorkspace('aircraft');select(part.id);creatingFor.value=part}}
function runGuide(kind:string){
  const finding=guidedFinding.value
  if(!finding)return
  if(kind==='locate')locateFinding(finding.assetId)
  else if(kind==='finding'||kind==='report')showFinding(finding.id)
  else if(kind==='material'){
    if((finding.materialRequests??[]).some(r=>r.status!=='cancelled'))navigate({tab:'inventory',requests:'all',findingId:finding.id})
    else materialTarget.value={findingId:finding.id}
  }else if(kind==='repair'){
    if(hasUnsettledMaterials(finding))navigate({tab:'inventory',requests:'all',findingId:finding.id})
    else if(finding.status==='open')showFinding(finding.id)
    else if(['in_progress','rework'].includes(finding.status))repairTarget.value={findingId:finding.id,mode:'record'}
    else showFinding(finding.id)
  }else if(kind==='review'){
    if(finding.status==='awaiting_review')repairTarget.value={findingId:finding.id,mode:'review'}
    else showFinding(finding.id)
  }
}
const creatingFor=shallowRef<AircraftComponent|null>(null)
const openedFindingId=ref<string|null>(null)
const materialTarget=shallowRef<MaterialDialogTarget|null>(null)
const repairTarget=shallowRef<RepairDialogTarget|null>(null)
const backupOpen=ref(false),backupVisited=ref(false)
function showBackup(){backupVisited.value=true;backupOpen.value=true}
watch(scenarioActive,()=>{materialTarget.value=null;repairTarget.value=null;openedFindingId.value=null;reportExports.value={};guidedFindingId.value='scenario-roueG';workspaceNavigation.value=null})
const overviewOpen=ref(false)
const openedFinding=computed(()=>findings.value.find(f=>f.id===openedFindingId.value)??null)
const selectedFindings=computed(()=>findings.value.filter(f=>f.assetId===selectedId.value))
const activeFindingCounts=computed(()=>{
  const counts=new Map<string,number>()
  for(const finding of findings.value) if(finding.status!=='closed') counts.set(finding.assetId,(counts.get(finding.assetId)??0)+1)
  return counts
})
const activeSeverities=computed(()=>summarizeActiveSeverities(findings.value))
const findingSeverityMap=computed(()=>Object.fromEntries([...activeSeverities.value].map(([id,summary])=>[id,summary.severity])))
const selectedSeverity=computed(()=>selectedId.value?activeSeverities.value.get(selectedId.value):undefined)
const unassessedCount=computed(()=>[...activeSeverities.value.values()].reduce((sum,item)=>sum+item.unassessed,0))
const findingAssetIds=computed(()=>[...activeFindingCounts.value.keys()])
const activeFindingTotal=computed(()=>findings.value.filter(f=>f.status!=='closed').length)

const viewer = ref<ViewerApi>()
const components = shallowRef<AircraftComponent[]>([])
const selectedId = ref<string | null>(null)
const query = ref('')
const isolated = ref(false)
const transparent = ref(false)
const ready = ref(false)
const loadError = ref('')
const panelOpen = ref(false)
const detailTab = ref<'component' | 'model'>('component')
const activeView = ref<CameraView>('perspective')
const metrics = ref<ViewerMetrics>({ meshCount:0,triangles:0,loadMs:0,fps:0,visibleCount:0,fileBytes:0 })
const announcement = ref('')
const selected = computed(()=>components.value.find(c=>c.id===selectedId.value))
const searchResults = computed(()=>{
  const q = query.value.trim().toLocaleLowerCase('id')
  return components.value.filter(component=>{
    const manual=getComponentManual(component.sourceName)
    return !q || `${component.label} ${component.sourceName} ${component.group} ${manual?.title??''} ${manual?.summary??''}`.toLocaleLowerCase('id').includes(q)
  })
})
const groups = computed(()=>groupOrder.map(group=>{
  const items=searchResults.value.filter(c=>c.group===group)
  const assemblies=new Map<string,AircraftComponent[]>()
  for(const part of items){
    const name=part.assembly??''
    if(!assemblies.has(name)) assemblies.set(name,[])
    assemblies.get(name)!.push(part)
  }
  return {name:group,items,assemblies:[...assemblies].map(([name,items])=>({name,items}))}
}).filter(g=>g.items.length))
const manualLinkedCount=computed(()=>components.value.filter(component=>!!getComponentManual(component.sourceName)).length)
const classifiedCount=computed(()=>components.value.filter(component=>component.mapping==='visual').length)
const shortcuts = computed(()=>quickParts.map(name=>components.value.find(c=>c.sourceName===name)).filter((c): c is AircraftComponent=>!!c))
const views: {id:CameraView;label:string}[] = [
  {id:'perspective',label:'Perspektif'},{id:'left',label:'Kiri'},{id:'right',label:'Kanan'},
  {id:'top',label:'Atas'},{id:'front',label:'Depan'},
]

function onReady(payload: ViewerReady) {
  components.value = payload.components
  metrics.value = payload.metrics
  ready.value = true
  loadError.value = ''
  announcement.value = 'Model Caravan siap. Pilih komponen dari daftar atau model.'
}
function select(id:string) {
  const wasPanelOpen = panelOpen.value
  selectedId.value = id
  detailTab.value = 'component'
  panelOpen.value = false
  announcement.value = `${selected.value?.label ?? 'Komponen'} dipilih.`
  if (wasPanelOpen) nextTick(()=>document.querySelector<HTMLCanvasElement>('canvas')?.focus({preventScroll:true}))
}
function reset() {
  isolated.value = false; transparent.value = false; selectedId.value = null
  activeView.value = 'perspective'
  viewer.value?.reset()
  announcement.value = 'Seluruh pesawat ditampilkan kembali.'
}
function focus() { viewer.value?.focus(); announcement.value = `Kamera difokuskan ke ${selected.value?.label}.` }
function toggleIsolate() {
  isolated.value = !isolated.value
  if (isolated.value) nextTick(()=>viewer.value?.focus())
  announcement.value = isolated.value ? 'Hanya komponen terpilih ditampilkan.' : 'Seluruh komponen ditampilkan.'
}
function changeView(view:CameraView) { activeView.value=view; viewer.value?.setView(view) }
async function startDemo(){await prepareDemo(components.value);guideSession.value++;reportExports.value={};guidedFindingId.value='scenario-roueG';workspaceNavigation.value=null;reset();changeWorkspace('dashboard')}
async function leaveDemo(){await returnToPractice();reset();changeWorkspace('dashboard')}
async function saveFinding(component:AircraftComponent,draft:FindingDraft) {const record=await create(component,draft);if(scenarioActive.value)guidedFindingId.value=record.id;return record}
function showFinding(id:string) {openedFindingId.value=id}
function locateFinding(assetId:string) {changeWorkspace('aircraft');select(assetId);nextTick(()=>viewer.value?.focus())}
function locateSource(sourceName:string){const part=components.value.find(component=>component.sourceName===sourceName);if(part)locateFinding(part.id)}
function clearSelection() { selectedId.value=null; isolated.value=false; transparent.value=false }
function moveTab(tab: 'component' | 'model') {
  detailTab.value = tab
  nextTick(()=>document.getElementById(`tab-${tab}`)?.focus())
}
watch([selectedId,()=>query.value.trim()===''],()=>nextTick(()=>{
  const detail=document.getElementById('panel-component')
  if(detail) detail.scrollTop=0
  const tree = document.querySelector<HTMLElement>('.component-tree')
  const active = tree?.querySelector<HTMLElement>('.component-item.selected')
  for(let ancestor=active?.parentElement;ancestor && ancestor!==tree;ancestor=ancestor.parentElement){
    if(ancestor instanceof HTMLDetailsElement) ancestor.open=true
  }
  if (!tree || !active || !tree.getClientRects().length) return
  const outer = tree.getBoundingClientRect(), inner = active.getBoundingClientRect()
  if (inner.top < outer.top) tree.scrollTop -= outer.top-inner.top+12
  else if (inner.bottom > outer.bottom) tree.scrollTop += inner.bottom-outer.bottom+12
}))
</script>

<template>
  <div class="workspace" @keydown.esc="panelOpen=false">
    <a class="skip-link" href="#workspace-main">Lewati ke viewer</a>
    <header class="app-header">
      <a class="brand" href="/" aria-label="Mantiq, halaman utama"><BrandLogo /></a>
      <span class="header-separator" />
      <div class="workspace-label">Aircraft maintenance</div>
      <div class="header-right"><span class="local-badge"><span /> {{ scenarioActive?'Mode presentasi':'Latihan lokal' }}</span><button class="theme-toggle icon-button" :aria-label="dark?'Aktifkan mode terang':'Aktifkan mode gelap'" :title="dark?'Mode terang':'Mode gelap'" :aria-pressed="dark" @click="toggleTheme"><PhSun v-if="dark" :size="20" /><PhMoon v-else :size="20" /></button><DemoControls ref="demoControls" :ready="ready" :active="scenarioActive" :busy="changingSpace" :prepare="startDemo" :leave="leaveDemo" /><span class="avatar" aria-label="Mode demonstrasi">D</span></div>
    </header>

    <div class="aircraft-bar">
      <div class="aircraft-identity"><span class="aircraft-icon"><PhAirplaneTilt :size="25" /></span><div><h1>Cessna 208 Caravan <span class="demo-tag">Demo</span></h1><p>Wheels version <span>·</span> Eksplorasi visual pesawat</p></div></div>
      <div class="bar-actions"><label class="aircraft-picker"><span>Pesawat aktif</span><select v-model="activeAircraftId" aria-label="Pilihan pesawat"><option v-for="aircraft in aircraftOptions" :key="aircraft.id" :value="aircraft.id">{{ aircraft.label }}</option></select></label><button v-show="workspaceTab==='aircraft'" class="button subtle mobile-tree-toggle" :aria-expanded="panelOpen" aria-controls="component-panel" @click="panelOpen=!panelOpen"><PhList :size="18" /> Komponen</button><button class="button findings-overview-button" @click="overviewOpen=true"><PhClipboardText :size="18" /> Temuan <span>{{ storageReady ? findings.length : '—' }}</span></button></div>
    </div>

    <nav class="workspace-tabs" role="tablist" aria-label="Ruang kerja pesawat"><button v-for="tab in workspaceTabs" :id="`workspace-tab-${tab.id}`" :key="tab.id" role="tab" :aria-controls="tab.id==='aircraft'?'workspace-aircraft':tab.id==='manuals'?'workspace-manuals':'workspace-operations'" :aria-selected="workspaceTab===tab.id" :tabindex="workspaceTab===tab.id?0:-1" @click="changeWorkspace(tab.id)" @keydown.right.prevent="moveWorkspace(tab.id,1)" @keydown.left.prevent="moveWorkspace(tab.id,-1)" @keydown.home.prevent="changeWorkspace('dashboard',true)" @keydown.end.prevent="changeWorkspace('maintenance',true)"><component :is="tab.icon" :size="18" />{{ tab.label }}<span v-if="tab.id==='manuals' || tab.id==='work'" class="tab-count">{{ tab.id==='manuals'?2:storageReady?findings.length:'—' }}</span></button></nav>
    <DemoWalkthrough v-if="scenarioActive" :key="guideSession" :findings="findings" :finding-id="guidedFindingId" :selected-id="selectedId" :exported-revision="reportExports[guidedFindingId]" :ready="storageReady" :viewer-ready="ready" :busy="changingSpace" @target="guidedFindingId=$event" @run="runGuide" @create="newGuidedFinding" />
    <main id="workspace-main" class="workspace-content">
    <div v-show="workspaceTab==='aircraft'" id="workspace-aircraft" role="tabpanel" aria-labelledby="workspace-tab-aircraft" class="main-grid">
      <aside id="component-panel" class="component-panel" :class="{'panel-open':panelOpen}" aria-label="Daftar komponen">
        <div class="panel-title"><h2><PhTreeStructure :size="18" /> Struktur pesawat</h2><button class="icon-button close-panel" aria-label="Tutup daftar komponen" @click="panelOpen=false"><PhX :size="18" /></button></div>
        <div class="search-wrap"><PhMagnifyingGlass :size="17" /><input v-model="query" aria-label="Cari komponen atau nama objek" placeholder="Cari komponen…" /><button v-if="query" class="search-clear" aria-label="Hapus pencarian" @click="query=''"><PhX :size="14" /></button></div>
        <div class="tree-summary"><span>{{ query ? `${searchResults.length} hasil pencarian` : 'Komponen model' }}</span><span>{{ ready ? components.length : '—' }}</span></div>
        <div v-if="ready" class="tree-classification-summary"><p class="tree-manual-summary"><PhBookOpen :size="14" />{{ manualLinkedCount }} objek punya rujukan POH</p><p>{{ classifiedCount }} terpilah · {{ components.length-classifiedCount }} perlu verifikasi</p><small>Beberapa objek berbagi satu instrumen.</small></div>
        <nav class="component-tree" aria-label="Struktur komponen pesawat">
          <div v-if="!ready && !loadError" class="tree-placeholder">Daftar tersedia setelah model terbuka.</div>
          <div v-if="loadError" class="tree-placeholder">Model belum berhasil dimuat. Gunakan tombol coba lagi di viewer.</div>
          <div v-if="ready && !groups.length" class="empty-search"><PhMagnifyingGlass :size="25" /><strong>Komponen tidak ditemukan</strong><p>Coba “roda”, “pintu”, atau nama objek sumber.</p><button class="text-button" @click="query=''">Hapus pencarian</button></div>
          <details v-for="group in groups" :key="`${query}-${group.name}`" :open="!['Perlu verifikasi','Belum teridentifikasi'].includes(group.name) || !!query || selected?.group===group.name" class="tree-group">
            <summary><PhCaretRight :size="12" class="group-caret" /><PhStack :size="16" /><span>{{ group.name }}</span><small>{{ group.items.length }}</small></summary>
            <component :is="assembly.name?'details':'div'" v-for="assembly in group.assemblies" :key="assembly.name" :class="{'tree-assembly':!!assembly.name}" :open="assembly.name && (!!query || selected?.assembly===assembly.name) ? true : undefined" :data-assembly="assembly.name||undefined">
              <summary v-if="assembly.name"><PhCaretRight :size="12" class="group-caret" /><span>{{ assembly.name }}</span><small>{{ assembly.items.length }} objek</small></summary>
              <div class="tree-children"><button v-for="part in assembly.items" :key="part.id" class="component-item" :class="{selected:part.id===selectedId}" :aria-pressed="part.id===selectedId" :data-source="part.sourceName" :title="`${part.label} · ${part.sourceName}`" @click="select(part.id)"><span class="tree-connector" /><span class="component-label">{{ part.detailLabel??part.label }}</span><span v-if="getComponentManual(part.sourceName)" class="tree-manual-indicator" title="Rujukan POH tersedia; cakupan dijelaskan di panel detail"><PhBookOpen :size="13" /><span class="sr-only">Referensi manual tersedia</span></span><span v-if="activeFindingCounts.get(part.id)" class="finding-count" :class="`severity-${activeSeverities.get(part.id)?.severity??'unassessed'}`" :aria-label="severitySummaryLabel(activeSeverities.get(part.id)!)" :title="severitySummaryLabel(activeSeverities.get(part.id)!)">{{ activeFindingCounts.get(part.id) }}</span><PhCrosshair v-if="part.id===selectedId" :size="15" /><span v-else-if="!activeFindingCounts.get(part.id) && !getComponentManual(part.sourceName)" class="part-indicator" /></button></div>
            </component>
          </details>
        </nav>
        <div class="source-note"><PhInfo :size="16" /><span>Kelompok mengikuti objek visual. Nomor part dan konfigurasi pesawat belum divalidasi.</span></div>
      </aside>

      <section class="viewer-panel" aria-label="Eksplorasi pesawat 3D">
        <div class="viewport-top"><div class="breadcrumbs"><button @click="reset">Pesawat</button><template v-if="selected"><PhCaretRight :size="12" /><span>{{ selected.group }}</span><PhCaretRight :size="12" /><strong>{{ selected.label }}</strong></template><span v-else class="breadcrumb-hint">/ Model keseluruhan</span></div><span class="model-ready" :class="{loaded:ready}"><span />{{ ready ? 'Model siap' : loadError ? 'Gagal dimuat' : 'Memuat model' }}</span></div>
        <div class="viewer-body">
          <ClientOnly><AircraftViewer ref="viewer" :dark="dark" :active="workspaceTab==='aircraft'" :selected-id="selectedId" :isolated="isolated" :transparent="transparent" :finding-asset-ids="findingAssetIds" :finding-severities="findingSeverityMap" @ready="onReady" @select="select" @metrics="metrics=$event" @error="loadError=$event;ready=false" /><template #fallback><div class="viewer-state"><span class="loader" /><strong>Menyiapkan ruang kerja…</strong></div></template></ClientOnly>
          <div class="orientation-control" aria-label="Sudut pandang"><button v-for="view in views" :key="view.id" :class="{active:activeView===view.id}" :aria-pressed="activeView===view.id" :disabled="!ready" @click="changeView(view.id)">{{ view.label }}</button></div>
          <div v-if="ready && !selected" class="viewport-intro"><span class="intro-line" /><PhCursorClick :size="16" /><span>Pilih bagian pesawat untuk mulai menjelajah</span></div>
          <div v-if="isolated" class="isolated-banner"><PhEyeSlash :size="15" /> Komponen diisolasi <button @click="toggleIsolate">Tampilkan semua</button></div>
          <SeverityLegend v-if="ready && !isolated" :active-count="activeFindingTotal" :unassessed="unassessedCount" />
          <div class="viewer-toolbar" role="toolbar" aria-label="Kontrol model">
            <button :disabled="!ready || !selected" @click="focus"><PhCrosshair :size="19" /><span>Fokus</span></button>
            <button :disabled="!ready || !selected" :class="{active:isolated}" :aria-pressed="isolated" @click="toggleIsolate"><PhCube :size="19" /><span>Isolasi</span></button>
            <button :disabled="!ready || !selected" :class="{active:transparent}" :aria-pressed="transparent" @click="transparent=!transparent"><PhEye :size="19" /><span>Transparansi</span></button>
            <span class="toolbar-divider" />
            <button :disabled="!ready" @click="reset"><PhArrowCounterClockwise :size="19" /><span>Reset</span></button>
          </div>
          <div class="canvas-help"><PhMouse :size="15" /><span class="pointer-hint">Seret: putar <span>·</span> Gulir: zoom <span>·</span> Klik: pilih</span><span class="touch-hint">Seret: putar <span>·</span> Cubit: zoom <span>·</span> Ketuk: pilih</span></div>
          <div class="canvas-attribution">C208 <span>/</span> MODEL DEMO</div>
        </div>
        <div class="quick-select"><span>Pilih cepat</span><button v-for="part in shortcuts" :key="part.id" :class="{active:part.id===selectedId}" @click="select(part.id)">{{ part.label }}<PhCaretRight :size="12" /></button></div>
      </section>

      <aside class="detail-panel" aria-label="Informasi pilihan">
        <div class="detail-tabs" role="tablist" aria-label="Panel informasi"><button id="tab-component" role="tab" :aria-selected="detailTab==='component'" aria-controls="panel-component" :tabindex="detailTab==='component'?0:-1" @click="detailTab='component'" @keydown.right.prevent="moveTab('model')" @keydown.left.prevent="moveTab('model')">Komponen</button><button id="tab-model" role="tab" :aria-selected="detailTab==='model'" aria-controls="panel-model" :tabindex="detailTab==='model'?0:-1" @click="detailTab='model'" @keydown.left.prevent="moveTab('component')" @keydown.right.prevent="moveTab('component')">Data model</button></div>
        <div v-if="detailTab==='component'" id="panel-component" role="tabpanel" aria-labelledby="tab-component" class="detail-content">
          <template v-if="selected">
            <div class="detail-eyebrow"><PhCube :size="15" /> {{ selected.group }}<button class="icon-button" aria-label="Hapus pilihan komponen" @click="clearSelection"><PhX :size="17" /></button></div>
            <h2 class="selected-title">{{ selected.label }}</h2>
            <span class="mapping-badge"><PhInfo :size="13" /> {{ selected.mapping==='visual' ? 'Pemetaan visual' : 'Belum dipetakan' }}</span>
            <div v-if="selectedSeverity" class="component-severity-summary"><SeverityBadge :severity="selectedSeverity.severity" /><span>{{ selectedSeverity.count }} temuan aktif · tingkat tertinggi yang sudah dinilai</span><small v-if="selectedSeverity.unassessed">{{ selectedSeverity.unassessed }} temuan belum dinilai.</small></div>
            <p class="component-description">{{ selected.description }}</p>
            <div class="component-actions"><button class="button primary add-finding" :disabled="!storageReady || changingSpace" @click="creatingFor=selected??null"><PhPlus :size="17" /> Catat temuan</button><button class="button subtle" :disabled="!ready" aria-label="Fokus ke komponen" @click="focus"><PhCrosshair :size="17" /> Fokus</button></div>
            <ComponentManual :component="selected" @open="openComponentManual" />
            <div class="detail-section"><h3>Identitas objek</h3><dl><div><dt>Nama sumber</dt><dd class="mono">{{ selected.sourceName }}</dd></div><div><dt>ID aset</dt><dd class="mono id-value">{{ selected.id }}</dd></div><div><dt>Unit pesawat</dt><dd>C208 · Demo</dd></div><div><dt>Part / serial number</dt><dd class="muted">Belum dihubungkan</dd></div></dl></div>
            <ComponentFindings :findings="selectedFindings" :storage-ready="storageReady" :storage-error="storageError" @open="showFinding" @reload="createReload" />
            <div class="detail-caution"><PhInfo :size="17" /><p>Model membantu mengenali lokasi. Identitas teknis dan konfigurasi pesawat perlu divalidasi.</p></div>
          </template>
          <div v-else class="selection-empty"><div class="selection-symbol"><PhCursorClick :size="33" weight="light" /></div><h2>Kenali setiap bagian</h2><p>Pilih komponen pada pesawat atau gunakan struktur di sebelah kiri.</p><div class="selection-steps"><div><PhCursorClick :size="17" /><span>Klik untuk melihat identitas</span></div><div><PhCrosshair :size="17" /><span>Fokus untuk melihat lebih dekat</span></div><div><PhCube :size="17" /><span>Isolasi untuk memeriksa satu bagian</span></div></div><button v-if="shortcuts[0]" class="button subtle full-width" @click="select(shortcuts[0].id)">Mulai dari roda kiri <PhCaretRight :size="15" /></button></div>
        </div>
        <div v-else id="panel-model" role="tabpanel" aria-labelledby="tab-model" class="detail-content">
          <div class="detail-eyebrow"><PhAirplaneTilt :size="16" /> Aset pesawat</div><h2 class="selected-title">Caravan, lebih dekat.</h2><p class="component-description">Cessna 208 Caravan, wheels version. Tekstur sumber dipulihkan, termasuk garis merah, interior, dan roda. Tampilan ini mengikuti aset sumber.</p>
          <div class="detail-section"><h3>Hasil pemuatan lokal</h3><dl><div><dt>Objek aset</dt><dd>{{ metrics.meshCount || '—' }}</dd></div><div><dt>Segitiga</dt><dd>{{ metrics.triangles ? metrics.triangles.toLocaleString('id-ID') : '—' }}</dd></div><div><dt>Ukuran berkas</dt><dd>{{ metrics.fileBytes ? `${(metrics.fileBytes/1_000_000).toFixed(2)} MB` : '—' }}</dd></div><div><dt>Muat hingga frame pertama</dt><dd>{{ metrics.loadMs ? `${(metrics.loadMs/1000).toFixed(2)} dtk` : '—' }}</dd></div><div><dt>Frame rate saat ini</dt><dd>{{ ready ? `${metrics.fps} FPS` : '—' }}</dd></div><div><dt>Mesh ditampilkan</dt><dd>{{ ready ? metrics.visibleCount : '—' }}</dd></div></dl></div>
          <div class="detail-caution"><PhWarningCircle :size="18" /><p>Detail internal, skala teknis, dan konfigurasi unit AMA belum divalidasi. Angka pemuatan berlaku untuk sesi ini.</p></div>
          <div class="detail-section source-credit"><h3>Referensi aset</h3><p>Model oleh Emmanuel Baranger (helijah), dari BlendSwap. Dokumen CC0 dan GPL dalam arsip masih perlu diselaraskan sebelum distribusi.</p><a href="https://blendswap.com/blend/8327" target="_blank" rel="noreferrer">Lihat sumber model <PhArrowsOut :size="14" /></a></div>
        </div>
        <div class="detail-footer"><PhCheck :size="14" /> Penyimpanan browser <span>·</span> Demo lokal</div>
      </aside>
    </div>
    <section v-show="workspaceTab==='manuals'" id="workspace-manuals" role="tabpanel" aria-labelledby="workspace-tab-manuals" class="manuals-panel"><LazyManualsWorkspace v-if="manualsVisited" :active="workspaceTab==='manuals'" :navigation="manualRequest" @return-to-component="returnFromManual" /></section>
    <section v-show="isOperations" id="workspace-operations" role="tabpanel" :aria-labelledby="`workspace-tab-${workspaceTab}`" class="operations-panel"><LazyOperationsWorkspace v-if="operationsVisited" :tab="workspaceTab" :navigation="workspaceNavigation" :scenario-active="scenarioActive" @navigate="navigate" @demo="demoControls?.open()" :findings="findings" :storage-ready="storageReady" :storage-error="storageError" :viewer-ready="ready" @open-finding="showFinding" @material-action="materialTarget=$event" @repair="repairTarget=$event" @backup="showBackup" @locate="locateFinding" @locate-source="locateSource" @reload="createReload" @aircraft="changeWorkspace('aircraft')" /></section>
    </main>
    <footer class="status-bar"><span><span class="status-dot" :class="{loaded:ready}" /> {{ ready ? 'Model siap dieksplorasi' : loadError ? 'Periksa pemuatan model' : 'Menyiapkan model' }}</span><span class="status-end">Tekstur dipulihkan <span>·</span> {{ scenarioActive?'Skenario contoh':'Catatan latihan' }} <span class="status-performance" v-if="ready">{{ metrics.meshCount }} objek</span></span></footer>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
    <NewFindingDialog :component="creatingFor" :presentation="scenarioActive" :save="saveFinding" @closed="creatingFor=null" @saved="announcement='Temuan tersimpan di browser ini.'" />
    <LazyBackupDialog v-if="backupVisited" :open="backupOpen" :active-space="scenarioActive?'scenario':'practice'" :restore="restoreBackup" @closed="backupOpen=false" @restored="guideSession++;reportExports={};openedFindingId=null;materialTarget=null;repairTarget=null;announcement='Backup berhasil dipulihkan.'" />
    <RepairWorkDialog :target="repairTarget" :findings="findings" :save="changeRepair" @closed="repairTarget=null" @saved="announcement='Kartu pengerjaan dan pemeriksaan tersimpan.'" />
    <MaterialRequestDialog :target="materialTarget" :findings="findings" :save="changeMaterial" @closed="materialTarget=null" @saved="announcement='Permintaan dan stok sparepart diperbarui.'" />
    <FindingDetailDialog @report-exported="reportExported" :space="scenarioActive?'scenario':'practice'" :finding="openedFinding" :save-status="changeStatus" @repair="repairTarget=$event" @request-material="materialTarget={findingId:$event}" @closed="openedFindingId=null" @saved="announcement='Catatan dan riwayat diperbarui.'" @locate="locateFinding" />
    <FindingsOverview :open="overviewOpen" :findings="findings" :storage-ready="storageReady" :storage-error="storageError" @closed="overviewOpen=false" @select="showFinding" @reload="createReload" />
  </div>
</template>
