import { db, schema } from '../db/index.js'

/**
 * Record an important action. Called from route handlers.
 * Never let an audit failure break the actual request, but always report it.
 */
export async function audit(req, action, { entityType, entityId, details = {} } = {}, tx = db) {
  try {
    await tx.insert(schema.auditLogs).values({
      actorId: req.user?.id ?? details.actorId ?? null,
      actorRole: req.user?.role ?? details.actorRole ?? null,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      details,
      ip: req.ip,
    })
  } catch (err) {
    console.error('Audit log failed:', action, err.message)
  }
}
