import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import { APP_STATUS_LABELS } from '@planet/shared'
import { useAuth } from '../../context/AuthContext'
import { useCompanies } from '../../hooks/useCompanies'
import { useDebounce } from '../../hooks/useDebounce'
import { api, toQuery } from '../../lib/api'
import { formatDate, taka } from '../../lib/format'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import Avatar from '../../components/ui/Avatar'
import MatchBadge from '../../components/jobs/MatchBadge'
import ApplicationReview from '../../components/staff/ApplicationReview'

/** One page, reused: admins review everything, super admins see the recommendation queue or all. */
export default function StaffApplicationsPage({ fixedStatus, title = 'Applications', description }) {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const companies = useCompanies()
  const [filters, setFilters] = useState({ status: fixedStatus ?? '', companyId: '', q: '', sort: 'newest' })
  const q = useDebounce(filters.q)
  const jobId = params.get('job') ?? ''
  const openId = params.get('open')

  const query = useMemo(() => ({ ...filters, q, jobId }), [filters, q, jobId])
  const apps = useQuery({ queryKey: ['staff-applications', query], queryFn: () => api(`/applications${toQuery(query)}`), placeholderData: keepPreviousData })
  const counts = useQuery({ queryKey: ['app-counts'], queryFn: () => api('/applications/summary/counts'), enabled: !fixedStatus })

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }))
  const open = (id) => setParams((p) => { p.set('open', id); return p })
  const close = () => setParams((p) => { p.delete('open'); return p })

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={title} description={description ?? 'Review candidates and move them through the hiring stages.'} />

      {!fixedStatus && (
        <div role="tablist" className="tabs tabs-border mb-4 overflow-x-auto">
          {['', ...Object.keys(APP_STATUS_LABELS)].map((s) => (
            <button key={s || 'all'} role="tab" className={`tab whitespace-nowrap ${filters.status === s ? 'tab-active' : ''}`} onClick={() => set('status', s)}>
              {s ? APP_STATUS_LABELS[s] : 'All'}
              <span className="ml-1.5 text-xs text-base-content/45">{s ? counts.data?.counts?.[s] ?? 0 : Object.values(counts.data?.counts ?? {}).reduce((a, b) => a + b, 0)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="input input-sm w-full max-w-xs">
          <Search className="size-4 opacity-55" />
          <input type="search" placeholder="Candidate, email or job" value={filters.q} onChange={(e) => set('q', e.target.value)} />
        </label>
        <select className="select select-sm w-auto" value={filters.companyId} onChange={(e) => set('companyId', e.target.value)} aria-label="Company">
          <option value="">All companies</option>
          {companies.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select select-sm w-auto" value={filters.sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="match">Best CV match</option>
          <option value="salary_low">Lowest expected salary</option>
          <option value="salary_high">Highest expected salary</option>
        </select>
        {jobId && <button className="btn btn-sm btn-ghost" onClick={() => setParams({})}>Showing one job. Show all</button>}
      </div>

      {apps.isPending ? <PageLoader /> : apps.isError ? <ErrorState error={apps.error} onRetry={apps.refetch} /> : apps.data.applications.length === 0 ? (
        <EmptyState icon={Users} title={fixedStatus === 'recommended' ? 'No recommendations waiting' : 'No applications here yet'}>
          {fixedStatus === 'recommended' ? 'When an admin recommends a candidate, it appears here for your decision.' : 'Applications appear as soon as candidates apply.'}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table">
            <thead><tr><th>Candidate</th><th>Job</th><th>Expected</th><th>Match</th><th>Status</th><th>Applied</th></tr></thead>
            <tbody>
              {apps.data.applications.map((a) => (
                <tr key={a.id} className="cursor-pointer hover:bg-base-200/70" onClick={() => open(a.id)}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={a.candidate.name} src={a.photoUrl} size="size-10" />
                      <div className="min-w-0"><p className="font-semibold">{a.candidate.name}</p><p className="max-w-56 truncate text-xs text-base-content/55">{a.headline || a.candidate.email}</p></div>
                    </div>
                  </td>
                  <td><p className="font-medium">{a.job.title}</p><p className="text-xs text-base-content/55">{a.company.name}</p></td>
                  <td className="whitespace-nowrap">{taka(a.expectedSalary)}</td>
                  <td><MatchBadge match={a.match} /></td>
                  <td><StatusBadge status={a.status} label={a.statusLabel} /></td>
                  <td className="whitespace-nowrap text-sm text-base-content/60">{formatDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ApplicationReview id={openId} role={user.role} onClose={close} />
    </div>
  )
}
