import path from 'node:path'
import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { authenticate, STAFF } from '../middleware/auth.js'
import { PHOTO_DIR } from '../middleware/upload.js'
import { notFound } from '../lib/httpError.js'

const router = Router()
router.use(authenticate)

/**
 * Photos are NOT in a public folder. Every request checks permission:
 * candidates can see their own photos, staff can see any candidate's.
 */
router.get('/photos/:file', async (req, res) => {
  const file = path.basename(req.params.file) // blocks "../../etc/passwd" tricks
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(file)) throw notFound()

  if (!STAFF.includes(req.user.role)) {
    const [cv] = await db.select({ userId: schema.cvs.userId }).from(schema.cvs).where(eq(schema.cvs.photoFile, file)).limit(1)
    const [app] = cv ? [] : await db.select({ userId: schema.applications.userId }).from(schema.applications).where(eq(schema.applications.photoFile, file)).limit(1)
    const ownerId = cv?.userId ?? app?.userId
    if (ownerId !== req.user.id) throw notFound()
  }
  res.set('Cache-Control', 'private, max-age=3600')
  res.sendFile(path.join(PHOTO_DIR, file), (err) => err && !res.headersSent && res.status(404).json({ message: 'Not found.' }))
})

export default router
