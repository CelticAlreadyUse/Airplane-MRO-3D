import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {writeFile} from 'node:fs/promises'
const require=createRequire(new URL('../mro-web/package.json',import.meta.url)),{createJiti}=require('jiti'),jiti=createJiti(import.meta.url)
const {aircraftDashboard:summary}=await jiti.import('../mro-web/app/utils/aircraftDashboard.ts')
const {demoGuide:guide}=await jiti.import('../mro-web/app/utils/demoGuide.ts')
const {applyMaterialCommand:material}=await jiti.import('../mro-web/app/utils/materialRequests.ts')
const {applyRepairCommand:repair}=await jiti.import('../mro-web/app/utils/repairWork.ts')
const at='2026-10-31T03:00:00.000Z',photo={id:'before',name:'before.jpg',blob:new Blob(['jpeg fixture'],{type:'image/jpeg'})}
const base={id:'guide-wheel',aircraftId:'cessna-208-demo',assetId:'c208-source-0388',sourceName:'roueG',componentLabel:'Roda utama kiri',title:'Pengamatan contoh',description:'Pengamatan simulasi untuk pengujian ringkasan.',category:'wear',priority:'high',status:'open',createdAt:at,updatedAt:at,revision:1,history:[],photos:[photo]}
const checks=[];function check(name,fn){fn();checks.push({name,passed:true});console.log('PASS '+name)}
check('Empty notebook has no active work but retains seeded utilization and maintenance context',()=>{const s=summary([]);assert.equal(s.active,0);assert.equal(s.urgent,0);assert.equal(s.pendingMaterials,0);assert.equal(s.lowStock,3);assert.equal(s.due,1);assert.equal(s.soon,1)})
const records=[base,{...base,id:'critical',severity:'critical'},{...base,id:'high',severity:'high',priority:'normal'},{...base,id:'closed-critical',severity:'critical',status:'closed'},{...base,id:'review',status:'awaiting_review',severity:'medium'},{...base,id:'foreign',aircraftId:'other',severity:'critical'}]
check('Urgency uses assessed active damage, never legacy priority or closed/foreign work',()=>{const s=summary(records);assert.equal(s.active,4);assert.equal(s.urgent,2);assert.equal(s.review,1);assert.equal(s.total,5);assert.equal(s.closed,1);assert.equal(s.severities.find(r=>r.severity==='unassessed').count,1)})
check('Attention puts critical work first and uses stable date/ID order for ties',()=>{assert.deepEqual(summary(records).attention.map(f=>f.id),['critical','high','review','guide-wheel'])})
let requested=material([base],base,1,{kind:'request',draft:{partId:'inv-01',quantity:2,note:'Dua unit untuk pengujian ringkasan.'}},at)
let ready=material([requested],requested,requested.revision,{kind:'transition',requestId:requested.materialRequests[0].id,status:'ready',note:'Disiapkan untuk demo.'},at)
let issued=material([ready],ready,ready.revision,{kind:'transition',requestId:ready.materialRequests[0].id,status:'issued',note:'Diserahkan untuk demo.'},at)
let used=material([issued],issued,issued.revision,{kind:'disposition',requestId:issued.materialRequests[0].id,disposition:'used',quantity:1,actor:'Teknisi Demo',note:'Satu unit dipakai untuk simulasi.'},at)
let settled=material([used],used,used.revision,{kind:'disposition',requestId:used.materialRequests[0].id,disposition:'returned',quantity:1,actor:'Teknisi Demo',note:'Satu unit kembali untuk simulasi.'},at)
check('Each request appears in exactly one pending stage; counts are requests rather than units',()=>{for(const [f,key] of [[requested,'requested'],[ready,'ready'],[issued,'unsettled'],[used,'unsettled']]){const s=summary([f]);assert.equal(s[key],1);assert.equal(s.pendingMaterials,1)}assert.equal(summary([settled]).pendingMaterials,0)})
check('Low stock follows reservations, issue and returns without changing the ledger',()=>{const before=JSON.stringify(settled);assert.equal(summary([ready]).lowStock,4);assert.equal(summary([issued]).lowStock,4);assert.equal(summary([settled]).lowStock,3);assert.equal(JSON.stringify(settled),before)})
check('Latest history includes restore/review events with their own work identity',()=>{const s=summary([{...base,history:[{id:'a',type:'created',at:'2026-10-30T03:00:00Z',actor:'Demo',to:'open',note:'Awal'},{id:'b',type:'backup_restored',at,actor:'Demo',to:'open',note:'Pulih'}]}]);assert.deepEqual(s.recent.map(r=>r.event.id),['b','a']);assert.equal(s.recent[0].finding.id,base.id)})
check('Guide never marks requests or a partially accounted issue as completed',()=>{for(const f of [base,requested,ready,issued,used])assert.equal(guide(f,f.assetId,undefined)[2].done,false);assert.equal(guide(settled,settled.assetId,undefined)[2].done,true);assert.equal(guide(issued,issued.assetId,undefined)[3].action,'Selesaikan material')})
const draft={technician:'Teknisi Demo',startedAt:'2026-10-31T01:00:00Z',completedAt:'2026-10-31T02:00:00Z',actions:'Pengerjaan simulasi disertai foto dan rujukan.',reference:'Dokumen demo rev 1.',beforePhotos:[photo],afterPhotos:[{...photo,id:'after'}]}
const pending=repair({...settled,status:'in_progress'},settled.revision,{kind:'submit',draft},at)
const rework=repair(pending,pending.revision,{kind:'review',cardId:pending.repairCards[0].id,inspector:'Pemeriksa Demo',result:'rework',note:'Perlu ulang untuk pengujian panduan.',checks:[]},at)
const resubmitted=repair(rework,rework.revision,{kind:'submit',draft},at)
const accepted=repair(resubmitted,resubmitted.revision,{kind:'review',cardId:resubmitted.repairCards.at(-1).id,inspector:'Pemeriksa Demo',result:'accepted',note:'Hasil simulasi diterima untuk pengujian.',checks:['record','photos','materials']},at)
check('Guide enables review only for pending cards or accepted-result readout',()=>{assert.equal(guide(base,null,undefined)[4].enabled,false);assert.equal(guide(pending,null,undefined)[4].enabled,true);assert.equal(guide(pending,null,undefined)[4].done,false)})
check('Rework clears repair completion until a new card is submitted',()=>{assert.equal(guide(rework,null,undefined)[3].done,false);assert.equal(guide(rework,null,undefined)[4].done,false);assert.equal(guide(resubmitted,null,undefined)[3].done,true)})
check('A legacy closed job does not invent accepted examiner evidence',()=>{assert.equal(guide({...base,status:'closed'},null,undefined)[4].done,false)})
check('PDF progress belongs to the current saved revision only',()=>{assert.equal(guide(accepted,accepted.assetId,accepted.revision).every(s=>s.done),true);assert.equal(guide(accepted,accepted.assetId,accepted.revision-1)[5].done,false)})
check('Missing guide target remains incomplete and every action is disabled',()=>{assert.equal(guide(undefined,null,undefined).some(s=>s.done||s.enabled),false)})
await writeFile(new URL('../reports/phase-13/dashboard-rules.json',import.meta.url),JSON.stringify({completed:true,checks},null,2)+'\n')
