import { eq } from 'drizzle-orm'
import { ROLE_LABELS } from '@planet/shared'
import { db, schema } from '../db/index.js'

/**
 * The only shape of a user that ever leaves the server.
 * No password hash, no encrypted NID, no token version.
 * The ID number is shown masked: •••••••1234
 */
export function toPublicUser(user, company = null) {
  return {
    id: user.id,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role],
    status: user.status,
    name: user.name,
    email: user.email,
    phone: user.phone,
    idType: user.idType,
    idNumberMasked: user.idNumberLast4 ? `•••••••${user.idNumberLast4}` : null,
    workType: user.workType,
    workDetail: user.workDetail,
    employeeId: user.employeeId,
    designation: user.designation,
    company: company ? { id: company.id, name: company.name } : null,
    staffCode: user.staffCode,
    approvedAt: user.approvedAt,
    rejectionReason: user.rejectionReason,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  }
}

export async function loadPublicUser(id) {
  const [row] = await db
    .select({ user: schema.users, company: schema.companies })
    .from(schema.users)
    .leftJoin(schema.companies, eq(schema.users.companyId, schema.companies.id))
    .where(eq(schema.users.id, id))
    .limit(1)
  return row ? toPublicUser(row.user, row.company) : null
}
