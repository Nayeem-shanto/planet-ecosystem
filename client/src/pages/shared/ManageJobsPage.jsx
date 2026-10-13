import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { JOB_STATUS_LABELS } from '@planet/shared'
import { useAuth } from '../../context/AuthContext'
import { useCompanies } from '../../hooks/useCompanies'
import { api, toQuery } from '../../lib/api'
import { daysLeft, formatDate } from '../../lib/format'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import CompanyMark from '../../components/ui/CompanyMark'
import JobFormModal from '../../components/staff/JobFormModal'

export default function ManageJobsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const companies = useCompanies()
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(undefined) // undefined: closed, null: new, object: edit
  const jobs = useQuery({ queryKey: ['manage-jobs', status], queryFn: () => api(`/jobs/manage${toQuery({ status })}`) })
  const base = user.role === 'admin' ? '/admin' : '/super'

  const rows = useMemo(() => (jobs.data?.jobs ?? []).filter((j) => j.title.toLowerCase().includes(q.toLowerCase())), [jobs.data, q])
  const refresh = () => { qc.invalidateQueries({ queryKey: ['manage-jobs'] }); qc.invalidateQueries({ queryKey: ['jobs'] }) }

  const action = useMutation({
    mutationFn: ({ job, verb }) => api(`/jobs/${job.id}${verb === 'delete' ? '' : `/${verb}`}`, { method: verb === 'delete' ? 'DELETE' : 'POST' }),
    onSuccess: (_, { verb }) => { toast.success({ close: 'Job closed', reopen: 'Job reopened', delete: 'Job deleted' }[verb]); refresh() },
    onError: (err) => toast.error(err.message),
  })

  async function save(values) {
    if (editing) await api(`/jobs/${editing.id}`, { method: 'PATCH', body: values })
    else await api('/jobs', { method: 'POST', body: values })
    toast.success(user.role === 'admin' ? 'Sent to a super admin for approval' : editing ? 'Job updated' : 'Job published')
    setEditing(undefined)
    refresh()
  }

  if (jobs.isError) return <ErrorState error={jobs.error} onRetry={jobs.refetch} />

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Job posts"
        description={user.role === 'admin' ? 'New posts and edits go to a super admin for approval before they’re public.' : 'All job posts across Planet Ecosystem.'}
        actions={<button className="btn btn-primary" onClick={() => setEditing(null)} disabled={!companies.data?.length}><Plus className="size-4" /> New job post</button>}
      />
      <div role="tablist" className="tabs tabs-border mb-4 overflow-x-auto">
        {['', 'pending_approval', 'published', 'rejected', 'closed'].map((s) => (
          <button key={s || 'all'} role="tab" className={`tab whitespace-nowrap ${status === s ? 'tab-active' : ''}`} onClick={() => setStatus(s)}>{s ? JOB_STATUS_LABELS[s] : 'All'}</button>
        ))}
      </div>
      <label className="input input-sm mb-4 w-full max-w-xs"><Search className="size-4 opacity-55" /><input type="search" placeholder="Search titles" value={q} onChange={(e) => setQ(e.target.value)} /></label>

      {jobs.isPending ? <PageLoader /> : rows.length === 0 ? (
        <EmptyState icon={Briefcase} title="No job posts here" action={<button className="btn btn-primary btn-sm" onClick={() => setEditing(null)}>Create a job post</button>}>Create a post and it will appear here.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table">
            <thead><tr><th>Job</th><th>Status</th><th>Deadline</th><th>Applicants</th><th>Posted by</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {rows.map((job) => {
                const left = daysLeft(job.deadline)
                return (
                  <tr key={job.id} className="hover:bg-base-200/60">
                    <td>
                      <div className="flex items-center gap-3">
                        <CompanyMark name={job.company.name} size="size-9" />
                        <div><p className="font-semibold">{job.title}</p><p className="text-xs text-base-content/55">{job.company.name}, {job.type}</p></div>
                      </div>
                      {job.status === 'rejected' && job.reviewNote && <p className="mt-1 max-w-sm text-xs text-error">Reason: {job.reviewNote}</p>}
                    </td>
                    <td><StatusBadge status={job.status} label={JOB_STATUS_LABELS[job.status]} /></td>
                    <td className="whitespace-nowrap">{formatDate(job.deadline)}<br /><span className={`text-xs ${left <= 0 ? 'text-error' : 'text-base-content/55'}`}>{left > 0 ? `${left} days left` : 'Expired'}</span></td>
                    <td><Link to={`${base}/applications?job=${job.id}`} className="link link-primary">{job.applicationCount}</Link></td>
                    <td className="text-sm text-base-content/70">{job.createdByName}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {job.status === 'published' && <button className="btn btn-ghost btn-xs" onClick={() => action.mutate({ job, verb: 'close' })}>Close</button>}
                        {job.status === 'closed' && <button className="btn btn-ghost btn-xs" onClick={() => action.mutate({ job, verb: 'reopen' })}>Reopen</button>}
                        <button className="btn btn-ghost btn-xs btn-square" onClick={() => setEditing(job)} aria-label={`Edit ${job.title}`}><Pencil className="size-4" /></button>
                        {job.applicationCount === 0 && <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => confirm(`Delete “${job.title}”?`) && action.mutate({ job, verb: 'delete' })} aria-label={`Delete ${job.title}`}><Trash2 className="size-4" /></button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {editing !== undefined && companies.data && (
        <JobFormModal key={editing?.id ?? 'new'} job={editing} companies={companies.data} role={user.role} onClose={() => setEditing(undefined)} onSubmit={save} />
      )}
    </div>
  )
}
