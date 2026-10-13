import { eq } from 'drizzle-orm'
import { emailField, passwordField } from '@planet/shared'
import { db, pool, schema } from '../src/db/index.js'
import { hashPassword } from '../src/services/auth.js'

/**
 * Creates (or resets the password of) the alpha admin account.
 * Reads ALPHA_ADMIN_NAME / ALPHA_ADMIN_EMAIL / ALPHA_ADMIN_PASSWORD from server/.env.
 * After running it, REMOVE ALPHA_ADMIN_PASSWORD from .env.
 */
const name = process.env.ALPHA_ADMIN_NAME?.trim() || 'Alpha Admin'
const email = emailField.safeParse(process.env.ALPHA_ADMIN_EMAIL ?? '')
const password = passwordField.safeParse(process.env.ALPHA_ADMIN_PASSWORD ?? '')

if (!email.success || !password.success) {
  console.error('\n❌ Set ALPHA_ADMIN_EMAIL and ALPHA_ADMIN_PASSWORD in server/.env first.')
  console.error('   Password: at least 8 characters with a letter and a number (use a long one).\n')
  process.exit(1)
}

const passwordHash = await hashPassword(password.data)
const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email.data)).limit(1)

if (existing && existing.role !== 'alpha_admin') {
  console.error(`\n❌ ${email.data} already belongs to a ${existing.role} account. Use a different email.\n`)
  process.exit(1)
}

if (existing) {
  await db.update(schema.users)
    .set({ name, passwordHash, status: 'active', tokenVersion: existing.tokenVersion + 1 })
    .where(eq(schema.users.id, existing.id))
  console.log(`\n✅ Alpha admin password reset for ${email.data}.`)
} else {
  await db.insert(schema.users).values({
    role: 'alpha_admin', status: 'active', name, email: email.data, phone: '', passwordHash,
    staffCode: 'ALPHA', emailVerifiedAt: new Date(), approvedAt: new Date(),
  })
  console.log(`\n✅ Alpha admin created: ${email.data}`)
}
console.log('   Sign in at /login and choose "Alpha admin".')
console.log('   🔒 Now delete ALPHA_ADMIN_PASSWORD from server/.env.\n')
await pool.end()
