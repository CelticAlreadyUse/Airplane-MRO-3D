import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
const require=createRequire(new URL('../mro-web/package.json',import.meta.url))
const {createJiti}=require('jiti')
const data=await createJiti(import.meta.url).import('../mro-web/app/data/operations.ts')
const checks=[]
function check(name,fn){fn();checks.push({name,passed:true});console.log('PASS '+name)}
check('Every flight duration agrees with same-day departure and arrival',()=>{
 for(const flight of data.flightRecords){const minutes=t=>t.split(':').map(Number).reduce((h,m)=>h*60+m);assert.equal(minutes(flight.arrival)-minutes(flight.departure),flight.minutes)}
})
check('Flight totals are 2000 km, 460 minutes and eight cycles',()=>assert.deepEqual(data.flightTotals,{distanceKm:2000,minutes:460,cycles:8}))
check('Flight IDs are unique and explicitly synthetic',()=>{assert.equal(new Set(data.flightRecords.map(f=>f.id)).size,8);assert(data.flightRecords.every(f=>f.id.startsWith('DEMO-')))})
check('Inventory allocations never exceed physical quantities',()=>{for(const part of data.inventoryParts){assert(part.partNumber.startsWith('DEMO-'));assert(part.reserved>=0 && part.reserved<=part.quantity);assert(data.availableStock(part)>=0)}})
check('Stock attention contains two low items and one empty item',()=>{assert.equal(data.inventoryParts.filter(p=>data.stockState(p)==='low').length,2);assert.equal(data.inventoryParts.filter(p=>data.stockState(p)==='empty').length,1)})
check('Calendar recurrence handles leap days and year boundaries',()=>{assert.equal(data.addDays('2028-02-28',1),'2028-02-29');assert.equal(data.addDays('2026-12-31',1),'2027-01-01')})
check('Recurring plan uses the first reached calendar or usage limit',()=>{const due=data.maintenanceDue(data.maintenancePlans[0]);assert.equal(due.status,'due');assert.equal(due.nextDate,'2026-10-26');assert.equal(due.daysLeft,-5);assert.equal(due.minutesLeft,-160)})
check('Maintenance baseline counters agree with the flight log at each recorded date',()=>{for(const plan of data.maintenancePlans){const earlier=data.flightRecords.filter(f=>f.date<=plan.lastDate);assert.equal(plan.lastMinutes,earlier.reduce((t,f)=>t+f.minutes,0));assert.equal(plan.lastCycles,earlier.length)}})
check('Demo plan states cover due, soon and planned',()=>assert.deepEqual(data.maintenancePlans.map(p=>data.maintenanceDue(p).status),['due','soon','planned','planned']))
await writeFile(new URL('../reports/phase-7/data-verification.json',import.meta.url),JSON.stringify({completed:true,snapshot:data.demoSnapshot,checks},null,2)+'\n')
