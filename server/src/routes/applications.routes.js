import { Router } from 'express'
import { z } from 'zod'
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { APP_STATUS_LABELS, applicationSchema, CANDIDATE_STATUS_LABELS, matchScore } from '@planet/shared'
import { db, schema } from '../db/index.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { copyPhoto, deletePhoto } from '../middleware/upload.js'
import { audit } from '../lib/audit.js'
import { badRequest, conflict, notFound } from '../lib/httpError.js'
import { activeUsersWithRole, notify } from '../lib/notify.js'
import { templates } from '../lib/emailTemplates.js'
import { assertTransition, CANDIDATE_MESSAGES, candidateSeesChange } from '../services/applications.js'

const router = Router()
const { applications, applicationEvents, jobs, companies, users, cvs } = schema
router.use(authenticate)

const photoUrl = (file) => (file ? `/api/files/photos/${file}` : null)

/* ================= Candidate ================= */

router.post('/', requireRole('general'), validate(applicationSchema), async (req, res) => {
  const { jobId, expectedSalary, coverLetter } = req.body
  const [row] = await db.select({ job: jobs, company: companies }).from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id)).where(eq(jobs.id, jobId)).limit(1)
  if (!row || row.job.status !== 'published') throw notFound('This job is not accepting applications.')
  if (row.job.deadline <= new Date()) throw badRequest('The deadline for this job has passed.')

  const [cv] = await db.select().from(cvs).where(eq(cvs.userId, req.user.id)).limit(1)
  if (!cv?.data?.personal?.fullName) throw badRequest('Complete and save your CV before applying.', { code: 'CV_REQUIRED' })

  const [existing] = await db.select({ id: applications.id }).from(applications)
    .where(and(eq(applications.jobId, jobId), eq(applications.userId, req.user.id))).limit(1)
  if (existing) throw conflict('You have already applied for this job.')

  // Freeze the CV and photo: later CV edits must not change what was submitted.
  const frozenPhoto = await copyPhoto(cv.photoFile)
  const application = await db.transaction(async (tx) => {
    const [created] = await tx.insert(applications).values({
      jobId, userId: req.user.id, companyId: row.job.companyId,
      cvSnapshot: cv.data, photoFile: frozenPhoto, coverLetter, expectedSalary, status: 'submitted',
    }).returning()
    await tx.insert(applicationEvents).values({ applicationId: created.id, actorId: req.user.id, fromStatus: null, toStatus: 'submitted' })
    await audit(req, 'application.submitted', { entityType: 'application', entityId: created.id, details: { job: row.job.title, company: row.company.name } }, tx)
    return created
  })

  await notify([req.user], {
    title: 'Application submitted',
    body: `${row.job.title} at ${row.company.name}`,
    link: '/app/applications',
    email: templates.applicationReceived({ name: req.user.name, jobTitle: row.job.title, companyName: row.company.name }),
  })
  res.status(201).json({ application: { id: application.id, status: application.status } })
})

router.get('/mine', requireRole('general'), async (req, res) => {
  const rows = await db.select({ app: applications, job: jobs, company: companies }).from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .where(eq(applications.userId, req.user.id))
    .orderBy(desc(applications.createdAt))

  const events = rows.length
    ? await db.select().from(applicationEvents).where(inArray(applicationEvents.applicationId, rows.map((r) => r.app.id))).orderBy(asc(applicationEvents.createdAt))
    : []

  res.json({
    applications: rows.map(({ app, job, company }) => {
      // Candidates see a simplified timeline: internal steps and staff notes are hidden.
      const timeline = []
      for (const e of events.filter((ev) => ev.applicationId === app.id)) {
        const label = CANDIDATE_STATUS_LABELS[e.toStatus]
        if (timeline.at(-1)?.label !== label) timeline.push({ label, at: e.createdAt })
      }
      return {
        id: app.id,
        status: app.status,
        statusLabel: CANDIDATE_STATUS_LABELS[app.status],
        expectedSalary: app.expectedSalary,
        createdAt: app.createdAt,
        job: { id: job.id, title: job.title, location: job.location, type: job.type },
        company: { id: company.id, name: company.name },
        timeline,
      }
    }),
  })
})

