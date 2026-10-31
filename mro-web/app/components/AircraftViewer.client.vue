<script setup lang="ts">
import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { HighlightLayer } from '@babylonjs/core/Layers/highlightLayer'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent'
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader'
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents'
import '@babylonjs/core/Culling/ray'
import '@babylonjs/core/Rendering/outlineRenderer'
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import '@babylonjs/loaders/glTF'
import { describeComponent } from '../data/components'
import type { CameraView, ViewerReady, ViewerMetrics } from '../types/viewer'
import { severityColors,getFindingSeverity,type FindingSeverity } from '../types/severity'
import { MODEL_URL } from '../data/model'

const props = withDefaults(defineProps<{ selectedId: string | null; isolated: boolean; transparent: boolean; findingAssetIds?:string[]; findingSeverities?:Record<string,FindingSeverity>; dark?:boolean; active?:boolean }>(),{findingAssetIds:()=>[],findingSeverities:()=>({}),dark:false,active:true})
const emit = defineEmits<{
  ready: [data: ViewerReady]
  select: [id: string]
  metrics: [metrics: ViewerMetrics]
  error: [message: string]
}>()
const canvas = ref<HTMLCanvasElement>()
const loading = ref(true)
const error = ref('')
const progress = ref<number | null>(null)
let engine: Engine | undefined
let scene: Scene | undefined
let camera: ArcRotateCamera | undefined
let highlight: HighlightLayer | undefined
let observer: ResizeObserver | undefined
let metricsTimer: ReturnType<typeof setInterval> | undefined
let lastWidth = 0, lastHeight = 0
let disposed = false
let generation = 0
let loadMs = 0
let triangles = 0
let fileBytes = 0
let meshes: AbstractMesh[] = []
let homeTarget = new Vector3(0, 0.8, 0)
let homeRadius = 24
const byId = new Map<string, AbstractMesh[]>()
const idByMesh = new Map<number, string>()

function measure(): ViewerMetrics {
  return { meshCount: byId.size, triangles, loadMs,fileBytes,
    fps: Math.round(engine?.getFps() ?? 0),
    visibleCount: meshes.filter(m => m.isVisible).length }
}

function applySelection() {
  highlight?.removeAllMeshes()
  const selected = props.selectedId ? byId.get(props.selectedId) : undefined
  const activeFindings=new Set(props.findingAssetIds)
  for (const mesh of meshes) {
    const isSelected = selected?.includes(mesh) ?? false
    mesh.isVisible = !props.isolated || !selected || isSelected
    // Visibility affects both rendering and CPU pointer picking; hidden meshes are excluded.
    mesh.isPickable = mesh.isVisible
    mesh.visibility = props.transparent && !isSelected ? 0.16 : 1
    const hasFinding=activeFindings.has(idByMesh.get(mesh.uniqueId)??'') && mesh.isVisible
    mesh.renderOutline=hasFinding
    const severity=getFindingSeverity({severity:props.findingSeverities[idByMesh.get(mesh.uniqueId)??'']})
    const severityColor=Color3.FromHexString(severityColors[severity])
    mesh.outlineColor=severityColor
    mesh.outlineWidth=Math.max(0.004,Math.min(severity==='critical'?0.05:0.035,mesh.getBoundingInfo().boundingBox.extendSizeWorld.length()*(severity==='critical'?0.024:0.018)))
    if(hasFinding) highlight?.addMesh(mesh as Parameters<HighlightLayer['addMesh']>[0],severityColor)
    else if (isSelected) highlight?.addMesh(mesh as Parameters<HighlightLayer['addMesh']>[0], new Color3(0, 0.59, 0.56))

  }
  emit('metrics', measure())
}

