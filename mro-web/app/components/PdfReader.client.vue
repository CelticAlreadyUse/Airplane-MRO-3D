<script setup lang="ts">
import { PhCaretLeft, PhCaretRight, PhMinus, PhPlus, PhArrowsHorizontal, PhArrowSquareOut, PhDownloadSimple, PhWarningCircle } from '@phosphor-icons/vue'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type PDFDocumentLoadingTask, type RenderTask } from 'pdfjs-dist'
import type { ManualPageRequest } from '../types/manualNavigation'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
GlobalWorkerOptions.workerSrc=pdfWorkerUrl
const props=defineProps<{url:string;title:string;initialPage:number;active:boolean;navigation?:ManualPageRequest|null}>()
const scrollArea=useTemplateRef<HTMLDivElement>('scrollArea')
const paper=useTemplateRef<HTMLDivElement>('paper')
const page=ref(props.initialPage),pageInput=ref(String(props.initialPage)),total=ref(0)
const zoom=ref(1),fit=ref(true),fitPage=ref(true),busy=ref(false),rendering=ref(false),error=ref(''),pageText=ref('')
const renderedPage=ref(0),progress=ref<number|null>(null)
let pdf:PDFDocumentProxy|undefined,task:PDFDocumentLoadingTask|undefined,renderTask:RenderTask|undefined
let generation=0,renderGeneration=0,observer:ResizeObserver|undefined,resizeTimer:ReturnType<typeof setTimeout>|undefined
let lastWidth=0,lastHeight=0,disposed=false
const zoomLabel=computed(()=>fit.value?(fitPage.value?'Halaman penuh':'Sesuai lebar'):`${Math.round(zoom.value*100)}%`)
async function release(){
  renderGeneration++
  renderTask?.cancel();renderTask=undefined
  const old=task; task=undefined;pdf=undefined
  try{await old?.destroy()}catch{/* An aborted request needs no user action. */}
}
async function open(){
  const run=++generation
  page.value=props.navigation?.pdfPage??props.initialPage;pageInput.value=String(page.value)
  busy.value=true;rendering.value=false;error.value='';total.value=0;renderedPage.value=0;progress.value=null;pageText.value=''
  await release()
  if(disposed || run!==generation)return
  paper.value?.replaceChildren()
  try{
    task=getDocument({url:props.url,enableXfa:false,stopAtErrors:true,cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/'})
    task.onProgress=({loaded,total:bytes}:{loaded:number;total:number})=>{if(run===generation&&bytes>0)progress.value=Math.min(100,Math.round(loaded/bytes*100))}
    const document=await task.promise
    if(disposed || run!==generation)return
    pdf=document;total.value=document.numPages
    page.value=Math.min(Math.max(1,props.navigation?.pdfPage??props.initialPage),total.value);pageInput.value=String(page.value)
    fit.value=true;fitPage.value=true;zoom.value=1;busy.value=false
    await draw()
  }catch(cause){
    if(disposed||run!==generation)return
    error.value=pdfError(cause);busy.value=false
  }
}
function pdfError(cause:unknown){
  const name=(cause as Error)?.name
  if(name==='PasswordException')return 'PDF ini membutuhkan kata sandi. Gunakan Buka PDF untuk membukanya di pembaca lain.'
  return 'PDF belum dapat dibuka. Periksa berkas atau koneksi lokal, lalu coba lagi.'
}
async function draw(){
  if(!pdf||!paper.value||!props.active||disposed)return
  const width=scrollArea.value?.clientWidth??0
  if(width<60)return
  const run=++renderGeneration
  renderTask?.cancel();renderTask=undefined
  rendering.value=true;error.value=''
  const document=pdf,number=page.value
  try{
    const documentPage=await document.getPage(number)
    if(disposed||run!==renderGeneration)return
    const base=documentPage.getViewport({scale:1})
    const height=scrollArea.value?.clientHeight??500
    const scale=fit.value?Math.min(2.5,Math.max(.25,Math.min((width-36)/base.width,fitPage.value?(height-36)/base.height:Infinity))):zoom.value
    if(fit.value) zoom.value=scale
    const viewport=documentPage.getViewport({scale})
    const ratio=Math.min(window.devicePixelRatio||1,1.75,Math.sqrt(12_000_000/(viewport.width*viewport.height)))
    const target=window.document.createElement('canvas')
    target.width=Math.ceil(viewport.width*ratio);target.height=Math.ceil(viewport.height*ratio)
    target.style.width=`${viewport.width}px`;target.style.height=`${viewport.height}px`
    target.setAttribute('role','img');target.setAttribute('aria-label',`${props.title}, halaman ${number} dari ${total.value}. Teks halaman tersedia di bawah pembaca.`)
    renderTask=documentPage.render({canvas:target,viewport,transform:[ratio,0,0,ratio,0,0],background:'#ffffff'})
    await renderTask.promise
    if(disposed||run!==renderGeneration)return
    paper.value.replaceChildren(target)
    renderedPage.value=number;lastWidth=width;lastHeight=height;rendering.value=false
    const content=await documentPage.getTextContent()
    if(disposed||run!==renderGeneration)return
    pageText.value=content.items.map(item=>'str' in item?item.str:'').join(' ')
    scrollArea.value?.scrollTo({top:0,left:0})
  }catch(cause){
    if(disposed||run!==renderGeneration||(cause as Error)?.name==='RenderingCancelledException')return
    error.value=pdfError(cause);rendering.value=false
  }
}
function go(number:number){
  if(!Number.isFinite(number)||!total.value){pageInput.value=String(page.value);return}
  page.value=Math.max(1,Math.min(total.value,Math.trunc(number)))
  pageInput.value=String(page.value)
  // A new component can reference the already rendered page while this tab is
  // hidden. Keep that page's text: activation can legitimately reuse its canvas.
  if(page.value!==renderedPage.value) pageText.value=''
  void draw()
}
function changeZoom(delta:number){fit.value=false;zoom.value=Math.max(.5,Math.min(2.5,Math.round((zoom.value+delta)*100)/100));void draw()}
watch(()=>props.url,open)
watch(()=>props.navigation,request=>{
  if(!request) return
  if(pdf) go(request.pdfPage)
  else {page.value=request.pdfPage;pageInput.value=String(page.value)}
})
watch(()=>props.active,async active=>{if(active){await nextTick();if(pdf && (page.value!==renderedPage.value || !renderedPage.value || (scrollArea.value?.clientWidth!==lastWidth || (fitPage.value && scrollArea.value?.clientHeight!==lastHeight))))void draw()}})
onMounted(()=>{
  observer=new ResizeObserver(()=>{clearTimeout(resizeTimer);if(props.active&&fit.value&&(scrollArea.value?.clientWidth!==lastWidth || (fitPage.value && scrollArea.value?.clientHeight!==lastHeight)))resizeTimer=setTimeout(()=>void draw(),150)})
  if(scrollArea.value)observer.observe(scrollArea.value)
  void open()
})
onBeforeUnmount(()=>{disposed=true;generation++;clearTimeout(resizeTimer);observer?.disconnect();void release()})
</script>
<template>
  <div class="pdf-reader" :data-rendered-page="renderedPage" :data-page-count="total" :aria-busy="busy || rendering">
    <div class="pdf-toolbar" aria-label="Kontrol pembaca PDF">
      <form class="pdf-pagination" @submit.prevent="go(Number(pageInput))"><button type="button" class="icon-button" aria-label="Halaman PDF sebelumnya" :disabled="busy || page<=1 || !total" @click="go(page-1)"><PhCaretLeft :size="18" /></button><label for="pdf-page-number">Halaman</label><input id="pdf-page-number" v-model="pageInput" aria-label="Nomor halaman PDF" inputmode="numeric" :disabled="busy || !total" @change="go(Number(pageInput))" /><span>/ {{ total ? total.toLocaleString('id-ID') : '—' }}</span><button type="button" class="icon-button" aria-label="Halaman PDF berikutnya" :disabled="busy || page>=total || !total" @click="go(page+1)"><PhCaretRight :size="18" /></button></form>
      <div class="pdf-zoom"><button class="icon-button" aria-label="Perkecil PDF" :disabled="!total || (!fit && zoom<=.5)" @click="changeZoom(-.25)"><PhMinus :size="17" /></button><button class="pdf-fit" :disabled="!total" @click="fit=true;fitPage=!fitPage;draw()" :aria-label="fitPage?'Sesuaikan PDF dengan lebar pembaca':'Tampilkan satu halaman PDF penuh'" title="Beralih antara halaman penuh dan sesuai lebar"><PhArrowsHorizontal :size="17" />{{ zoomLabel }}</button><button class="icon-button" aria-label="Perbesar PDF" :disabled="!total || (!fit && zoom>=2.5)" @click="changeZoom(.25)"><PhPlus :size="17" /></button></div>
      <div class="pdf-file-actions"><a :href="`${url}#page=${page}`" target="_blank" rel="noopener noreferrer" title="Buka PDF di tab baru"><PhArrowSquareOut :size="17" /><span>Buka PDF</span></a><a :href="url" download title="Unduh PDF" aria-label="Unduh PDF"><PhDownloadSimple :size="18" /></a></div>
    </div>
    <div ref="scrollArea" class="pdf-scroll-area" tabindex="0" aria-label="Halaman dokumen PDF, gunakan tombol arah untuk menggulir">
      <div ref="paper" v-show="!busy && !error" class="pdf-paper" :class="{'pdf-paper-pending':rendering}" />
      <div v-if="busy" class="pdf-state" role="status"><span class="loader" /><strong>Membuka dokumen PDF</strong><span>{{ progress===null?'Menyiapkan halaman…':`Memuat berkas · ${progress}%` }}</span><small>Salinan lokal · halaman dimuat sesuai kebutuhan.</small></div>
      <div v-else-if="error" class="pdf-state pdf-error" role="alert"><PhWarningCircle :size="28" /><strong>Dokumen belum tersedia</strong><p>{{ error }}</p><button class="button primary" @click="open">Coba buka PDF lagi</button></div>
      <span v-else-if="rendering" class="pdf-render-status" role="status">Menyiapkan halaman {{ page }}…</span>
    </div>
    <div class="pdf-bottom-bar"><span role="status">{{ renderedPage ? `Halaman berkas ${renderedPage} dari ${total.toLocaleString('id-ID')}` : 'Pembaca PDF' }}</span><button :disabled="!total" @click="go(initialPage)">Halaman judul</button><button :disabled="!total" @click="go(1)">Awal berkas</button></div>
    <details v-if="renderedPage" class="pdf-text"><summary>Teks halaman {{ renderedPage }}</summary><p>{{ pageText || 'Teks belum tersedia atau halaman ini merupakan hasil pindai. Buka PDF asli untuk pilihan pembacaan lainnya.' }}</p></details>
  </div>
</template>
