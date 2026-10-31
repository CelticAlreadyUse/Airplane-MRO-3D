import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
const require=createRequire(new URL('../mro-web/package.json',import.meta.url))
const {createJiti}=require('jiti'),jiti=createJiti(import.meta.url)
const {describeComponent,groupOrder}=await jiti.import('../mro-web/app/data/components.ts')
const {getComponentManual}=await jiti.import('../mro-web/app/data/componentManuals.ts')
const {classificationFamilies}=await jiti.import('../mro-web/app/data/componentClassification.ts')
const manifest=JSON.parse(await readFile(new URL('../mro-web/public/models/component-map.json',import.meta.url)))
const rows=manifest.map(row=>({...describeComponent(row.asset_object_id,row.source_object_name),manual:getComponentManual(row.source_object_name)??null}))
const checks=[]
function check(name,fn){fn();checks.push({name,passed:true});console.log('PASS '+name)}
check('All 434 stable source identities survive classification without duplicates',()=>{
 assert.equal(rows.length,434);assert.equal(new Set(rows.map(x=>x.id)).size,434)
 for(let i=0;i<rows.length;i++){assert.equal(rows[i].id,manifest[i].asset_object_id);assert.equal(rows[i].sourceName,manifest[i].source_object_name);assert(groupOrder.includes(rows[i].group))}
 const named=classificationFamilies.flatMap(f=>f.sourceNames);assert.equal(named.length,417);assert.equal(new Set(named).size,417)
})
const prior=JSON.parse(await readFile(new URL('../reports/phase-6/reference-catalog.json',import.meta.url)))
check('Prior 15 exterior reference assignments are preserved',()=>{
 for(const [source,entry] of Object.entries(prior))assert.deepEqual(getComponentManual(source).citations,entry.citations)
})
check('New subject references point to the independently reviewed book pages',()=>{
 const cases={'ALT.needle100':[462],'ASI.face.001':[462],'VSI.vitre':[462],'AI.float':[463],'sieges.009':[394,395],'intvitres':[405],'Yoke':[379],'LeftPedal':[379,390,438],'pito':[460,462],'PropPitch':[412],'KI227.card':[571]}
 for(const [source,pages] of Object.entries(cases))assert.deepEqual(getComponentManual(source).citations.map(c=>c.pdfPage),pages,source)
})
check('Unsupported gear, generic glass and Mixture do not receive invented C208 references',()=>{
 for(const name of ['Gearswitch','Mixture','vitre.004','trb','face.002','tank.003','Switch','porteB','porteH'])assert.equal(getComponentManual(name),undefined,name)
 assert.equal(describeComponent('example','Gearswitch').group,'Perlu verifikasi')
 assert.match(describeComponent('example','Mixture').description,/fuel condition/)
})
check('Radio buttons are linked only as locations and never as identified receivers',()=>{
 for(const source of ['ADF','DME','CommUse100M','NavVolume.001','KRA.needle','KI252a.face','vfr-btn'])assert.equal(getComponentManual(source).coverage,'location',source)
 assert.match(describeComponent('x','ADF').description,/tidak membuktikan/)
 assert.equal(getComponentManual('KI227.face').citations[0].bookPage,'S3-3')
})
check('Shared family citations retain identity required for safe navigation',()=>{
 assert.equal(getComponentManual('ALT.face'),getComponentManual('ALT.needle100'))
 const c=getComponentManual('ASI.face').citations[0];assert(getComponentManual('ASI.face').citations.includes(c))
})
check('Unlisted and prototype-like source names stay unknown',()=>{
 for(const name of ['ALT.not-a-real-object','constructor','toString','__proto__']){assert.equal(getComponentManual(name),undefined);assert.equal(describeComponent('x',name).mapping,'unmapped')}
})
const pdf=await readFile(new URL('../mro-web/public/manuals/c208-poh-training-1998.pdf',import.meta.url))
check('Referenced 1112-page training POH is byte-for-byte unchanged',()=>assert.equal(createHash('sha256').update(pdf).digest('hex'),'656cccc09f0103e49cfe1790b8c853c67e7f6cb5aa129e4d1599f56abe25607d'))
const coverage={classified:rows.filter(x=>x.mapping==='visual').length,unresolved:rows.filter(x=>x.mapping==='unmapped').length,linkedObjects:rows.filter(x=>x.manual).length,byReferenceCoverage:Object.fromEntries(['function','system','location'].map(c=>[c,rows.filter(x=>x.manual&&(x.manual.coverage??'function')===c).length])),byGroup:Object.fromEntries(groupOrder.map(g=>[g,rows.filter(x=>x.group===g).length]))}
await writeFile(new URL('../reports/phase-9/classification-catalog.json',import.meta.url),JSON.stringify({coverage,rows},null,2)+'\n')
await writeFile(new URL('../reports/phase-9/data-verification.json',import.meta.url),JSON.stringify({completed:true,checks,coverage},null,2)+'\n')
console.log(JSON.stringify(coverage))
