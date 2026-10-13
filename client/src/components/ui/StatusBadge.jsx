const TONES = {
  submitted: 'badge-ghost',
  shortlisted: 'badge-info badge-soft',
  recommended: 'badge-secondary badge-soft',
  interview: 'badge-warning badge-soft',
  hired: 'badge-success badge-soft',
  rejected: 'badge-error badge-soft',
  pending_approval: 'badge-warning badge-soft',
  published: 'badge-success badge-soft',
  closed: 'badge-ghost',
  active: 'badge-success badge-soft',
  pending_verification: 'badge-ghost',
  suspended: 'badge-error badge-soft',
}

export default function StatusBadge({ status, label, size = '' }) {
  return <span className={`badge ${TONES[status] ?? 'badge-ghost'} ${size} whitespace-nowrap font-medium`}>{label}</span>
}
