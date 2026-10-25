import { Router } from 'express'
import { z } from 'zod'
import { and, desc, eq, gt, ilike, inArray, lte, or, sql } from 'drizzle-orm'
import { JOB_CATEGORIES, JOB_TYPES, jobSchema, matchScore, WORKPLACES } from '@planet/shared'
import { db, schema } from '../db/index.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { audit } from '../lib/audit.js'
import { badRequest, notFound } from '../lib/httpError.js'
import { activeUsersWithRole, notify } from '../lib/notify.js'
import { templates } from '../lib/emailTemplates.js'

const router = Router()
const { jobs, companies, applications, savedJobs, cvs, users } = schema
router.use(authenticate)

const publicCompany = (c) => c && { id: c.id, name: c.name, industry: c.industry, location: c.location, about: c.about, website: c.website }

/* ================= Candidate side: the job board ================= */

const boardQuery = z.object({
  q: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
  category: z.enum(JOB_CATEGORIES).optional(),
  types: z.string().optional(), // comma separated
  workplace: z.enum(WORKPLACES).optional(),
  maxExperience: z.coerce.number().int().min(0).max(40).optional(),
  companyId: z.uuid().optional(),
  saved: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'match', 'salary', 'deadline']).default('newest'),
})

router.get('/', requireRole('general'), validate(boardQuery, 'query'), async (req, res) => {
  const f = req.validatedQuery
  const types = f.types?.split(',').filter((t) => JOB_TYPES.includes(t))
  const now = new Date()

  // Filtering happens in SQL: the database is built for this and only sends
  // back the rows we need.
  const where = and(
    eq(jobs.status, 'published'),
    gt(jobs.deadline, now),
    eq(companies.isActive, true),
    f.q ? or(ilike(jobs.title, `%${f.q}%`), ilike(companies.name, `%${f.q}%`), sql`${jobs.skills}::text ilike ${`%${f.q}%`}`) : undefined,
    f.location ? ilike(jobs.location, `%${f.location}%`) : undefined,
    f.category ? eq(jobs.category, f.category) : undefined,
    types?.length ? inArray(jobs.type, types) : undefined,
    f.workplace ? eq(jobs.workplace, f.workplace) : undefined,
    f.maxExperience !== undefined ? lte(jobs.experienceMin, f.maxExperience) : undefined,
    f.companyId ? eq(jobs.companyId, f.companyId) : undefined,
    f.saved === 'true' ? sql`exists (select 1 from saved_jobs s where s.job_id = ${jobs.id} and s.user_id = ${req.user.id})` : undefined,
  )

  const [rows, [cv], saved, applied] = await Promise.all([
    db.select({ job: jobs, company: companies }).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id)).where(where),
    db.select({ data: cvs.data }).from(cvs).where(eq(cvs.userId, req.user.id)).limit(1),
    db.select({ jobId: savedJobs.jobId }).from(savedJobs).where(eq(savedJobs.userId, req.user.id)),
    db.select({ jobId: applications.jobId }).from(applications).where(eq(applications.userId, req.user.id)),
  ])

  const savedIds = new Set(saved.map((s) => s.jobId))
  const appliedIds = new Set(applied.map((a) => a.jobId))
  const result = rows.map(({ job, company }) => ({
    ...job,
    company: publicCompany(company),
    match: matchScore(job, cv?.data),
    saved: savedIds.has(job.id),
    applied: appliedIds.has(job.id),
  }))

  // Match score depends on the CV, so this sort happens here in JavaScript.
  const sorters = {
    newest: (a, b) => b.publishedAt - a.publishedAt,
    match: (a, b) => (b.match?.score ?? -1) - (a.match?.score ?? -1),
    salary: (a, b) => (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0),
    deadline: (a, b) => a.deadline - b.deadline,
  }
  result.sort(sorters[f.sort])
  res.json({ jobs: result, hasCV: Boolean(cv?.data?.skills?.length) })
})

