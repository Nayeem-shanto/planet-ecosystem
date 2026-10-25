import { sql } from 'drizzle-orm'
import {
  boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core'

/* ---------- Enums: the database itself rejects invalid values ---------- */
export const userRole = pgEnum('user_role', ['general', 'admin', 'super_admin', 'alpha_admin'])
export const userStatus = pgEnum('user_status', ['pending_verification', 'pending_approval', 'active', 'rejected', 'suspended'])
export const idType = pgEnum('id_type', ['nid', 'birth_certificate'])
export const tokenPurpose = pgEnum('token_purpose', ['verify_email', 'reset_password'])
export const jobStatus = pgEnum('job_status', ['pending_approval', 'published', 'rejected', 'closed'])
export const appStatus = pgEnum('application_status', ['submitted', 'shortlisted', 'recommended', 'interview', 'hired', 'rejected'])

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  industry: text('industry').notNull(),
  location: text('location').notNull(),
  about: text('about').notNull().default(''),
  website: text('website').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: userRole('role').notNull(),
  status: userStatus('status').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  passwordHash: text('password_hash').notNull(),

  // National ID / birth certificate. Stored ENCRYPTED, never as plain text.
  // id_number_hash lets us detect duplicates without decrypting anything.
  idType: idType('id_type'),
  idNumberEncrypted: text('id_number_encrypted'),
  idNumberHash: text('id_number_hash').unique(),
  idNumberLast4: text('id_number_last4'),

  // General users
  workType: text('work_type'),
  workDetail: text('work_detail'),

  // Staff (admin / super admin)
  employeeId: text('employee_id'),
  designation: text('designation'),
  companyId: uuid('company_id').references(() => companies.id),
  staffCode: text('staff_code').unique(), // e.g. ADM-0001, given on approval

  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  approvedById: uuid('approved_by_id'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  // Increasing this number instantly invalidates every existing login token.
  tokenVersion: integer('token_version').notNull().default(0),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [index('users_role_status_idx').on(t.role, t.status)])

export const emailTokens = pgTable('email_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: tokenPurpose('purpose').notNull(),
  tokenHash: text('token_hash').notNull().unique(), // we store a hash, never the token itself
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  // Null once the staff account that posted it has been removed.
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  category: text('category').notNull(),
  type: text('type').notNull(),
  workplace: text('workplace').notNull(),
  location: text('location').notNull(),
  experienceMin: integer('experience_min').notNull().default(0),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  vacancies: integer('vacancies').notNull().default(1),
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  description: text('description').notNull(),
  responsibilities: jsonb('responsibilities').notNull().default(sql`'[]'::jsonb`),
  requirements: jsonb('requirements').notNull().default(sql`'[]'::jsonb`),
  benefits: jsonb('benefits').notNull().default(sql`'[]'::jsonb`),
  skills: jsonb('skills').notNull().default(sql`'[]'::jsonb`),
  status: jobStatus('status').notNull().default('pending_approval'),
  reviewedById: uuid('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNote: text('review_note'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [index('jobs_status_idx').on(t.status), index('jobs_company_idx').on(t.companyId)])

export const cvs = pgTable('cvs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  photoFile: text('photo_file'),
  ...timestamps,
})

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => jobs.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  companyId: uuid('company_id').notNull().references(() => companies.id), // copied for fast analytics
  cvSnapshot: jsonb('cv_snapshot').notNull(), // the CV exactly as it was when they applied
  photoFile: text('photo_file'),
  coverLetter: text('cover_letter').notNull().default(''),
  expectedSalary: integer('expected_salary').notNull(),
  status: appStatus('status').notNull().default('submitted'),
  ...timestamps,
}, (t) => [
  uniqueIndex('applications_job_user_unique').on(t.jobId, t.userId), // one application per job per person
  index('applications_status_idx').on(t.status),
  index('applications_company_idx').on(t.companyId),
])

/** Every status change, so we have a full history (timeline) of each application. */
export const applicationEvents = pgTable('application_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  fromStatus: appStatus('from_status'),
  toStatus: appStatus('to_status').notNull(),
  note: text('note').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('application_events_app_idx').on(t.applicationId)])

export const savedJobs = pgTable('saved_jobs', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.jobId] })])

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  link: text('link'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('notifications_user_idx').on(t.userId, t.createdAt)])

/** Who did what, and when. Never updated or deleted by the app. */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  details: jsonb('details').notNull().default(sql`'{}'::jsonb`),
  ip: text('ip'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('audit_logs_created_idx').on(t.createdAt), index('audit_logs_action_idx').on(t.action)])
