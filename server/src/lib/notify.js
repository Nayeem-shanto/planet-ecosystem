import { and, eq, inArray } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { sendMail } from './mailer.js'

/**
 * Tell users something happened: an in-app notification, and optionally an email.
 * recipients: array of { id, email }.
 */
export async function notify(recipients, { title, body = '', link = null, email = null }) {
  const list = recipients.filter(Boolean)
  if (!list.length) return
  await db.insert(schema.notifications).values(list.map((u) => ({ userId: u.id, title, body, link })))
  if (email) {
    // Fire and forget: the HTTP response shouldn't wait for the mail server.
    for (const u of list) void sendMail({ to: u.email, ...email })
  }
}

/** All active users with one of the given roles (e.g. every super admin). */
export function activeUsersWithRole(roles) {
  return db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
    .from(schema.users)
    .where(and(inArray(schema.users.role, roles), eq(schema.users.status, 'active')))
}