router.post('/:id/save', requireRole('general'), async (req, res) => {
  await db.insert(savedJobs).values({ userId: req.user.id, jobId: req.params.id }).onConflictDoNothing()
  res.json({ saved: true })
})

router.delete('/:id/save', requireRole('general'), async (req, res) => {
  await db.delete(savedJobs).where(and(eq(savedJobs.userId, req.user.id), eq(savedJobs.jobId, req.params.id)))
  res.json({ saved: false })
})

/* ================= Staff side: managing job posts ================= */

const STAFF_JOBS = ['admin', 'super_admin']

const manageQuery = z.object({
  status: z.enum(['pending_approval', 'published', 'rejected', 'closed']).optional(),
  companyId: z.uuid().optional(),
  q: z.string().trim().max(100).optional(),
})

router.get('/manage', requireRole(...STAFF_JOBS, 'alpha_admin'), validate(manageQuery, 'query'), async (req, res) => {
  const { status, companyId, q } = req.validatedQuery
  const creator = schema.users
  const rows = await db
    .select({
      job: jobs,
      company: companies,
      createdByName: creator.name,
      applicationCount: sql`(select count(*)::int from applications a where a.job_id = ${jobs.id})`,
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .leftJoin(creator, eq(jobs.createdById, creator.id))
    .where(and(
      status ? eq(jobs.status, status) : undefined,
      companyId ? eq(jobs.companyId, companyId) : undefined,
      q ? ilike(jobs.title, `%${q}%`) : undefined,
    ))
    .orderBy(desc(jobs.createdAt))
  res.json({
    jobs: rows.map((r) => ({ ...r.job, company: publicCompany(r.company), createdByName: r.createdByName ?? 'Removed staff', applicationCount: r.applicationCount })),
  })
})

async function getJobOrThrow(id) {
  const [row] = await db.select({ job: jobs, company: companies }).from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id)).where(eq(jobs.id, id)).limit(1)
  if (!row) throw notFound('Job not found.')
  return row
}

router.get('/:id', async (req, res) => {
  const { job, company } = await getJobOrThrow(req.params.id)
  // Candidates may only see live jobs. Staff can see everything.
  if (req.user.role === 'general' && job.status !== 'published') throw notFound('Job not found.')
  res.json({ job: { ...job, company: publicCompany(company) } })
})

async function assertActiveCompany(companyId) {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1)
  if (!company?.isActive) throw badRequest('Choose an active company.', { fields: { companyId: 'Choose an active company' } })
  return company
}

router.post('/', requireRole(...STAFF_JOBS), validate(jobSchema), async (req, res) => {
  await assertActiveCompany(req.body.companyId)
  // Super admins approve jobs, so their own posts publish straight away.
  const isSuper = req.user.role === 'super_admin'
  const [job] = await db.insert(jobs).values({
    ...req.body,
    createdById: req.user.id,
    status: isSuper ? 'published' : 'pending_approval',
    publishedAt: isSuper ? new Date() : null,
    reviewedById: isSuper ? req.user.id : null,
    reviewedAt: isSuper ? new Date() : null,
  }).returning()

  await audit(req, 'job.created', { entityType: 'job', entityId: job.id, details: { title: job.title, status: job.status } })
  if (!isSuper) {
    await notify(await activeUsersWithRole(['super_admin']), {
      title: 'Job post waiting for approval',
      body: `${req.user.name} submitted "${job.title}".`,
      link: '/super/job-approvals',
    })
  }
  res.status(201).json({ job })
})