function frame(parts: AbstractMesh[]) {
  if (!camera || !parts.length) return
  parts.forEach(m=>m.computeWorldMatrix(true))
  const points = parts.flatMap(m => m.getBoundingInfo().boundingBox.vectorsWorld)
  const min = points.reduce((a,b) => Vector3.Minimize(a,b), points[0]!.clone())
  const max = points.reduce((a,b) => Vector3.Maximize(a,b), points[0]!.clone())
  const target = min.add(max).scale(0.5)
  // Fit projected corners instead of the bounding-sphere diagonal: aircraft are flat
  // and a sphere fit wastes most of a wide viewport.
  const aspect = (engine?.getRenderWidth() ?? 1) / (engine?.getRenderHeight() ?? 1)
  const alpha = camera.alpha, beta = camera.beta
  camera.setTarget(target)
  // setTarget recalculates orbit angles from the old position. Restore the
  // requested view so focus/reset cannot unexpectedly tilt under the aircraft.
  camera.alpha = alpha; camera.beta = beta
  camera.getViewMatrix(true)
  const forward = target.subtract(camera.position).normalize()
  const right = Vector3.Cross(forward,Vector3.Up()).normalize()
  const up = Vector3.Cross(right,forward).normalize()
  const tanY = Math.tan(camera.fov/2)
  const tanX = tanY * aspect
  let distance = 0.6
  // Fit actual vertices. An aircraft's merged fuselage/fin bounding box contains
  // large empty corners and would leave the whole aircraft too small on screen.
  const point=new Vector3(),offset=new Vector3()
  for (const part of parts) {
    const positions=part.getVerticesData('position')
    if(!positions)continue
    const world=part.getWorldMatrix()
    for(let i=0;i<positions.length;i+=3) {
      Vector3.TransformCoordinatesFromFloatsToRef(positions[i]!,positions[i+1]!,positions[i+2]!,world,point)
      point.subtractToRef(target,offset)
      const depth=Vector3.Dot(offset,forward)
      distance=Math.max(distance,
        Math.abs(Vector3.Dot(offset,right))/tanX-depth,
        Math.abs(Vector3.Dot(offset,up))/tanY-depth)
    }
  }
  camera.radius = Math.max(distance*1.12,0.6)
}

function stopCameraMotion() {
  if (!camera) return
  camera.inertialAlphaOffset = 0; camera.inertialBetaOffset = 0
  camera.inertialRadiusOffset = 0
  camera.inertialPanningX = 0; camera.inertialPanningY = 0
}

function focus() {
  stopCameraMotion()
  if (props.selectedId) frame(byId.get(props.selectedId) ?? [])
}
function reset() {
  if (!camera) return
  stopCameraMotion()
  camera.alpha = 2.35
  camera.beta = 1.10
  frame(meshes)
  homeTarget = camera.target.clone()
  homeRadius = camera.radius
}
function setView(view: CameraView) {
  if (!camera) return
  stopCameraMotion()
  const angles: Record<CameraView, [number,number]> = {
    perspective:[2.35,1.10], left:[Math.PI/2,Math.PI/2], right:[-Math.PI/2,Math.PI/2],
    top:[Math.PI/2,0.03], front:[Math.PI,Math.PI/2],
  }
  ;[camera.alpha,camera.beta] = angles[view]
  if (props.isolated && props.selectedId) focus()
  else {
    camera.setTarget(homeTarget); camera.radius = homeRadius
    ;[camera.alpha,camera.beta] = angles[view]
  }
  camera.getViewMatrix(true)
}
function visibilityChanged() {
  if (!engine || !scene) return
  engine.stopRenderLoop()
  if (!document.hidden && props.active) engine.runRenderLoop(() => scene?.render())
}

