import { Router } from 'express'
import { z } from 'zod'
import { and, desc, eq, ilike, sql } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()
const { auditLogs, users } = schema
router.use(authenticate, requireRole('super_admin', 'alpha_admin'))

const query = z.object({
  action: z.string().trim().max(60).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
})

router.get('/', validate(query, 'query'), async (req, res) => {
  const { action, q, page, pageSize } = req.validatedQuery
  const where = and(
    action ? ilike(auditLogs.action, `${action}%`) : undefined,
    q ? ilike(users.name, `%${q}%`) : undefined,
  )
  const [rows, [{ total }]] = await Promise.all([
    db.select({ log: auditLogs, actorName: users.name, actorEmail: users.email }).from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id)).where(where)
      .orderBy(desc(auditLogs.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: sql`count(*)::int` }).from(auditLogs).leftJoin(users, eq(auditLogs.actorId, users.id)).where(where),
  ])
  res.json({ logs: rows.map((r) => ({ ...r.log, actorName: r.actorName, actorEmail: r.actorEmail })), total, page, pageSize })
})

export default router
