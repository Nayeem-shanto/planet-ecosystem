import { Router } from 'express'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import {
  forgotPasswordSchema, generalRegisterSchema, loginSchema, passwordField, resetPasswordSchema, ROLE_LABELS,
} from '@planet/shared'
import { db, schema } from '../db/index.js'
import { authenticate, clearSessionCookie, setSessionCookie } from '../middleware/auth.js'
import { emailLimiter, loginLimiter, registerLimiter } from '../middleware/rateLimit.js'
import { validate } from '../middleware/validate.js'
import { forbidden, unauthorized } from '../lib/httpError.js'
import { audit } from '../lib/audit.js'
import { activeUsersWithRole, notify } from '../lib/notify.js'
import { sendMail } from '../lib/mailer.js'
import { templates } from '../lib/emailTemplates.js'
import {
  assertUnique, consumeEmailToken, hashPassword, issueEmailToken, sensitiveIdColumns, verifyAgainstDummy, verifyPassword,
} from '../services/auth.js'
import { loadPublicUser } from '../services/users.js'

const router = Router()

/* ---------------- Registration ---------------- */

router.post('/register/general', registerLimiter, validate(generalRegisterSchema), async (req, res) => {
  const data = req.body
  await assertUnique(data)
  const [user] = await db.insert(schema.users).values({
    role: 'general',
    status: 'pending_verification',
    name: data.name,
    email: data.email,
    phone: data.phone,
    passwordHash: await hashPassword(data.password),
    workType: data.workType,
    workDetail: data.workDetail,
    ...sensitiveIdColumns(data.idType, data.idNumber),
  }).returning()

  await issueEmailToken(user, 'verify_email')
  await audit(req, 'user.registered', { entityType: 'user', entityId: user.id, details: { actorId: user.id, actorRole: 'general' } })
  res.status(201).json({
    message: 'Registration successful. We sent a confirmation link to your email. Confirm it, then sign in.',
    email: user.email,
  })
})

/* ---------------- Email verification ---------------- */

router.post('/verify-email', validate(z.object({ token: z.string().min(20) })), async (req, res) => {
  const token = await consumeEmailToken(req.body.token, 'verify_email')
  const [current] = await db.select().from(schema.users).where(eq(schema.users.id, token.userId)).limit(1)
  if (!current || current.status !== 'pending_verification') {
    return res.json({ message: 'Your email is already confirmed.', status: current?.status })
  }

  const isStaff = current.role === 'admin' || current.role === 'super_admin'
  const [user] = await db
    .update(schema.users)
    .set({ emailVerifiedAt: new Date(), status: isStaff ? 'pending_approval' : 'active' })
    .where(eq(schema.users.id, current.id))
    .returning()

  if (isStaff) {
    void sendMail({ to: user.email, ...templates.staffPending({ name: user.name, roleLabel: ROLE_LABELS[user.role] }) })
    const alphas = await activeUsersWithRole(['alpha_admin'])
    await notify(alphas, {
      title: `New ${ROLE_LABELS[user.role]} registration`,
      body: `${user.name} is waiting for approval.`,
      link: '/alpha/registrations',
    })
  }
  await audit(req, 'user.email_verified', { entityType: 'user', entityId: user.id, details: { actorId: user.id, actorRole: user.role } })
  res.json({
    status: user.status,
    message: isStaff
      ? 'Email confirmed. Your account is now waiting for alpha admin approval.'
      : 'Email confirmed. You can sign in now.',
  })
})

router.post('/resend-verification', emailLimiter, validate(forgotPasswordSchema), async (req, res) => {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, req.body.email)).limit(1)
  if (user?.status === 'pending_verification') await issueEmailToken(user, 'verify_email')
  // Same answer either way, so this can't be used to discover registered emails.
  res.json({ message: 'If that account is waiting for confirmation, we sent a new link.' })
})

/* ---------------- Login / logout ---------------- */

const STATUS_MESSAGES = {
  pending_verification: { code: 'EMAIL_NOT_VERIFIED', message: 'Confirm your email first. Check your inbox for the confirmation link.' },
  pending_approval: { code: 'PENDING_APPROVAL', message: 'Your account is waiting for alpha admin approval. We will email you once it is reviewed.' },
  rejected: { code: 'REJECTED', message: 'Your registration was not approved. Contact your HR team for details.' },
  suspended: { code: 'SUSPENDED', message: 'Your account is suspended. Contact your HR team.' },
}

router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)

  const valid = user ? await verifyPassword(password, user.passwordHash) : await verifyAgainstDummy(password)
  if (!user || !valid) {
    await audit(req, 'auth.login_failed', { details: { email } })
    throw unauthorized('Email or password is incorrect.')
  }
  if (user.status !== 'active') throw forbidden(STATUS_MESSAGES[user.status].message, { code: STATUS_MESSAGES[user.status].code })

  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id))
  setSessionCookie(res, user)
  req.user = user
  await audit(req, 'auth.login', { entityType: 'user', entityId: user.id })
  res.json({ user: await loadPublicUser(user.id) })
})

router.post('/logout', (req, res) => {
  clearSessionCookie(res)
  res.json({ message: 'Signed out.' })
})

router.get('/me', authenticate, async (req, res) => {
  res.json({ user: await loadPublicUser(req.user.id) })
})

/* ---------------- Passwords ---------------- */

router.post('/forgot-password', emailLimiter, validate(forgotPasswordSchema), async (req, res) => {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.email, req.body.email), eq(schema.users.status, 'active')))
    .limit(1)
  if (user) await issueEmailToken(user, 'reset_password')
  res.json({ message: 'If an active account uses that email, we sent a password reset link.' })
})

router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  const token = await consumeEmailToken(req.body.token, 'reset_password')
  const [current] = await db.select().from(schema.users).where(eq(schema.users.id, token.userId)).limit(1)
  const [user] = await db
    .update(schema.users)
    // tokenVersion + 1 signs the user out everywhere, in case the old password was stolen.
    .set({ passwordHash: await hashPassword(req.body.password), tokenVersion: current.tokenVersion + 1 })
    .where(eq(schema.users.id, token.userId))
    .returning()
  void sendMail({ to: user.email, ...templates.passwordChanged({ name: user.name }) })
  await audit(req, 'auth.password_reset', { entityType: 'user', entityId: user.id, details: { actorId: user.id, actorRole: user.role } })
  res.json({ message: 'Password updated. Sign in with your new password.' })
})

const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password'), password: passwordField, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })

router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res) => {
  if (!(await verifyPassword(req.body.currentPassword, req.user.passwordHash))) {
    throw badRequest('Your current password is incorrect.', { fields: { currentPassword: 'Incorrect password' } })
  }
  const [user] = await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(req.body.password), tokenVersion: req.user.tokenVersion + 1 })
    .where(eq(schema.users.id, req.user.id))
    .returning()
  setSessionCookie(res, user) // keep THIS device signed in; all others are signed out
  void sendMail({ to: user.email, ...templates.passwordChanged({ name: user.name }) })
  await audit(req, 'auth.password_changed', { entityType: 'user', entityId: user.id })
  res.json({ message: 'Password changed. Other devices have been signed out.' })
})

export default router
