import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { cvSchema } from '@planet/shared'
import { db, schema } from '../db/index.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { deletePhoto, photoUpload, savePhoto } from '../middleware/upload.js'
import { audit } from '../lib/audit.js'
import { badRequest } from '../lib/httpError.js'

const router = Router()
const { cvs } = schema
router.use(authenticate, requireRole('general'))

const photoUrl = (file) => (file ? `/api/files/photos/${file}` : null)

router.get('/', async (req, res) => {
  const [cv] = await db.select().from(cvs).where(eq(cvs.userId, req.user.id)).limit(1)
  res.json({ cv: cv ? { data: cv.data, photoUrl: photoUrl(cv.photoFile), updatedAt: cv.updatedAt } : null })
})

router.put('/', validate(cvSchema), async (req, res) => {
  if (!req.body.personal.fullName) throw badRequest('Add your full name before saving.', { fields: { 'personal.fullName': 'Required' } })
  // "Upsert": insert, or update if this user already has a CV.
  const [cv] = await db.insert(cvs).values({ userId: req.user.id, data: req.body })
    .onConflictDoUpdate({ target: cvs.userId, set: { data: req.body, updatedAt: new Date() } })
    .returning()
  await audit(req, 'cv.saved', { entityType: 'cv', entityId: cv.id })
  res.json({ cv: { data: cv.data, photoUrl: photoUrl(cv.photoFile), updatedAt: cv.updatedAt } })
})

router.post('/photo', photoUpload, async (req, res) => {
  const file = await savePhoto(req.file)
  const [existing] = await db.select().from(cvs).where(eq(cvs.userId, req.user.id)).limit(1)
  if (existing) {
    await db.update(cvs).set({ photoFile: file }).where(eq(cvs.id, existing.id))
    await deletePhoto(existing.photoFile) // the old file is no longer referenced
  } else {
    // A photo can be uploaded before the CV is saved for the first time.
    await db.insert(cvs).values({ userId: req.user.id, photoFile: file, data: { personal: { fullName: '' }, experience: [], education: [], skills: [], languages: [], certifications: [], references: [] } })
  }
  res.json({ photoUrl: photoUrl(file) })
})

router.delete('/photo', async (req, res) => {
  const [existing] = await db.select().from(cvs).where(eq(cvs.userId, req.user.id)).limit(1)
  if (existing?.photoFile) {
    await db.update(cvs).set({ photoFile: null }).where(eq(cvs.id, existing.id))
    await deletePhoto(existing.photoFile)
  }
  res.json({ photoUrl: null })
})

export default router
