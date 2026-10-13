export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

export function timeAgo(value) {
  const minutes = Math.floor((Date.now() - new Date(value)) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return days === 1 ? 'Yesterday' : `${days} days ago`
  return formatDate(value)
}

export const daysLeft = (deadline) => Math.ceil((new Date(deadline) - Date.now()) / 86_400_000)

export const taka = (n) => (n || n === 0 ? `৳${Number(n).toLocaleString('en-IN')}` : '')

export function formatSalary(min, max) {
  if (!min && !max) return 'Negotiable'
  if (min && max) return `${taka(min)} – ${taka(max)}`
  return min ? `From ${taka(min)}` : `Up to ${taka(max)}`
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

export const splitList = (text = '') => text.split(/[\n,•]+/).map((s) => s.trim()).filter(Boolean)
export const splitLines = (text = '') => text.split('\n').map((s) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
