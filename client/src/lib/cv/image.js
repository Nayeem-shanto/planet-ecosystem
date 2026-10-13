/**
 * Shrink an image in the browser before uploading: a 4000px phone photo
 * becomes a ~60 KB JPEG. Faster uploads, less storage, and it also strips
 * hidden metadata such as GPS location from the original photo.
 */
export async function resizeImage(source, maxSize = 600) {
  const bitmap = source instanceof ImageBitmap ? source : await createImageBitmap(source)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff' // transparent PNGs get a white background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
}
