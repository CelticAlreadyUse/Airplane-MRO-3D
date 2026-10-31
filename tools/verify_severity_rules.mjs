import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
const require=createRequire(new URL('../mro-web/package.json',import.meta.url))
const {createJiti}=require('jiti')
const {getFindingSeverity,summarizeActiveSeverities,severityColors,isFindingSeverity}=await createJiti(import.meta.url).import('../mro-web/app/types/severity.ts')
const checks=[]
function check(name,run){run();checks.push({name,passed:true});console.log('PASS '+name)}
check('Legacy priority is not mistaken for a damage assessment',()=>assert.equal(getFindingSeverity({priority:'high'}),'unassessed'))
check('Highest assessed active finding wins regardless of record order',()=>{
 const records=[{assetId:'wheel',status:'open',severity:'low'},{assetId:'wheel',status:'in_progress',severity:'critical'},{assetId:'wheel',status:'open',severity:'medium'}]
 for(const list of [records,[...records].reverse()])assert.deepEqual(summarizeActiveSeverities(list).get('wheel'),{severity:'critical',count:3,unassessed:0})
})
check('Closing a severe finding exposes the remaining lower severity',()=>assert.equal(summarizeActiveSeverities([{assetId:'wheel',status:'closed',severity:'critical'},{assetId:'wheel',status:'open',severity:'low'}]).get('wheel').severity,'low'))
check('Closed-only components have no damage outline assignment',()=>assert.equal(summarizeActiveSeverities([{assetId:'wheel',status:'closed',severity:'critical'}]).size,0))
check('Unassessed active records stay visible alongside an assessed record',()=>assert.deepEqual(summarizeActiveSeverities([{assetId:'wheel',status:'open'},{assetId:'wheel',status:'open',severity:'high'}]).get('wheel'),{severity:'high',count:2,unassessed:1}))
check('Separate components retain separate severity assessments',()=>{
 const result=summarizeActiveSeverities([{assetId:'wheel',status:'open',severity:'critical'},{assetId:'door',status:'open',severity:'low'}]);assert.equal(result.get('wheel').severity,'critical');assert.equal(result.get('door').severity,'low')
})
check('Only declared severity values are accepted',()=>{assert(isFindingSeverity('critical'));assert(!isFindingSeverity('severe'));assert(!isFindingSeverity('toString'));assert.equal(new Set(Object.values(severityColors)).size,5)})
await writeFile(new URL('../reports/phase-8/rule-verification.json',import.meta.url),JSON.stringify({completed:true,checks},null,2)+'\n')
