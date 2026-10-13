import { Router } from 'express'
import { asc, count, eq } from 'drizzle-orm'
import { companySchema } from '@planet/shared'
import { db, schema } from '../db/index.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { audit } from '../lib/audit.js'
import { notFound } from '../lib/httpError.js'

const router = Router()
const { companies } = schema

/** Public: only id + name, for the staff registration dropdown. */
router.get('/public', async (req, res) => {
  const rows = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.isActive, true))
    .orderBy(asc(companies.name))
  res.json({ companies: rows })
})

router.use(authenticate)

router.get('/', async (req, res) => {
  const rows = await db
    .select({ company: companies, openJobs: count(schema.jobs.id) })
    .from(companies)
    .leftJoin(schema.jobs, eq(schema.jobs.companyId, companies.id))
    .groupBy(companies.id)
    .orderBy(asc(companies.name))
  res.json({ companies: rows.map((r) => ({ ...r.company, jobCount: r.openJobs })) })
})

router.post('/', requireRole('alpha_admin'), validate(companySchema), async (req, res) => {
  const [company] = await db.insert(companies).values(req.body).returning()
  await audit(req, 'company.created', { entityType: 'company', entityId: company.id, details: { name: company.name } })
  res.status(201).json({ company })
})

router.patch('/:id', requireRole('alpha_admin'), validate(companySchema), async (req, res) => {
  const [company] = await db.update(companies).set(req.body).where(eq(companies.id, req.params.id)).returning()
  if (!company) throw notFound('Company not found.')
  await audit(req, 'company.updated', { entityType: 'company', entityId: company.id, details: { name: company.name } })
  res.json({ company })
})

/** Companies are deactivated, never deleted: jobs and applications still point to them. */
const setActive = (isActive) => async (req, res) => {
  const [company] = await db.update(companies).set({ isActive }).where(eq(companies.id, req.params.id)).returning()
  if (!company) throw notFound('Company not found.')
  await audit(req, isActive ? 'company.activated' : 'company.deactivated', { entityType: 'company', entityId: company.id, details: { name: company.name } })
  res.json({ company })
}
router.post('/:id/activate', requireRole('alpha_admin'), setActive(true))
router.post('/:id/deactivate', requireRole('alpha_admin'), setActive(false))

export default router
