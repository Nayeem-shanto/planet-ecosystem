/**
 * Values used by BOTH the client and the server.
 * Keeping them in one package means the dropdown on a form and the rule the
 * server enforces can never disagree.
 */

export const ROLES = {
  GENERAL: 'general',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  ALPHA_ADMIN: 'alpha_admin',
}

export const ROLE_LABELS = {
  general: 'General',
  admin: 'Admin',
  super_admin: 'Super admin',
  alpha_admin: 'Alpha admin',
}

/** Roles that can sign up from the public registration page. */
export const SELF_REGISTER_ROLES = ['general', 'admin', 'super_admin']
/** Roles whose accounts must be approved by the alpha admin. */
export const STAFF_ROLES = ['admin', 'super_admin']

export const USER_STATUS = {
  PENDING_VERIFICATION: 'pending_verification', // email not confirmed yet
  PENDING_APPROVAL: 'pending_approval', // staff waiting for the alpha admin
  ACTIVE: 'active',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
}

export const WORK_TYPES = [
  { value: 'student', label: 'Student', detailLabel: 'Institution' },
  { value: 'employee', label: 'Employee', detailLabel: 'Organization and position' },
  { value: 'alumni', label: 'Alumni', detailLabel: 'Institution and passing year' },
  { value: 'job_seeker', label: 'Job seeker', detailLabel: 'Field or position you want' },
  { value: 'nurse', label: 'Nurse', detailLabel: 'Hospital or registration number' },
  { value: 'doctor', label: 'Doctor', detailLabel: 'Specialty and BMDC registration number' },
  { value: 'other', label: 'Other', detailLabel: 'Describe your work' },
]
export const WORK_TYPE_VALUES = WORK_TYPES.map((w) => w.value)

export const ID_TYPES = [
  { value: 'nid', label: 'National ID (NID)' },
  { value: 'birth_certificate', label: 'Birth certificate' },
]

export const JOB_CATEGORIES = [
  'Software & IT', 'Engineering', 'Healthcare', 'Operations', 'Finance & Accounts',
  'Human Resources', 'Sales & Marketing', 'Administration', 'Research', 'Other',
]
export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship']
export const WORKPLACES = ['On-site', 'Hybrid', 'Remote']

export const JOB_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  CLOSED: 'closed',
}

export const JOB_STATUS_LABELS = {
  pending_approval: 'Waiting for approval',
  published: 'Published',
  rejected: 'Not approved',
  closed: 'Closed',
}

/**
 * The hiring pipeline.
 *   submitted → shortlisted → recommended → interview → hired
 *                     any active stage → rejected
 */
export const APP_STATUS = {
  SUBMITTED: 'submitted',
  SHORTLISTED: 'shortlisted',
  RECOMMENDED: 'recommended',
  INTERVIEW: 'interview',
  HIRED: 'hired',
  REJECTED: 'rejected',
}

/** Labels staff see. */
export const APP_STATUS_LABELS = {
  submitted: 'Submitted',
  shortlisted: 'Shortlisted',
  recommended: 'Recommended to super admin',
  interview: 'Selected for interview',
  hired: 'Hired',
  rejected: 'Rejected',
}

/**
 * What candidates see. Internal steps (recommended) are hidden, so candidates
 * are never told about a decision that hasn't been made yet.
 */
export const CANDIDATE_STATUS_LABELS = {
  submitted: 'Submitted',
  shortlisted: 'Shortlisted',
  recommended: 'Shortlisted',
  interview: 'Selected for interview',
  hired: 'Hired',
  rejected: 'Not selected',
}

/**
 * Who may move an application from one status to another.
 * The server checks every status change against this table.
 */
export const APP_TRANSITIONS = {
  admin: {
    submitted: ['shortlisted', 'rejected'],
    shortlisted: ['recommended', 'rejected'],
    interview: ['hired', 'rejected'],
  },
  super_admin: {
    recommended: ['interview', 'rejected'],
  },
}

export const PASSWORD_RULES = 'At least 8 characters, with a letter and a number'
