import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { formatDate, taka } from '../../lib/format'
import PageHeader from '../../components/ui/PageHeader'
import CompanyMark from '../../components/ui/CompanyMark'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import StatusBadge from '../../components/ui/StatusBadge'

const TABS = ['All', 'Submitted', 'Shortlisted', 'Selected for interview', 'Hired', 'Not selected']

export default function ApplicationsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('All')
  const apps = useQuery({ queryKey: ['my-applications'], queryFn: () => api('/applications/mine') })
  const withdraw = useMutation({
    mutationFn: (id) => api(`/applications/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Application withdrawn'); qc.invalidateQueries({ queryKey: ['my-applications'] }); qc.invalidateQueries({ queryKey: ['jobs'] }) },
    onError: (err) => toast.error(err.message),
  })

  if (apps.isPending) return <PageLoader />
  if (apps.isError) return <ErrorState error={apps.error} onRetry={apps.refetch} />
  const all = apps.data.applications
  const rows = tab === 'All' ? all : all.filter((a) => a.statusLabel === tab)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="My applications" description="Every change is also emailed to you." />
      <div role="tablist" className="tabs tabs-border mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} role="tab" className={`tab whitespace-nowrap ${tab === t ? 'tab-active' : ''}`} onClick={() => setTab(t)}>
            {t}<span className="ml-1.5 text-xs text-base-content/45">{t === 'All' ? all.length : all.filter((a) => a.statusLabel === t).length}</span>
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Inbox} title={tab === 'All' ? 'You haven’t applied to any jobs yet' : `Nothing marked “${tab}”`} action={<Link to="/app/jobs" className="btn btn-primary btn-sm">Browse jobs</Link>}>
          Applications you send appear here with their progress.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="rounded-box border border-base-300 bg-base-100 p-5">
              <div className="flex flex-wrap items-center gap-4">
                <CompanyMark name={a.company.name} />
                <div className="min-w-0 flex-1">
                  <Link to={`/app/jobs?job=${a.job.id}`} className="font-semibold hover:underline">{a.job.title}</Link>
                  <p className="text-sm text-base-content/60">{a.company.name}. Applied {formatDate(a.createdAt)}. Expected {taka(a.expectedSalary)}</p>
                </div>
                <StatusBadge status={a.status === 'recommended' ? 'shortlisted' : a.status} label={a.statusLabel} />
                {a.status === 'submitted' && (
                  <button className="btn btn-ghost btn-sm text-error" onClick={() => confirm('Withdraw this application?') && withdraw.mutate(a.id)}>Withdraw</button>
                )}
              </div>
              <ol className="mt-4 flex flex-wrap items-center gap-y-2 text-xs">
                {a.timeline.map((step, i) => (
                  <li key={step.label} className="flex items-center">
                    {i > 0 && <span className="mx-2 h-px w-6 bg-base-300" />}
                    <span className="rounded-full bg-base-200 px-2.5 py-1"><span className="font-medium">{step.label}</span> <span className="text-base-content/50">{formatDate(step.at)}</span></span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
