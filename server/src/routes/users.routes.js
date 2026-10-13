import { Router } from 'express'
import { z } from 'zod'
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { phoneField, ROLE_LABELS } from '@planet/shared'
import { db, schema } from '../db/index.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { audit } from '../lib/audit.js'
import { badRequest, notFound } from '../lib/httpError.js'
import { notify } from '../lib/notify.js'
import { sendMail } from '../lib/mailer.js'
import { templates } from '../lib/emailTemplates.js'
import { loadPublicUser, toPublicUser } from '../services/users.js'

const router = Router()
const { users, companies } = schema
router.use(authenticate)

/* ---------------- My own profile ---------------- */

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: phoneField,
  workDetail: z.string().trim().max(160).optional(),
  designation: z.string().trim().max(80).optional(),
})

router.patch('/me', validate(profileSchema), async (req, res) => {
  const { name, phone, workDetail, designation } = req.body
  const changes = { name, phone }
  // Each role may only edit its own kind of fields. Company, employee ID and
  // NID can't be changed here: those were verified at approval time.
  if (req.user.role === 'general' && workDetail) changes.workDetail = workDetail
  if (['admin', 'super_admin'].includes(req.user.role) && designation) changes.designation = designation
  await db.update(users).set(changes).where(eq(users.id, req.user.id))
  await audit(req, 'user.profile_updated', { entityType: 'user', entityId: req.user.id })
  res.json({ user: await loadPublicUser(req.user.id) })
})

/* ---------------- Alpha admin: account management ---------------- */

router.use(requireRole('alpha_admin'))

const listQuery = z.object({
  role: z.enum(['general', 'admin', 'super_admin', 'alpha_admin']).optional(),
  status: z.enum(['pending_verification', 'pending_approval', 'active', 'rejected', 'suspended']).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

router.get('/', validate(listQuery, 'query'), async (req, res) => {
  const { role, status, q, page, pageSize } = req.validatedQuery
  const where = and(
    role ? eq(users.role, role) : undefined,
    status ? eq(users.status, status) : undefined,
    q ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`), ilike(users.staffCode, `%${q}%`)) : undefined,
  )
  const [rows, [{ total }]] = await Promise.all([
    db.select({ user: users, company: companies }).from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(where).orderBy(desc(users.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: sql`count(*)::int` }).from(users).where(where),
  ])
  res.json({ users: rows.map((r) => toPublicUser(r.user, r.company)), total, page, pageSize })
})

router.get('/pending', async (req, res) => {
  const rows = await db.select({ user: users, company: companies }).from(users)
    .leftJoin(companies, eq(users.companyId, companies.id))
    .where(and(inArray(users.role, ['admin', 'super_admin']), eq(users.status, 'pending_approval')))
    .orderBy(users.createdAt)
  res.json({ users: rows.map((r) => toPublicUser(r.user, r.company)) })
})

async function getStaffOrThrow(id) {
  const [row] = await db.select({ user: users, company: companies }).from(users)
    .leftJoin(companies, eq(users.companyId, companies.id)).where(eq(users.id, id)).limit(1)
  if (!row) throw notFound('User not found.')
  return row
}

/**
 * Staff IDs are sequential per role: ADM-0001, SAD-0001.
 * Runs inside a transaction with an advisory lock so two approvals at the
 * same moment can never receive the same number.
 */
async function nextStaffCode(tx, role) {
  const prefix = role === 'admin' ? 'ADM' : 'SAD'
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${prefix}))`)
  const [{ n }] = await tx.select({ n: sql`count(*)::int` }).from(users).where(ilike(users.staffCode, `${prefix}-%`))
  return `${prefix}-${String(n + 1).padStart(4, '0')}`
}

router.post('/:id/approve', async (req, res) => {
  const { user, company } = await getStaffOrThrow(req.params.id)
  if (user.status !== 'pending_approval') throw badRequest('This account is not waiting for approval.')

  const updated = await db.transaction(async (tx) => {
    const staffCode = await nextStaffCode(tx, user.role)
    const [row] = await tx.update(users)
      .set({ status: 'active', staffCode, approvedById: req.user.id, approvedAt: new Date(), rejectionReason: null })
      .where(eq(users.id, user.id)).returning()
    await audit(req, 'user.approved', { entityType: 'user', entityId: user.id, details: { name: user.name, role: user.role, staffCode } }, tx)
    return row
  })

  const roleLabel = ROLE_LABELS[updated.role]
  await notify([updated], {
    title: `You are approved as ${roleLabel}`,
    body: `${roleLabel} of ${company?.name}. Your ID is ${updated.staffCode}.`,
    email: templates.staffApproved({ name: updated.name, roleLabel, staffCode: updated.staffCode, companyName: company?.name }),
  })
  res.json({ user: toPublicUser(updated, company) })
})

router.post('/:id/reject', validate(z.object({ reason: z.string().trim().min(3, 'Give a short reason').max(500) })), async (req, res) => {
  const { user, company } = await getStaffOrThrow(req.params.id)
  if (user.status !== 'pending_approval') throw badRequest('This account is not waiting for approval.')
  const [updated] = await db.update(users).set({ status: 'rejected', rejectionReason: req.body.reason }).where(eq(users.id, user.id)).returning()
  await audit(req, 'user.rejected', { entityType: 'user', entityId: user.id, details: { name: user.name, role: user.role, reason: req.body.reason } })
  void sendMail({ to: updated.email, ...templates.staffRejected({ name: updated.name, roleLabel: ROLE_LABELS[updated.role], reason: req.body.reason }) })
  res.json({ user: toPublicUser(updated, company) })
})

router.post('/:id/suspend', async (req, res) => {
  const { user, company } = await getStaffOrThrow(req.params.id)
  if (user.role === 'alpha_admin') throw badRequest('Alpha admin accounts cannot be suspended here.')
  if (user.status !== 'active') throw badRequest('Only active accounts can be suspended.')
  // tokenVersion + 1 signs them out immediately.
  const [updated] = await db.update(users).set({ status: 'suspended', tokenVersion: user.tokenVersion + 1 }).where(eq(users.id, user.id)).returning()
  await audit(req, 'user.suspended', { entityType: 'user', entityId: user.id, details: { name: user.name, role: user.role } })
  void sendMail({ to: updated.email, ...templates.accountSuspended({ name: updated.name }) })
  res.json({ user: toPublicUser(updated, company) })
})

router.post('/:id/reactivate', async (req, res) => {
  const { user, company } = await getStaffOrThrow(req.params.id)
  if (user.status !== 'suspended') throw badRequest('Only suspended accounts can be reactivated.')
  const [updated] = await db.update(users).set({ status: 'active' }).where(eq(users.id, user.id)).returning()
  await audit(req, 'user.reactivated', { entityType: 'user', entityId: user.id, details: { name: user.name, role: user.role } })
  void sendMail({ to: updated.email, ...templates.accountReactivated({ name: updated.name }) })
  res.json({ user: toPublicUser(updated, company) })
})

export default router
