import { z } from 'zod'
import { ID_TYPES, JOB_CATEGORIES, JOB_TYPES, WORKPLACES, WORK_TYPE_VALUES } from './constants.js'

const trimmed = (label, max = 120) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} is too long`)

export const emailField = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address'))

/** Bangladeshi mobile numbers: 01XXXXXXXXX, optionally with +88 / 88. */
export const phoneField = z
  .string({ error: 'Phone number is required' })
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^(?:\+?88)?01[3-9]\d{8}$/, 'Enter a valid Bangladeshi mobile number, e.g. 01712345678'))

export const passwordField = z
  .string({ error: 'Password is required' })
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters') // bcrypt ignores bytes after 72
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number')

/** NID: 10, 13 or 17 digits. Birth certificate: 17 digits. */
const idNumberField = z.string({ error: 'ID number is required' }).trim().regex(/^\d+$/, 'Use digits only')

const withIdRules = (schema) =>
  schema.superRefine((data, ctx) => {
    const len = data.idNumber?.length ?? 0
    const ok = data.idType === 'birth_certificate' ? len === 17 : [10, 13, 17].includes(len)
    if (!ok) {
      ctx.addIssue({
        code: 'custom',
        path: ['idNumber'],
        message: data.idType === 'birth_certificate' ? 'Birth certificate numbers have 17 digits' : 'NID numbers have 10, 13 or 17 digits',
      })
    }
  })

const confirmMatches = (schema) =>
  schema.refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })

const generalBase = z.object({
  name: trimmed('Name', 100),
  email: emailField,
  phone: phoneField,
  idType: z.enum(ID_TYPES.map((t) => t.value)),
  idNumber: idNumberField,
  workType: z.enum(WORK_TYPE_VALUES, { error: 'Choose what describes you' }),
  workDetail: trimmed('This field', 160),
  password: passwordField,
  confirmPassword: z.string(),
})

export const generalRegisterSchema = confirmMatches(withIdRules(generalBase))

const staffBase = z.object({
  name: trimmed('Name', 100),
  email: emailField,
  phone: phoneField,
  employeeId: trimmed('Employee ID', 40),
  idType: z.literal('nid').default('nid'),
  idNumber: idNumberField,
  companyId: z.uuid('Choose your company'),
  designation: trimmed('Designation', 80),
  password: passwordField,
  confirmPassword: z.string(),
})

export const staffRegisterSchema = confirmMatches(withIdRules(staffBase))

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['general', 'admin', 'super_admin', 'alpha_admin']),
})

export const forgotPasswordSchema = z.object({ email: emailField })
export const resetPasswordSchema = confirmMatches(
  z.object({ token: z.string().min(20), password: passwordField, confirmPassword: z.string() }),
)

const lines = z.array(z.string().trim().min(1).max(300)).max(20)

export const jobSchema = z
  .object({
    companyId: z.uuid('Choose a company'),
    title: trimmed('Job title', 120),
    category: z.enum(JOB_CATEGORIES),
    type: z.enum(JOB_TYPES),
    workplace: z.enum(WORKPLACES),
    location: trimmed('Location', 120),
    experienceMin: z.coerce.number().int().min(0).max(40),
    salaryMin: z.coerce.number().int().min(0).max(10_000_000).nullable().optional(),
    salaryMax: z.coerce.number().int().min(0).max(10_000_000).nullable().optional(),
    vacancies: z.coerce.number().int().min(1).max(500),
    deadline: z.coerce.date({ error: 'Set a deadline' }),
    description: z.string().trim().min(30, 'Write at least 30 characters').max(5000),
    responsibilities: lines,
    requirements: lines,
    benefits: lines,
    skills: z.array(z.string().trim().min(1).max(40)).max(30),
  })
  .refine((j) => !j.salaryMin || !j.salaryMax || j.salaryMin <= j.salaryMax, {
    path: ['salaryMax'],
    message: 'Maximum must be at least the minimum',
  })
  .refine((j) => j.deadline > new Date(), { path: ['deadline'], message: 'The deadline must be in the future' })

export const applicationSchema = z.object({
  jobId: z.uuid(),
  expectedSalary: z.coerce.number({ error: 'Enter your expected monthly salary' }).int().min(0).max(10_000_000),
  coverLetter: z.string().trim().max(3000).optional().default(''),
})

const cvText = (max = 200) => z.string().trim().max(max).optional().default('')
export const cvSchema = z.object({
  personal: z.object({
    fullName: cvText(100), title: cvText(100), email: cvText(120), phone: cvText(30),
    address: cvText(200), linkedin: cvText(200), website: cvText(200), summary: cvText(2000),
    dateOfBirth: cvText(20), nationality: cvText(60),
  }),
  experience: z.array(z.object({
    id: z.string(), role: cvText(120), company: cvText(120), location: cvText(120),
    start: cvText(10), end: cvText(10), current: z.boolean().default(false), details: cvText(3000),
  })).max(30),
  education: z.array(z.object({
    id: z.string(), degree: cvText(150), institution: cvText(150), start: cvText(10), end: cvText(10), result: cvText(60),
  })).max(20),
  skills: z.array(z.string().trim().max(60)).max(60),
  languages: z.array(z.string().trim().max(40)).max(20),
  certifications: z.array(z.object({ id: z.string(), name: cvText(150), issuer: cvText(150), year: cvText(10) })).max(30),
  references: z.array(z.object({ id: z.string(), name: cvText(100), relation: cvText(120), contact: cvText(120) })).max(5).default([]),
})

export const companySchema = z.object({
  name: trimmed('Company name', 120),
  industry: trimmed('Industry', 80),
  location: trimmed('Location', 120),
  about: z.string().trim().max(1500).optional().default(''),
  website: z.union([z.literal(''), z.url('Enter a full URL starting with https://')]).optional().default(''),
})

/** Turn a ZodError into { field: message } for forms and API responses. */
export function fieldErrors(error) {
  const out = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    out[key] ??= issue.message
  }
  return out
}
