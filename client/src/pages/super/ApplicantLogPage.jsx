import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Download, ScrollText, Search } from 'lucide-react'
import { APP_STATUS_LABELS, WORK_TYPES } from '@planet/shared'
import { useCompanies } from '../../hooks/useCompanies'
import { useDebounce } from '../../hooks/useDebounce'
import { api, toQuery } from '../../lib/api'
import { formatDate, taka } from '../../lib/format'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import Pagination from '../../components/ui/Pagination'

const workLabel = Object.fromEntries(WORK_TYPES.map((w) => [w.value, w.label]))

export default function ApplicantLogPage() {
  const companies = useCompanies()
  const [f, setF] = useState({ companyId: '', status: '', q: '', minSalary: '', maxSalary: '' })
  const [page, setPage] = useState(1)
  const q = useDebounce(f.q)
  const query = useMemo(() => ({ ...f, q, page }), [f, q, page])
  const log = useQuery({ queryKey: ['applicant-log', query], queryFn: () => api(`/analytics/applicants${toQuery(query)}`), placeholderData: keepPreviousData })
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setPage(1) }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Applicant log"
        description="Every application in one table: who applied, where, and what salary they expect."
        actions={<a className="btn btn-outline" href={`/api/analytics/applicants.csv${toQuery({ ...f, q })}`}><Download className="size-4" /> Export CSV</a>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="input input-sm w-full max-w-xs"><Search className="size-4 opacity-55" /><input type="search" placeholder="Name, email or job" value={f.q} onChange={(e) => set('q', e.target.value)} /></label>
        <select className="select select-sm w-auto" value={f.companyId} onChange={(e) => set('companyId', e.target.value)} aria-label="Company">
          <option value="">All companies</option>{companies.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select select-sm w-auto" value={f.status} onChange={(e) => set('status', e.target.value)} aria-label="Status">
          <option value="">All statuses</option>{Object.entries(APP_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="number" className="input input-sm w-36" placeholder="Min salary" value={f.minSalary} onChange={(e) => set('minSalary', e.target.value)} aria-label="Minimum expected salary" />
        <input type="number" className="input input-sm w-36" placeholder="Max salary" value={f.maxSalary} onChange={(e) => set('maxSalary', e.target.value)} aria-label="Maximum expected salary" />
      </div>
      {log.isPending ? <PageLoader /> : log.isError ? <ErrorState error={log.error} onRetry={log.refetch} /> : log.data.rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="No applications match">Try removing a filter.</EmptyState>
      ) : (
        <div className="rounded-box border border-base-300 bg-base-100">
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Applied</th><th>Candidate</th><th>Type</th><th>Job</th><th>Company (office)</th><th className="text-right">Expected salary</th><th>Status</th></tr></thead>
              <tbody>{log.data.rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-base-content/65">{formatDate(r.appliedAt)}</td>
                  <td><p className="font-medium">{r.candidateName}</p><p className="text-xs text-base-content/50">{r.candidateEmail}, {r.candidatePhone}</p></td>
                  <td>{workLabel[r.workType] ?? '-'}</td>
                  <td><p>{r.jobTitle}</p><p className="text-xs text-base-content/50">{r.category}</p></td>
                  <td><p>{r.company}</p><p className="text-xs text-base-content/50">{r.location}</p></td>
                  <td className="whitespace-nowrap text-right font-medium">{taka(r.expectedSalary)}</td>
                  <td><StatusBadge status={r.status} label={r.statusLabel} size="badge-sm" /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="px-4 pb-4"><Pagination page={page} pageSize={log.data.pageSize} total={log.data.total} onChange={setPage} /></div>
        </div>
      )}
    </div>
  )
}
