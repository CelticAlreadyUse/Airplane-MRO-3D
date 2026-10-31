import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../mro-web/package.json',import.meta.url)),{createJiti}=require('jiti'),jiti=createJiti(import.meta.url)
const {applyMaterialCommand:apply,inventoryWithRequests:stock,validMaterialRequests:valid,hasUnfulfilledMaterialRequests:waiting}=await jiti.import('../mro-web/app/utils/materialRequests.ts')
const {inventoryParts}=await jiti.import('../mro-web/app/data/operations.ts')
const baseline=JSON.stringify(inventoryParts),checks=[]
const original={id:'job-1',aircraftId:'cessna-208-demo',assetId:'c208-source-0388',sourceName:'roueG',componentLabel:'Roda utama kiri',title:'Simulasi perbaikan',description:'Pengamatan simulasi untuk pengujian.',category:'wear',priority:'normal',status:'in_progress',createdAt:'2026-10-31T00:00:00.000Z',updatedAt:'2026-10-31T00:00:00.000Z',revision:1,history:[],photos:[{id:'photo',name:'legacy.jpg',blob:new Blob(['legacy-photo'],{type:'image/jpeg'})}]}
const request=(f,partId='inv-01',quantity=2,all=[f])=>apply(all,f,f.revision,{kind:'request',draft:{partId,quantity,note:'Material untuk perbaikan simulasi'}})
const transition=(f,status,all=[f])=>apply(all,f,f.revision,{kind:'transition',requestId:f.materialRequests[0].id,status,note:'Catatan tindakan material simulasi'})
const part=fs=>stock(fs).find(p=>p.id==='inv-01')
function check(name,fn){fn();checks.push({name,passed:true});console.log('PASS '+name)}
check('Legacy findings without requests remain valid and unchanged',()=>{assert(valid(undefined));assert.equal(waiting(original),false);assert.equal(original.materialRequests,undefined)})
let pending=request(original),ready=transition(pending,'ready'),issued=transition(ready,'issued')
check('Submitting a request leaves physical stock and allocations unchanged',()=>{assert.deepEqual(part([pending]),inventoryParts[0]);assert(waiting(pending));assert.equal(pending.materialRequests[0].status,'requested')})
check('Preparing reserves stock; issuing reduces physical stock exactly once',()=>{assert.equal(part([ready]).quantity,4);assert.equal(part([ready]).reserved,3);assert.equal(part([issued]).quantity,2);assert.equal(part([issued]).reserved,1);assert.equal(waiting(issued),false);assert.throws(()=>transition(issued,'issued'))})
check('Cancellation releases prepared stock and cannot reverse a completed issue',()=>{const cancelled=transition(ready,'cancelled');assert.deepEqual(part([cancelled]),inventoryParts[0]);assert.equal(waiting(cancelled),false);assert.throws(()=>transition(issued,'cancelled'))})
check('Requests can wait for empty stock but cannot reserve it',()=>{const empty=request(original,'inv-03',1);assert.equal(empty.materialRequests[0].status,'requested');assert.throws(()=>transition(empty,'ready'),/Stok.*belum cukup/)})
check('Reservations across separate jobs cannot exceed remaining availability',()=>{const second=request({...original,id:'job-2'});assert.throws(()=>transition(second,'ready',[ready,second]),/belum cukup/);const enough=request({...original,id:'job-3'},'inv-01',1);assert.equal(transition(enough,'ready',[ready,enough]).materialRequests[0].status,'ready')})
check('Invalid quantities and unknown parts are rejected',()=>{for(const quantity of [0,-1,1.5,NaN,Infinity,1000])assert.throws(()=>request(original,'inv-01',quantity));assert.throws(()=>request(original,'missing',1))})
check('Closed work, duplicate active requests and stale revisions are rejected',()=>{assert.throws(()=>request({...original,status:'closed'}));assert.throws(()=>request(pending),/permintaan aktif/);assert.throws(()=>apply([ready],ready,1,{kind:'transition',requestId:ready.materialRequests[0].id,status:'issued',note:'Catatan pengujian'}),/sudah berubah/)})
check('Material edits preserve legacy severity, photo objects, identity and job status',()=>{assert.equal(Object.hasOwn(issued,'severity'),false);assert.equal(issued.photos,original.photos);assert.equal(issued.photos[0].blob,original.photos[0].blob);assert.equal(issued.assetId,original.assetId);assert.equal(issued.status,'in_progress');assert.equal(issued.revision,4)})
check('Each material transition appends its own event and request identity',()=>{assert.deepEqual(issued.history.map(e=>e.type),['material_requested','material_prepared','material_issued']);assert(issued.history.every(e=>e.requestId===issued.materialRequests[0].id&&e.to==='in_progress'))})
check('Issued parts still count after a job closes and other aircraft do not share stock',()=>{assert.equal(part([{...issued,status:'closed'}]).quantity,2);assert.deepEqual(part([{...issued,aircraftId:'other-aircraft'}]),inventoryParts[0])})
check('Invalid stored requests are rejected and baseline catalog stays immutable',()=>{assert(valid(issued.materialRequests));assert.equal(valid([{...issued.materialRequests[0],status:'wrong'}]),false);assert.equal(valid([issued.materialRequests[0],issued.materialRequests[0]]),false);assert.equal(JSON.stringify(inventoryParts),baseline)})
await writeFile(new URL('../reports/phase-10/material-rules.json',import.meta.url),JSON.stringify({completed:true,checks},null,2)+'\n')
