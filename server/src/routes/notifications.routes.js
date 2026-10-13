import { Router } from 'express'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
const { notifications } = schema
router.use(authenticate)

router.get('/', async (req, res) => {
  const [items, [{ unread }]] = await Promise.all([
    db.select().from(notifications).where(eq(notifications.userId, req.user.id)).orderBy(desc(notifications.createdAt)).limit(50),
    db.select({ unread: sql`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, req.user.id), isNull(notifications.readAt))),
  ])
  res.json({ notifications: items, unread })
})

router.post('/read-all', async (req, res) => {
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, req.user.id), isNull(notifications.readAt)))
  res.json({ ok: true })
})

router.post('/:id/read', async (req, res) => {
  // The userId condition means you can only mark YOUR notifications as read.
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.user.id)))
  res.json({ ok: true })
})

export default router