async function load() {
  if (!canvas.value || disposed) return
  const run = ++generation
  loading.value = true
  error.value = ''
  progress.value = null
  try {
    if (!engine) {
      engine = new Engine(canvas.value, true, { stencil: true, preserveDrawingBuffer: false })
      engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio, 1.5))
      observer = new ResizeObserver(() => {
        const bounds = canvas.value?.getBoundingClientRect()
        if (!props.active || !bounds?.width || !bounds.height) return
        if (bounds.width === lastWidth && bounds.height === lastHeight) return
        lastWidth = bounds.width; lastHeight = bounds.height
        engine?.resize()
        if (props.isolated && props.selectedId) focus()
        else if (camera && meshes.length) {
          frame(meshes)
          homeTarget = camera.target.clone()
          homeRadius = camera.radius
        }
      })
      observer.observe(canvas.value)
      document.addEventListener('visibilitychange', visibilityChanged)
    }
    engine.stopRenderLoop()
    scene?.dispose()
    byId.clear(); idByMesh.clear(); meshes = []
    scene = new Scene(engine)
    scene.useRightHandedSystem = true
    scene.clearColor = new Color4(0.937,0.953,0.957,1)
    scene.ambientColor = new Color3(0.7,0.7,0.7)
    camera = new ArcRotateCamera('workspace-camera',2.35,1.10,24,new Vector3(0,0.8,0),scene)
    camera.attachControl(canvas.value,true)
    camera.minZ = 0.02
    camera.lowerRadiusLimit = 0.35
    camera.upperRadiusLimit = 75
    camera.wheelDeltaPercentage = 0.015
    camera.pinchDeltaPercentage = 0.01
    camera.panningSensibility = 90
    camera.inertia = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.65
    const hemi = new HemisphericLight('sky',new Vector3(0,1,0),scene)
    hemi.intensity = 0.85
    hemi.groundColor = new Color3(0.57,0.62,0.65)
    const sun = new DirectionalLight('key',new Vector3(0.4,-1,-0.4),scene)
    sun.position = new Vector3(-12,18,12)
    sun.intensity = 0.85
    const ground = MeshBuilder.CreateGround('workspace-ground',{width:2000,height:2000},scene)
    ground.position.y = -1.41
    ground.isPickable = false
    ground.receiveShadows = true
    const floor = new StandardMaterial('workspace-floor',scene)
    floor.diffuseColor = new Color3(0.52,0.56,0.57)
    floor.specularColor = Color3.Black()
    ground.material = floor
    // A repeated floor texture supplies an uncalibrated visual ground reference.
    // Keeping it on the ground material avoids overlapping coplanar geometry.
    const grid=new DynamicTexture('workspace-grid',{width:128,height:128},scene,true)
    grid.wrapU=Texture.WRAP_ADDRESSMODE;grid.wrapV=Texture.WRAP_ADDRESSMODE
    grid.uScale=1000;grid.vScale=1000;grid.anisotropicFilteringLevel=8
    floor.diffuseTexture=grid
    applyTheme()
    const start = performance.now()
    const [loaded, manifest,modelInfo] = await Promise.all([
      ImportMeshAsync(MODEL_URL,scene,{
        onProgress: event => { if (event.lengthComputable) progress.value = Math.round(event.loaded / event.total * 100) },
      }),
      $fetch<{asset_object_id:string;source_object_name:string}[]>('/models/component-map.json'),
      $fetch<{bytes:number}>('/models/model-info.json').catch(()=>({bytes:0})),
    ])
    if (disposed || run !== generation) return
    const names = new Map(manifest.map(m => [m.source_object_name,m.asset_object_id]))
    fileBytes=modelInfo.bytes
    meshes = loaded.meshes.filter(m => m.getTotalVertices()>0)
    for (const mesh of meshes) {
      let node: typeof mesh | typeof mesh.parent = mesh
      let sourceName: string | undefined
      while (node) {
        const extras = node.metadata?.gltf?.extras
        if (extras?.source_object_name) { sourceName = extras.source_object_name; break }
        if (names.has(node.name)) { sourceName = node.name; break }
        node = node.parent
      }
      if (!sourceName || !names.has(sourceName)) throw new Error(`Objek belum memiliki pemetaan: ${mesh.name}`)
      const id = names.get(sourceName)!
      if (!byId.has(id)) byId.set(id,[])
      byId.get(id)!.push(mesh)
      idByMesh.set(mesh.uniqueId,id)
      mesh.metadata = { ...mesh.metadata, workspaceId:id, sourceName }
      mesh.isPickable = true
    }
    triangles = meshes.reduce((sum,m)=>sum+(m.getTotalIndices()/3),0)
    const shadows = new ShadowGenerator(1024,sun)
    shadows.usePercentageCloserFiltering = true
    shadows.bias = 0.001
    meshes.filter(m=>['fuselage','ailes','ailes2','roueA','roueD','roueG','helice'].includes(m.metadata.sourceName)).forEach(m=>shadows.addShadowCaster(m))
    highlight = new HighlightLayer('component-selection',scene)
    highlight.blurHorizontalSize = 0.35
    highlight.blurVerticalSize = 0.35
    scene.onPointerObservable.add(event=>{
      if (event.type !== PointerEventTypes.POINTERTAP) return
      const picked = event.pickInfo?.pickedMesh
      const id = picked ? idByMesh.get(picked.uniqueId) : undefined
      if (id) emit('select',id)
    })
    reset()
    applySelection()
    engine.resize()
    engine.runRenderLoop(()=>scene?.render())
    await scene.whenReadyAsync()
    // Include first rendered frame, rather than network download alone.
    await new Promise<void>(resolve=>scene!.onAfterRenderObservable.addOnce(()=>resolve()))
    if (disposed || run !== generation) return
    loadMs = Math.round(performance.now()-start)
    const components = [...byId].map(([id,parts])=>describeComponent(id,parts[0]!.metadata.sourceName))
    emit('ready',{components,metrics:measure()})
    loading.value = false
    visibilityChanged()
    clearInterval(metricsTimer)
    metricsTimer = setInterval(()=>emit('metrics',measure()),2000)
  } catch (cause) {
    if (disposed || run !== generation) return
    const detail = cause instanceof Error ? cause.message : String(cause)
    error.value = `Model belum bisa dibuka. ${detail}`
    loading.value = false
    emit('error',error.value)
  }
}

