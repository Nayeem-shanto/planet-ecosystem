import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { env, isProduction } from '../config/env.js'
import { db, schema } from '../db/index.js'
import { forbidden, unauthorized } from '../lib/httpError.js'

export const COOKIE_NAME = 'planet_session'

const cookieOptions = () => ({
  httpOnly: true, // JavaScript in the browser cannot read it, so XSS cannot steal it
  // HTTPS only in production (unless COOKIE_SECURE=false for internal HTTP testing)
  secure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProduction,
  sameSite: 'lax', // not sent on cross-site POSTs (CSRF protection, layer 1)
  path: '/',
})

export function setSessionCookie(res, user) {
  const token = jwt.sign({ sub: user.id, tv: user.tokenVersion }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${env.SESSION_HOURS}h`,
  })
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: env.SESSION_HOURS * 3600 * 1000 })
}

export const clearSessionCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions())

/**
 * Read the session cookie, verify the JWT, then load the user from the
 * database on EVERY request. That costs one fast query, but it means a
 * suspended user or a changed password takes effect immediately, which a
 * JWT alone cannot do.
 */
export async function authenticate(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) throw unauthorized()

  let payload
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch {
    clearSessionCookie(res)
    throw unauthorized('Your session has expired. Please sign in again.')
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, payload.sub)).limit(1)
  if (!user || user.tokenVersion !== payload.tv || user.status !== 'active') {
    clearSessionCookie(res)
    throw unauthorized('Your session is no longer valid. Please sign in again.')
  }
  req.user = user
  next()
}

/** Allow only the listed roles. Always used AFTER authenticate. */
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) throw forbidden()
  next()
}

export const STAFF = ['admin', 'super_admin', 'alpha_admin']
