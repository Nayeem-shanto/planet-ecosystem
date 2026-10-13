import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { formatDate, formatSalary, timeAgo } from '../../lib/format'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import CompanyMark from '../../components/ui/CompanyMark'

function ReviewCard({ job }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [expanded, setExpanded] = useState(false)
  const review = useMutation({
    mutationFn: (decision) => api(`/jobs/${job.id}/review`, { method: 'POST', body: { decision, note } }),
    onSuccess: (_, decision) => {
      toast.success(decision === 'approve' ? `Published “${job.title}”` : 'Sent back to the admin with your reason')
      qc.invalidateQueries({ queryKey: ['manage-jobs'] }); qc.invalidateQueries({ queryKey: ['analytics'] }); qc.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (err) => toast.error(err.fields?.note ?? err.message),
  })

  return (
    <article className="rounded-box border border-base-300 bg-base-100 p-5">
      <div className="flex flex-wrap items-start gap-4">
        <CompanyMark name={job.company.name} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">{job.title}</h2>
          <p className="text-sm text-base-content/60">{job.company.name}, {job.location}. {job.type}, {job.workplace}</p>
          <p className="mt-1 text-sm">{formatSalary(job.salaryMin, job.salaryMax)}. {job.vacancies} vacancies. Deadline {formatDate(job.deadline)}</p>
          <p className="mt-1 text-xs text-base-content/50">Submitted by {job.createdByName}, {timeAgo(job.updatedAt)}</p>
        </div>
      </div>
      <button className="link mt-3 text-sm text-primary" onClick={() => setExpanded((e) => !e)}>{expanded ? 'Hide details' : 'Read full post'}</button>
      {expanded && (
        <div className="mt-3 space-y-3 rounded-lg bg-base-200 p-4 text-sm">
          <p className="whitespace-pre-line">{job.description}</p>
          {[['Responsibilities', job.responsibilities], ['Requirements', job.requirements], ['Benefits', job.benefits]].map(([t, items]) => items.length > 0 && (
            <div key={t}><p className="font-semibold">{t}</p><ul className="ml-5 list-disc">{items.map((i) => <li key={i}>{i}</li>)}</ul></div>
          ))}
          {job.skills.length > 0 && <p><span className="font-semibold">Skills:</span> {job.skills.join(', ')}</p>}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <input className="input input-sm min-w-60 flex-1" placeholder="Note to the admin (required if not approving)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn btn-sm btn-outline btn-error" disabled={review.isPending} onClick={() => review.mutate('reject')}>Don’t approve</button>
        <button className="btn btn-sm btn-primary" disabled={review.isPending} onClick={() => review.mutate('approve')}>Approve and publish</button>
      </div>
    </article>
  )
}

export default function JobApprovalsPage() {
  const jobs = useQuery({ queryKey: ['manage-jobs', 'pending_approval'], queryFn: () => api('/jobs/manage?status=pending_approval') })
  if (jobs.isPending) return <PageLoader />
  if (jobs.isError) return <ErrorState error={jobs.error} onRetry={jobs.refetch} />
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Job approvals" description="Posts from admins go live only after you approve them." />
      {jobs.data.jobs.length === 0 ? <EmptyState icon={ClipboardCheck} title="Nothing waiting for approval">New and edited job posts from admins will appear here.</EmptyState> : (
        <div className="space-y-4">{jobs.data.jobs.map((j) => <ReviewCard key={j.id} job={j} />)}</div>
      )}
    </div>
  )
}
