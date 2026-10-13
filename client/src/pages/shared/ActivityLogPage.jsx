import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { History, Search } from 'lucide-react'
import { api, toQuery } from '../../lib/api'
import { useDebounce } from '../../hooks/useDebounce'
import { formatDateTime } from '../../lib/format'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'

const GROUPS = [['', 'All activity'], ['auth', 'Sign-ins'], ['user', 'Accounts'], ['job', 'Job posts'], ['application', 'Applications'], ['company', 'Companies'], ['cv', 'CVs']]

/** Turn "application.shortlisted" into a readable sentence. */
function describe(log) {
  const d = log.details ?? {}
  const map = {
    'auth.login': 'Signed in',
    'auth.login_failed': `Failed sign-in attempt for ${d.email ?? 'unknown email'}`,
    'auth.password_changed': 'Changed their password',
    'auth.password_reset': 'Reset their password',
    'user.registered': 'Registered an account',
    'user.email_verified': 'Confirmed their email',
    'user.approved': `Approved ${d.name} (${d.staffCode})`,
    'user.rejected': `Rejected ${d.name}: ${d.reason}`,
    'user.suspended': `Suspended ${d.name}`,
    'user.reactivated': `Reactivated ${d.name}`,
    'user.profile_updated': 'Updated their profile',
    'job.created': `Created job “${d.title}”`,
    'job.updated': `Edited job “${d.title}”${d.sentForReview ? ' (sent for approval)' : ''}`,
    'job.approved': `Approved job “${d.title}”`,
    'job.rejected': `Rejected job “${d.title}”`,
    'job.closed': `Closed job “${d.title}”`,
    'job.reopened': `Reopened job “${d.title}”`,
    'job.deleted': `Deleted job “${d.title}”`,
    'application.submitted': `Applied for ${d.job} at ${d.company}`,
    'application.withdrawn': 'Withdrew an application',
    'cv.saved': 'Saved their CV',
    'company.created': `Added company ${d.name}`,
    'company.updated': `Updated company ${d.name}`,
    'company.activated': `Activated company ${d.name}`,
    'company.deactivated': `Deactivated company ${d.name}`,
  }
  if (map[log.action]) return map[log.action]
  if (log.action.startsWith('application.')) return `Moved ${d.candidate} (${d.job}) to ${d.to}${d.note ? `: “${d.note}”` : ''}`
  return log.action
}

export default function ActivityLogPage() {
  const [action, setAction] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounce(q)
  const logs = useQuery({ queryKey: ['audit', action, search, page], queryFn: () => api(`/audit${toQuery({ action, q: search, page })}`), placeholderData: keepPreviousData })

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Activity log" description="Every important action, who did it and when. Entries can’t be edited or deleted." />
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="select select-sm w-auto" value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }} aria-label="Type">
          {GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="input input-sm w-full max-w-xs"><Search className="size-4 opacity-55" /><input type="search" placeholder="Person’s name" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} /></label>
      </div>
      {logs.isPending ? <PageLoader /> : logs.isError ? <ErrorState error={logs.error} onRetry={logs.refetch} /> : logs.data.logs.length === 0 ? (
        <EmptyState icon={History} title="No activity matches">Try another filter.</EmptyState>
      ) : (
        <div className="rounded-box border border-base-300 bg-base-100">
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>When</th><th>Who</th><th>What happened</th><th>IP address</th></tr></thead>
              <tbody>
                {logs.data.logs.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-base-content/65">{formatDateTime(l.createdAt)}</td>
                    <td><p className="font-medium">{l.actorName ?? 'Unknown'}</p><p className="text-xs text-base-content/50">{l.actorRole?.replace('_', ' ')}</p></td>
                    <td className={l.action === 'auth.login_failed' ? 'text-warning' : ''}>{describe(l)}</td>
                    <td className="font-mono text-xs text-base-content/50">{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4"><Pagination page={page} pageSize={logs.data.pageSize} total={logs.data.total} onChange={setPage} /></div>
        </div>
      )}
    </div>
  )
}
