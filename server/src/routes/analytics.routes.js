import { Router } from 'express'
import { z } from 'zod'
import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm'
import { APP_STATUS_LABELS, WORK_TYPES } from '@planet/shared'
import { db, schema } from '../db/index.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()
const { applications, jobs, companies, users } = schema
router.use(authenticate, requireRole('super_admin', 'alpha_admin'))

const rangeQuery = z.object({
  days: z.coerce.number().int().min(7).max(365).default(90),
})

/**
 * Everything for the analytics dashboard in one request.
 * The heavy lifting (grouping, counting, averaging) is done by PostgreSQL with
 * GROUP BY: far faster than loading every row into JavaScript.
 */
router.get('/overview', validate(rangeQuery, 'query'), async (req, res) => {
  const since = new Date(Date.now() - req.validatedQuery.days * 86_400_000)
  const inRange = gte(applications.createdAt, since)

  const salaryBucket = sql`case
    when ${applications.expectedSalary} < 20000 then 'Under 20k'
    when ${applications.expectedSalary} < 40000 then '20k–40k'
    when ${applications.expectedSalary} < 60000 then '40k–60k'
    when ${applications.expectedSalary} < 80000 then '60k–80k'
    when ${applications.expectedSalary} < 100000 then '80k–100k'
    else '100k+' end`

  const [kpis, byCompany, byCategory, bySalary, byWorkType, byStatus, timeline, topJobs] = await Promise.all([
    db.select({
      applications: sql`count(*)::int`,
      applicants: sql`count(distinct ${applications.userId})::int`,
      avgExpectedSalary: sql`coalesce(round(avg(${applications.expectedSalary})), 0)::int`,
      hired: sql`count(*) filter (where ${applications.status} = 'hired')::int`,
    }).from(applications).where(inRange),

    db.select({
      company: companies.name,
      applications: sql`count(${applications.id})::int`,
      avgExpectedSalary: sql`coalesce(round(avg(${applications.expectedSalary})), 0)::int`,
      hired: sql`count(*) filter (where ${applications.status} = 'hired')::int`,
    }).from(applications).innerJoin(companies, eq(applications.companyId, companies.id))
      .where(inRange).groupBy(companies.name).orderBy(desc(sql`count(${applications.id})`)),

    db.select({ category: jobs.category, applications: sql`count(*)::int`, avgExpectedSalary: sql`round(avg(${applications.expectedSalary}))::int` })
      .from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(inRange).groupBy(jobs.category).orderBy(desc(sql`count(*)`)),

    db.select({ bucket: salaryBucket, applications: sql`count(*)::int` }).from(applications).where(inRange).groupBy(salaryBucket),

    db.select({ workType: users.workType, applicants: sql`count(distinct ${users.id})::int` })
      .from(applications).innerJoin(users, eq(applications.userId, users.id))
      .where(inRange).groupBy(users.workType),

    db.select({ status: applications.status, n: sql`count(*)::int` }).from(applications).where(inRange).groupBy(applications.status),

    db.select({ day: sql`to_char(date_trunc('day', ${applications.createdAt}), 'YYYY-MM-DD')`, applications: sql`count(*)::int` })
      .from(applications).where(gte(applications.createdAt, new Date(Date.now() - 30 * 86_400_000)))
      .groupBy(sql`1`).orderBy(sql`1`),

    db.select({ title: jobs.title, company: companies.name, applications: sql`count(*)::int` })
      .from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(inRange).groupBy(jobs.id, jobs.title, companies.name).orderBy(desc(sql`count(*)`)).limit(5),
  ])

  const { rows: [pending] } = await db.execute(sql`select
    (select count(*)::int from jobs where status = 'pending_approval') as "jobApprovals",
    (select count(*)::int from applications where status = 'recommended') as "recommendations",
    (select count(*)::int from users where status = 'pending_approval') as "registrations",
    (select count(*)::int from jobs where status = 'published' and deadline > now()) as "publishedJobs"`)

  const bucketOrder = ['Under 20k', '20k–40k', '40k–60k', '60k–80k', '80k–100k', '100k+']
  const workLabel = Object.fromEntries(WORK_TYPES.map((w) => [w.value, w.label]))

  // Fill in missing days with 0 so the line chart has no gaps.
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
    days.push({ day: d, applications: timeline.find((t) => t.day === d)?.applications ?? 0 })
  }

  res.json({
    kpis: { ...kpis[0], ...pending },
    byCompany,
    byCategory,
    bySalary: bucketOrder.map((b) => ({ bucket: b, applications: bySalary.find((x) => x.bucket === b)?.applications ?? 0 })),
    byWorkType: byWorkType.map((w) => ({ workType: workLabel[w.workType] ?? 'Unknown', applicants: w.applicants })),
    pipeline: Object.keys(APP_STATUS_LABELS).map((s) => ({ status: s, label: APP_STATUS_LABELS[s], n: byStatus.find((x) => x.status === s)?.n ?? 0 })),
    timeline: days,
    topJobs,
  })
})