router.delete('/:id', requireRole('general'), async (req, res) => {
  const [app] = await db.select().from(applications).where(and(eq(applications.id, req.params.id), eq(applications.userId, req.user.id))).limit(1)
  if (!app) throw notFound('Application not found.')
  if (app.status !== 'submitted') throw badRequest('Applications can only be withdrawn before they are reviewed.')
  await db.delete(applications).where(eq(applications.id, app.id))
  await deletePhoto(app.photoFile)
  await audit(req, 'application.withdrawn', { entityType: 'application', entityId: app.id })
  res.json({ withdrawn: true })
})

/* ================= Staff ================= */

const STAFF_APPS = ['admin', 'super_admin', 'alpha_admin']

const listQuery = z.object({
  jobId: z.uuid().optional(),
  companyId: z.uuid().optional(),
  status: z.enum(['submitted', 'shortlisted', 'recommended', 'interview', 'hired', 'rejected']).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['newest', 'match', 'salary_low', 'salary_high']).default('newest'),
})

router.get('/', requireRole(...STAFF_APPS), validate(listQuery, 'query'), async (req, res) => {
  const f = req.validatedQuery
  const rows = await db.select({
    app: applications, job: jobs, company: companies,
    candidate: { id: users.id, name: users.name, email: users.email, phone: users.phone, workType: users.workType },
  })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .innerJoin(users, eq(applications.userId, users.id))
    .where(and(
      f.jobId ? eq(applications.jobId, f.jobId) : undefined,
      f.companyId ? eq(applications.companyId, f.companyId) : undefined,
      f.status ? eq(applications.status, f.status) : undefined,
      f.q ? or(ilike(users.name, `%${f.q}%`), ilike(users.email, `%${f.q}%`), ilike(jobs.title, `%${f.q}%`)) : undefined,
    ))
    .orderBy(desc(applications.createdAt))

  const list = rows.map(({ app, job, company, candidate }) => ({
    id: app.id,
    status: app.status,
    statusLabel: APP_STATUS_LABELS[app.status],
    expectedSalary: app.expectedSalary,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    photoUrl: photoUrl(app.photoFile),
    headline: app.cvSnapshot?.personal?.title ?? '',
    match: matchScore(job, app.cvSnapshot),
    job: { id: job.id, title: job.title },
    company: { id: company.id, name: company.name },
    candidate,
  }))
  const sorters = {
    newest: () => 0,
    match: (a, b) => (b.match?.score ?? -1) - (a.match?.score ?? -1),
    salary_low: (a, b) => a.expectedSalary - b.expectedSalary,
    salary_high: (a, b) => b.expectedSalary - a.expectedSalary,
  }
  list.sort(sorters[f.sort])
  res.json({ applications: list })
})

router.get('/:id', requireRole(...STAFF_APPS), async (req, res) => {
  const [row] = await db.select({ app: applications, job: jobs, company: companies, candidate: users })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .innerJoin(users, eq(applications.userId, users.id))
    .where(eq(applications.id, req.params.id)).limit(1)
  if (!row) throw notFound('Application not found.')

  const actor = schema.users
  const events = await db.select({ event: applicationEvents, actorName: actor.name, actorRole: actor.role })
    .from(applicationEvents).leftJoin(actor, eq(applicationEvents.actorId, actor.id))
    .where(eq(applicationEvents.applicationId, row.app.id)).orderBy(asc(applicationEvents.createdAt))

  res.json({
    application: {
      id: row.app.id,
      status: row.app.status,
      statusLabel: APP_STATUS_LABELS[row.app.status],
      expectedSalary: row.app.expectedSalary,
      coverLetter: row.app.coverLetter,
      createdAt: row.app.createdAt,
      cv: row.app.cvSnapshot,
      photoUrl: photoUrl(row.app.photoFile),
      match: matchScore(row.job, row.app.cvSnapshot),
      job: { id: row.job.id, title: row.job.title, skills: row.job.skills, salaryMin: row.job.salaryMin, salaryMax: row.job.salaryMax },
      company: { id: row.company.id, name: row.company.name },
      candidate: {
        id: row.candidate.id, name: row.candidate.name, email: row.candidate.email, phone: row.candidate.phone,
        workType: row.candidate.workType, workDetail: row.candidate.workDetail,
      },
      history: events.map(({ event, actorName, actorRole }) => ({
        id: event.id, from: event.fromStatus, to: event.toStatus, toLabel: APP_STATUS_LABELS[event.toStatus],
        note: event.note, at: event.createdAt, actorName, actorRole,
      })),
    },
  })
})

