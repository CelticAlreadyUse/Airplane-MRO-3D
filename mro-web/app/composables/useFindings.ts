import type { FindingSeverity } from '../types/severity'
import type { AircraftComponent } from '../data/components'
import type { Finding, FindingDraft, FindingStatus } from '../types/findings'
import { buildDemoScenario } from '../data/demoScenario'
import { listFindings,createFinding,changeFindingStatus,changeFindingMaterial,changeFindingRepair,replaceScenarioFindings,type FindingsSpace } from '../utils/findingsRepository'
import type { MaterialCommand } from '../types/materialRequests'
import type { RepairCommand } from '../types/repairWork'

export function useFindings() {
  const findings=shallowRef<Finding[]>([])
  const storageReady=ref(false),storageError=ref(''),changingSpace=ref(false)
  const space=ref<FindingsSpace>('practice')
  const scenarioActive=computed(()=>space.value==='scenario')
  let channel:BroadcastChannel|undefined
  let disposed=false,refreshRun=0
  async function reload() {
    const run=++refreshRun,target=space.value
    try {
      const records=await listFindings(target)
      if(disposed || run!==refreshRun || target!==space.value)return
      findings.value=records;storageError.value='';storageReady.value=true
    } catch(error) {
      if(disposed || run!==refreshRun || target!==space.value)return
      storageReady.value=false
      storageError.value=error instanceof Error?error.message:'Penyimpanan belum dapat dimuat.'
    }
  }
  function rememberSpace(){try{localStorage.setItem('mro-presentation-space',space.value)}catch{/* In-memory mode still works without saved preferences. */}}
  function notify(target:FindingsSpace){try{channel?.postMessage({space:target})}catch{/* The committed local write remains valid. */}}
  function accept(record:Finding,target:FindingsSpace) {
    notify(target)
    if(disposed || target!==space.value)return
    refreshRun++
    findings.value=[record,...findings.value.filter(f=>f.id!==record.id)].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
    storageReady.value=true;storageError.value=''
  }
  async function create(component:AircraftComponent,draft:FindingDraft) {
    const target=space.value,record=await createFinding(component,draft,target)
    accept(record,target);return record
  }
  async function changeStatus(id:string,revision:number,status:FindingStatus,note:string,severity?:FindingSeverity) {
    const target=space.value
    try{const record=await changeFindingStatus(id,revision,status,note,target,severity);accept(record,target);return record}
    catch(error){if(target===space.value)void reload();throw error}
  }
  async function prepareDemo(components:AircraftComponent[]) {
    if(changingSpace.value)throw new Error('Demo sedang disiapkan.')
    changingSpace.value=true
    try {
      const records=await buildDemoScenario(components)
      await replaceScenarioFindings(records)
      if(disposed)return
      refreshRun++;space.value='scenario';findings.value=records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));storageReady.value=true;storageError.value=''
      rememberSpace();notify('scenario')
    } finally{changingSpace.value=false}
  }
  async function changeMaterial(id:string,revision:number,command:MaterialCommand){
    const target=space.value
    try{const record=await changeFindingMaterial(id,revision,command,target);accept(record,target);return record}
    catch(error){if(target===space.value)void reload();throw error}
  }
  async function returnToPractice() {
    if(changingSpace.value)return
    changingSpace.value=true
    try {
      const records=await listFindings('practice')
      if(disposed)return
      refreshRun++;space.value='practice';findings.value=records;storageReady.value=true;storageError.value=''
      rememberSpace()
    } finally{changingSpace.value=false}
  }
  async function changeRepair(id:string,revision:number,command:RepairCommand){
    const target=space.value
    try{const record=await changeFindingRepair(id,revision,command,target);accept(record,target);return record}
    catch(error){if(target===space.value)void reload();throw error}
  }
  async function restoreBackup(file:Blob,token:string){
    if(changingSpace.value)throw new Error('Mode sedang diperbarui. Coba lagi setelah selesai.')
    changingSpace.value=true
    try{
      const {restoreFindingsBackup}=await import('../utils/findingsRepository')
      const restored=await restoreFindingsBackup(file,token)
      if(disposed)return
      refreshRun++;space.value=restored.space;findings.value=restored.records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));storageReady.value=true;storageError.value=''
      rememberSpace();notify(restored.space)
    }finally{changingSpace.value=false}
  }
  function refreshVisible(){if(!document.hidden && !changingSpace.value)void reload()}
  onMounted(()=>{
    try{if(localStorage.getItem('mro-presentation-space')==='scenario')space.value='scenario'}catch{/* Default to practice. */}
    void reload()
    if(typeof BroadcastChannel!=='undefined') {
      try {
        channel=new BroadcastChannel('mro-visual-findings-demo')
        channel.onmessage=event=>{if(event.data?.space===space.value || (event.data==='changed' && space.value==='practice'))void reload()}
      } catch{/* Local storage does not require cross-tab notifications. */}
    }
    document.addEventListener('visibilitychange',refreshVisible)
  })
  onBeforeUnmount(()=>{disposed=true;refreshRun++;channel?.close();document.removeEventListener('visibilitychange',refreshVisible)})
  return {findings,storageReady,storageError,reload,create,changeStatus,changeMaterial,changeRepair,restoreBackup,scenarioActive,changingSpace,prepareDemo,returnToPractice}
}
