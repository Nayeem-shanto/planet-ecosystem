import { ipKeyGenerator, rateLimit } from 'express-rate-limit'

const message = (text) => ({ message: text })

/** Slows down password guessing. Counts attempts per IP + email. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  // ipKeyGenerator groups IPv6 addresses by network, so attackers can't rotate addresses to bypass the limit.
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${String(req.body?.email ?? '').toLowerCase()}`,
  message: message('Too many sign-in attempts. Wait 15 minutes and try again.'),
})

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many registrations from this network. Try again later.'),
})

/** For "email me a link" endpoints, so they can't be used to spam inboxes. */
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many requests. Try again in an hour.'),
})

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many requests. Slow down and try again shortly.'),
})