const statusSchema = z.object({
  status: z.enum(['shortlisted', 'recommended', 'interview', 'hired', 'rejected']),
  note: z.string().trim().max(1000).optional().default(''),
}).refine((d) => d.status !== 'recommended' || d.note.length >= 5, {
  path: ['note'], message: 'Explain to the super admin why you recommend this candidate',
})

router.post('/:id/status', requireRole('admin', 'super_admin'), validate(statusSchema), async (req, res) => {
  const { status: to, note } = req.body
  const [row] = await db.select({ app: applications, job: jobs, company: companies, candidate: users })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .innerJoin(users, eq(applications.userId, users.id))
    .where(eq(applications.id, req.params.id)).limit(1)
  if (!row) throw notFound('Application not found.')
  const from = row.app.status
  assertTransition(req.user.role, from, to) // the server enforces the pipeline, not the UI

  // The WHERE on the old status prevents two people changing it at once
  // ("optimistic concurrency"): the second update matches no rows.
  const updated = await db.transaction(async (tx) => {
    const [u] = await tx.update(applications).set({ status: to })
      .where(and(eq(applications.id, row.app.id), eq(applications.status, from))).returning()
    if (!u) throw conflict('Someone else just changed this application. Refresh and try again.')
    await tx.insert(applicationEvents).values({ applicationId: u.id, actorId: req.user.id, fromStatus: from, toStatus: to, note })
    await audit(req, `application.${to}`, {
      entityType: 'application', entityId: u.id,
      details: { candidate: row.candidate.name, job: row.job.title, from, to, note },
    }, tx)
    return u
  })

  // Tell the candidate, but only about changes they can see.
  if (candidateSeesChange(from, to)) {
    await notify([row.candidate], {
      title: `${CANDIDATE_STATUS_LABELS[to]}: ${row.job.title}`,
      body: row.company.name,
      link: '/app/applications',
      email: templates.applicationStatus({
        name: row.candidate.name, jobTitle: row.job.title, companyName: row.company.name,
        statusLabel: CANDIDATE_STATUS_LABELS[to], message: CANDIDATE_MESSAGES[to],
      }),
    })
  }

  // Hand-offs between staff.
  if (to === 'recommended') {
    await notify(await activeUsersWithRole(['super_admin']), {
      title: 'New recommendation to review',
      body: `${req.user.name} recommends ${row.candidate.name} for ${row.job.title}.`,
      link: '/super/recommendations',
    })
  }
  if (from === 'recommended') {
    const [recommendation] = await db.select({ actorId: applicationEvents.actorId }).from(applicationEvents)
      .where(and(eq(applicationEvents.applicationId, row.app.id), eq(applicationEvents.toStatus, 'recommended')))
      .orderBy(desc(applicationEvents.createdAt)).limit(1)
    const [recommender] = recommendation?.actorId ? await db.select().from(users).where(eq(users.id, recommendation.actorId)).limit(1) : []
    await notify([recommender], {
      title: to === 'interview' ? 'Recommendation approved' : 'Recommendation declined',
      body: `${row.candidate.name} for ${row.job.title}${note ? `: ${note}` : ''}`,
      link: '/admin/applications',
    })
  }

  res.json({ application: { id: updated.id, status: updated.status, statusLabel: APP_STATUS_LABELS[updated.status] } })
})

/** Counts per status, for the pipeline summary bar. */
router.get('/summary/counts', requireRole(...STAFF_APPS), async (req, res) => {
  const rows = await db.select({ status: applications.status, n: sql`count(*)::int` }).from(applications).groupBy(applications.status)
  res.json({ counts: Object.fromEntries(rows.map((r) => [r.status, r.n])) })
})

export default router
