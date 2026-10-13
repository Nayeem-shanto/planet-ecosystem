import bcrypt from 'bcryptjs'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { ROLE_LABELS } from '@planet/shared'
import { db, schema } from '../db/index.js'
import { createToken, encrypt, keyedHash, sha256 } from '../lib/crypto.js'
import { badRequest, conflict } from '../lib/httpError.js'
import { sendMail } from '../lib/mailer.js'
import { templates } from '../lib/emailTemplates.js'

const BCRYPT_COST = 12 // ~250 ms per hash: slow for attackers, fine for users

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_COST)
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash)

// Compared against when the email doesn't exist, so a wrong email takes the
// same time as a wrong password. Otherwise response timing reveals which
// emails are registered.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', BCRYPT_COST)
export const verifyAgainstDummy = (password) => bcrypt.compare(password, DUMMY_HASH)

export async function assertUnique({ email, idType, idNumber }) {
  const [byEmail] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1)
  if (byEmail) throw conflict('An account with this email already exists. Sign in instead.', { fields: { email: 'Already registered' } })
  const [byId] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.idNumberHash, keyedHash(`${idType}:${idNumber}`)))
    .limit(1)
  if (byId) throw conflict('This ID number is already registered.', { fields: { idNumber: 'Already registered' } })
}

export function sensitiveIdColumns(idType, idNumber) {
  return {
    idType,
    idNumberEncrypted: encrypt(idNumber),
    idNumberHash: keyedHash(`${idType}:${idNumber}`),
    idNumberLast4: idNumber.slice(-4),
  }
}

/** Create a one-time email token and email the link. */
export async function issueEmailToken(user, purpose) {
  const { token, tokenHash } = createToken()
  const ttlMs = purpose === 'verify_email' ? 24 * 3600_000 : 30 * 60_000
  // Old unused tokens of the same kind stop working when a new one is issued.
  await db
    .update(schema.emailTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.emailTokens.userId, user.id), eq(schema.emailTokens.purpose, purpose), isNull(schema.emailTokens.usedAt)))
  await db.insert(schema.emailTokens).values({ userId: user.id, purpose, tokenHash, expiresAt: new Date(Date.now() + ttlMs) })

  const mail = purpose === 'verify_email' ? templates.verifyEmail({ name: user.name, token }) : templates.resetPassword({ name: user.name, token })
  await sendMail({ to: user.email, ...mail })
}

/** Find a valid, unused, unexpired token and mark it used (single use). */
export async function consumeEmailToken(token, purpose) {
  const [row] = await db
    .update(schema.emailTokens)
    .set({ usedAt: new Date() })
    .where(and(
      eq(schema.emailTokens.tokenHash, sha256(token)),
      eq(schema.emailTokens.purpose, purpose),
      isNull(schema.emailTokens.usedAt),
      gt(schema.emailTokens.expiresAt, new Date()),
    ))
    .returning()
  if (!row) throw badRequest('This link is invalid or has expired. Request a new one.', { code: 'TOKEN_INVALID' })
  return row
}

export const roleLabel = (role) => ROLE_LABELS[role]