router.patch('/:id', requireRole(...STAFF_JOBS), validate(jobSchema), async (req, res) => {
  const { job } = await getJobOrThrow(req.params.id)
  await assertActiveCompany(req.body.companyId)

  // When an admin edits a live or rejected job, it goes back for approval:
  // otherwise approval could be bypassed by editing after publishing.
  const needsReview = req.user.role === 'admin' && job.status !== 'pending_approval'
  const [updated] = await db.update(jobs)
    .set({ ...req.body, ...(needsReview && { status: 'pending_approval', reviewNote: null }) })
    .where(eq(jobs.id, job.id)).returning()

  await audit(req, 'job.updated', { entityType: 'job', entityId: job.id, details: { title: updated.title, sentForReview: needsReview } })
  if (needsReview) {
    await notify(await activeUsersWithRole(['super_admin']), {
      title: 'Edited job post waiting for approval',
      body: `${req.user.name} edited "${updated.title}".`,
      link: '/super/job-approvals',
    })
  }
  res.json({ job: updated })
})

const reviewSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).optional().default(''),
}).refine((d) => d.decision === 'approve' || d.note.length >= 3, { path: ['note'], message: 'Tell the admin why it was not approved' })

router.post('/:id/review', requireRole('super_admin'), validate(reviewSchema), async (req, res) => {
  const { job } = await getJobOrThrow(req.params.id)
  if (job.status !== 'pending_approval') throw badRequest('This job is not waiting for approval.')
  const approved = req.body.decision === 'approve'
  if (approved && job.deadline <= new Date()) throw badRequest('The deadline has passed. Ask the admin to update it first.')

  const [updated] = await db.update(jobs).set({
    status: approved ? 'published' : 'rejected',
    reviewedById: req.user.id,
    reviewedAt: new Date(),
    reviewNote: req.body.note || null,
    publishedAt: approved ? (job.publishedAt ?? new Date()) : job.publishedAt,
  }).where(eq(jobs.id, job.id)).returning()

  await audit(req, approved ? 'job.approved' : 'job.rejected', { entityType: 'job', entityId: job.id, details: { title: job.title, note: req.body.note } })
  const [creator] = job.createdById ? await db.select().from(users).where(eq(users.id, job.createdById)).limit(1) : []
  await notify([creator], {
    title: approved ? `Published: ${job.title}` : `Not approved: ${job.title}`,
    body: req.body.note,
    link: '/admin/jobs',
    email: templates.jobReviewed({ name: creator?.name, jobTitle: job.title, approved, note: req.body.note }),
  })
  res.json({ job: updated })
})

router.post('/:id/close', requireRole(...STAFF_JOBS), async (req, res) => {
  const { job } = await getJobOrThrow(req.params.id)
  if (job.status !== 'published') throw badRequest('Only published jobs can be closed.')
  const [updated] = await db.update(jobs).set({ status: 'closed' }).where(eq(jobs.id, job.id)).returning()
  await audit(req, 'job.closed', { entityType: 'job', entityId: job.id, details: { title: job.title } })
  res.json({ job: updated })
})

router.post('/:id/reopen', requireRole(...STAFF_JOBS), async (req, res) => {
  const { job } = await getJobOrThrow(req.params.id)
  if (job.status !== 'closed') throw badRequest('Only closed jobs can be reopened.')
  if (job.deadline <= new Date()) throw badRequest('The deadline has passed. Edit the job and set a new deadline first.')
  const [updated] = await db.update(jobs).set({ status: 'published' }).where(eq(jobs.id, job.id)).returning()
  await audit(req, 'job.reopened', { entityType: 'job', entityId: job.id, details: { title: job.title } })
  res.json({ job: updated })
})

router.delete('/:id', requireRole(...STAFF_JOBS), async (req, res) => {
  const { job } = await getJobOrThrow(req.params.id)
  const [{ n }] = await db.select({ n: sql`count(*)::int` }).from(applications).where(eq(applications.jobId, job.id))
  if (n > 0) throw badRequest('This job has applications, so it cannot be deleted. Close it instead to keep the records.')
  await db.delete(jobs).where(eq(jobs.id, job.id))
  await audit(req, 'job.deleted', { entityType: 'job', entityId: job.id, details: { title: job.title } })
  res.json({ deleted: true })
})

export default router
