import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'
import { badRequest } from '../lib/httpError.js'

export const PHOTO_DIR = path.resolve('storage/uploads/photos')
const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/** Keep uploads in memory first, so we can inspect them before saving. */
export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
}).single('photo')

/**
 * Check the file's REAL type from its bytes ("magic numbers"). The browser's
 * Content-Type and the file extension can both be faked, so we never trust them.
 * The file gets a random name we choose, so a user can't control the path.
 */
export async function savePhoto(file) {
  if (!file) throw badRequest('Choose a photo to upload.')
  const detected = await fileTypeFromBuffer(file.buffer)
  const ext = detected && ALLOWED[detected.mime]
  if (!ext) throw badRequest('Upload a JPG, PNG or WebP image.')
  await fs.mkdir(PHOTO_DIR, { recursive: true })
  const name = `${crypto.randomUUID()}.${ext}`
  await fs.writeFile(path.join(PHOTO_DIR, name), file.buffer)
  return name
}

/** Copy a photo (used to freeze the photo inside an application). */
export async function copyPhoto(name) {
  if (!name) return null
  const ext = path.extname(name)
  const copy = `${crypto.randomUUID()}${ext}`
  try {
    await fs.copyFile(path.join(PHOTO_DIR, name), path.join(PHOTO_DIR, copy))
    return copy
  } catch {
    return null
  }
}

export async function deletePhoto(name) {
  if (!name) return
  await fs.rm(path.join(PHOTO_DIR, path.basename(name)), { force: true })
}
