import type { FindingPhoto } from '../types/findings'

export async function prepareFindingPhoto(file:File):Promise<FindingPhoto> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Gunakan foto JPG, PNG, atau WebP.')
  if (file.size>4*1024*1024) throw new Error(`Foto ${file.name} melebihi batas 4 MB.`)
  let bitmap:ImageBitmap
  try { bitmap=await createImageBitmap(file) }
  catch { throw new Error(`Foto ${file.name} tidak dapat dibaca. Pilih gambar lain.`) }
  try {
    const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height))
    const canvas=document.createElement('canvas')
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale))
    const ctx=canvas.getContext('2d')
    if (!ctx) throw new Error('Browser belum dapat memproses foto.')
    ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height)
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height)
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value ? resolve(value) : reject(new Error('Foto belum dapat diproses.')),'image/jpeg',0.82))
    if (blob.size>1024*1024) throw new Error(`Foto ${file.name} masih terlalu besar setelah diproses. Gunakan foto yang lebih kecil.`)
    return {id:crypto.randomUUID(),name:file.name,blob}
  } finally { bitmap.close() }
}