/* ---------------- Applicant log: every application as one row ---------------- */

const logQuery = z.object({
  companyId: z.uuid().optional(),
  status: z.enum(['submitted', 'shortlisted', 'recommended', 'interview', 'hired', 'rejected']).optional(),
  q: z.string().trim().max(100).optional(),
  minSalary: z.coerce.number().int().min(0).optional(),
  maxSalary: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
})

function logWhere(f) {
  return and(
    f.companyId ? eq(applications.companyId, f.companyId) : undefined,
    f.status ? eq(applications.status, f.status) : undefined,
    f.q ? or(ilike(users.name, `%${f.q}%`), ilike(users.email, `%${f.q}%`), ilike(jobs.title, `%${f.q}%`)) : undefined,
    f.minSalary !== undefined ? gte(applications.expectedSalary, f.minSalary) : undefined,
    f.maxSalary !== undefined ? lte(applications.expectedSalary, f.maxSalary) : undefined,
  )
}

const logSelect = () => db.select({
  id: applications.id,
  appliedAt: applications.createdAt,
  status: applications.status,
  expectedSalary: applications.expectedSalary,
  candidateName: users.name,
  candidateEmail: users.email,
  candidatePhone: users.phone,
  workType: users.workType,
  jobTitle: jobs.title,
  category: jobs.category,
  location: jobs.location,
  company: companies.name,
}).from(applications)
  .innerJoin(users, eq(applications.userId, users.id))
  .innerJoin(jobs, eq(applications.jobId, jobs.id))
  .innerJoin(companies, eq(applications.companyId, companies.id))

router.get('/applicants', validate(logQuery, 'query'), async (req, res) => {
  const f = req.validatedQuery
  const where = logWhere(f)
  const [rows, [{ total }]] = await Promise.all([
    logSelect().where(where).orderBy(desc(applications.createdAt)).limit(f.pageSize).offset((f.page - 1) * f.pageSize),
    db.select({ total: sql`count(*)::int` }).from(applications)
      .innerJoin(users, eq(applications.userId, users.id)).innerJoin(jobs, eq(applications.jobId, jobs.id)).where(where),
  ])
  res.json({ rows: rows.map((r) => ({ ...r, statusLabel: APP_STATUS_LABELS[r.status] })), total, page: f.page, pageSize: f.pageSize })
})

/**
 * CSV export. Cells starting with = + - @ are prefixed with ' because Excel
 * would otherwise run them as formulas ("CSV injection"): a candidate could
 * type a malicious formula as their name.
 */
const csvCell = (value) => {
  let s = value instanceof Date ? value.toISOString() : String(value ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

router.get('/applicants.csv', validate(logQuery, 'query'), async (req, res) => {
  const rows = await logSelect().where(logWhere(req.validatedQuery)).orderBy(desc(applications.createdAt)).limit(10_000)
  const header = ['Applied at', 'Candidate', 'Email', 'Phone', 'Work type', 'Job', 'Category', 'Company', 'Location', 'Expected salary', 'Status']
  const lines = rows.map((r) => [r.appliedAt, r.candidateName, r.candidateEmail, r.candidatePhone, r.workType, r.jobTitle, r.category, r.company, r.location, r.expectedSalary, APP_STATUS_LABELS[r.status]].map(csvCell).join(','))
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="applicants-${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send('\uFEFF' + [header.map(csvCell).join(','), ...lines].join('\r\n')) // BOM so Excel reads UTF-8 (Bangla names)
})

export default router
