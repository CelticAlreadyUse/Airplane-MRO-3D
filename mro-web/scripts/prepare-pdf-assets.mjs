import { cp, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const root=new URL('../',import.meta.url)
for(const folder of ['wasm','cmaps','standard_fonts']){
  const target=new URL(`public/pdfjs/${folder}/`,root)
  await mkdir(target,{recursive:true})
  await cp(fileURLToPath(new URL(`node_modules/pdfjs-dist/${folder}/`,root)),fileURLToPath(target),{recursive:true})
}
