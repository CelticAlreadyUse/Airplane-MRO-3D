import {mkdir} from 'node:fs/promises'
// Empty output folders only; no browser data or prebuilt fixtures are copied.
for(let phase=1;phase<=13;phase++)await mkdir(new URL(`../reports/phase-${phase}/`,import.meta.url),{recursive:true})
await mkdir(new URL('../output/pdf/',import.meta.url),{recursive:true})
console.log('Verification output folders are ready.')