function applyTheme() {
  if (!scene) return
  scene.clearColor = props.dark ? new Color4(0.055,0.078,0.10,1) : new Color4(0.937,0.953,0.957,1)
  const grid=scene.textures.find(texture=>texture.name==='workspace-grid') as DynamicTexture|undefined
  if(grid){
    const context=grid.getContext()
    context.fillStyle='#ffffff';context.fillRect(0,0,128,128)
    context.strokeStyle=props.dark?'#8daba6':'#bacbc5';context.lineWidth=1
    context.beginPath();context.moveTo(.5,0);context.lineTo(.5,128);context.moveTo(0,.5);context.lineTo(128,.5);context.stroke()
    grid.update()
  }
  const floor = scene.getMaterialByName('workspace-floor') as StandardMaterial | null
  if (floor) floor.diffuseColor = props.dark ? new Color3(0.075,0.10,0.12) : new Color3(0.52,0.56,0.57)
}
watch(()=>props.dark,applyTheme)
watch(()=>props.active,async active=>{
  await nextTick()
  if (active) engine?.resize()
  if (!loading.value) visibilityChanged()
})
watch(()=>[props.selectedId,props.isolated,props.transparent,props.findingAssetIds,props.findingSeverities],applySelection)
watch(()=>props.selectedId,()=>{ if (props.isolated) focus() })
onMounted(load)
onBeforeUnmount(()=>{
  disposed = true; generation++
  clearInterval(metricsTimer)
  observer?.disconnect()
  document.removeEventListener('visibilitychange',visibilityChanged)
  engine?.stopRenderLoop()
  scene?.dispose()
  engine?.dispose()
})
function getDiagnostics() {
  return { ...measure(), outlinedAssetIds:[...byId].filter(([,parts])=>parts.some(part=>part.renderOutline)).map(([id])=>id),outlinedSeverities:[...byId].filter(([,parts])=>parts.some(part=>part.renderOutline)).map(([id,parts])=>({id,severity:getFindingSeverity({severity:props.findingSeverities[id]}),color:parts[0]!.outlineColor.toHexString()})), dark:props.dark, active:props.active, clearColor:scene?.clearColor.asArray(), findingAssetIds:props.findingAssetIds,texturedObjects:[...byId].filter(([,parts])=>parts.some(p=>p.material instanceof PBRMaterial && !!p.material.albedoTexture)).length, transparentCount:meshes.filter(m=>m.visibility<1).length,
    selectedVisibleIds:[...byId].filter(([,parts])=>parts.some(p=>p.isVisible && p.visibility===1)).map(([id])=>id),
    camera:camera ? { position:camera.position.asArray(), target:camera.target.asArray(), radius:camera.radius,alpha:camera.alpha,beta:camera.beta } : null,
    sampleBounds:meshes.filter(m=>['fuselage','roueG'].includes(m.metadata.sourceName)).map(m=>({name:m.metadata.sourceName,min:m.getBoundingInfo().boundingBox.minimumWorld.asArray(),max:m.getBoundingInfo().boundingBox.maximumWorld.asArray()})) }
}
defineExpose({focus,reset,setView,retry:load,getDiagnostics})
</script>

<template>
  <div class="canvas-wrap" :data-ready="!loading && !error" :data-visible-meshes="measure().visibleCount">
    <canvas ref="canvas" aria-label="Model 3D Cessna 208 Caravan. Seret untuk memutar, cubit atau gulir untuk zoom. Pilih komponen melalui daftar sebagai alternatif." tabindex="0" />
    <div v-if="loading" class="viewer-state" role="status">
      <span class="loader" />
      <strong>Membuka Caravan</strong>
      <span>{{ progress === null ? 'Menyiapkan model 3D…' : `Mengunduh model · ${progress}%` }}</span>
    </div>
    <div v-if="error" class="viewer-state viewer-error" role="alert">
      <strong>Model belum tersedia</strong><span>{{ error }}</span>
      <button class="button primary" @click="load">Coba lagi</button>
    </div>
  </div>
</template>
