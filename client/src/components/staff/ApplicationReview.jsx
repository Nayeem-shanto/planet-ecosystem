import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { APP_TRANSITIONS, WORK_TYPES } from '@planet/shared'
import Modal from '../ui/Modal'
import PageLoader from '../ui/PageLoader'
import ErrorState from '../ui/ErrorState'
import StatusBadge from '../ui/StatusBadge'
import CVPreview from '../cv/CVPreview'
import MatchBadge from '../jobs/MatchBadge'
import { api } from '../../lib/api'
import { formatDateTime, formatSalary, taka } from '../../lib/format'
import { normalizeCV } from '../../lib/cv/model'

/** Buttons for each possible next step. Which ones appear depends on role + status. */
const ACTIONS = {
  shortlisted: { label: 'Shortlist', className: 'btn-info' },
  recommended: { label: 'Recommend to super admin', className: 'btn-secondary', needsNote: true },
  interview: { label: 'Approve for interview', className: 'btn-primary' },
  hired: { label: 'Mark as hired', className: 'btn-success' },
  rejected: { label: 'Reject', className: 'btn-error btn-outline' },
}

export default function ApplicationReview({ id, role, onClose }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(null)
  const detail = useQuery({ queryKey: ['application', id], queryFn: () => api(`/applications/${id}`), enabled: Boolean(id) })

  const change = useMutation({
    mutationFn: (status) => api(`/applications/${id}/status`, { method: 'POST', body: { status, note } }),
    onSuccess: ({ application }) => {
      toast.success(`Moved to “${application.statusLabel}”`)
      setNote(''); setPending(null)
      qc.invalidateQueries({ queryKey: ['application', id] })
      qc.invalidateQueries({ queryKey: ['staff-applications'] })
      qc.invalidateQueries({ queryKey: ['app-counts'] })
    },
    onError: (err) => toast.error(err.fields?.note ?? err.message),
  })

  const a = detail.data?.application
  const next = a ? APP_TRANSITIONS[role]?.[a.status] ?? [] : []
  const workType = a && WORK_TYPES.find((w) => w.value === a.candidate.workType)?.label

  return (
    <Modal open={Boolean(id)} onClose={onClose} title={a ? `${a.candidate.name}, for ${a.job.title}` : 'Application'} size="max-w-6xl">
      {detail.isPending && <PageLoader />}
      {detail.isError && <ErrorState error={detail.error} onRetry={detail.refetch} />}
      {a && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="max-h-[72vh] overflow-y-auto rounded-box bg-base-300/60 p-3 thin-scroll sm:p-5">
            <CVPreview cv={normalizeCV(a.cv)} photoUrl={a.photoUrl} />
          </div>

          <div className="space-y-4">
            <div className="rounded-box border border-base-300 p-4">
              <div className="flex items-center justify-between gap-2"><StatusBadge status={a.status} label={a.statusLabel} /><MatchBadge match={a.match} /></div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-base-content/60">Company</dt><dd className="text-right font-medium">{a.company.name}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-base-content/60">Expected salary</dt><dd className="font-medium">{taka(a.expectedSalary)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-base-content/60">Offered range</dt><dd className="text-right">{formatSalary(a.job.salaryMin, a.job.salaryMax)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-base-content/60">Candidate type</dt><dd className="text-right">{workType}{a.candidate.workDetail && `, ${a.candidate.workDetail}`}</dd></div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <a href={`mailto:${a.candidate.email}`} className="btn btn-ghost btn-xs"><Mail className="size-3.5" /> {a.candidate.email}</a>
                <a href={`tel:${a.candidate.phone}`} className="btn btn-ghost btn-xs"><Phone className="size-3.5" /> {a.candidate.phone}</a>
              </div>
            </div>

            {a.coverLetter && (
              <div className="rounded-box border border-base-300 p-4">
                <p className="mb-1 text-sm font-semibold">Cover letter</p>
                <p className="whitespace-pre-line text-sm text-base-content/80">{a.coverLetter}</p>
              </div>
            )}

            {next.length > 0 ? (
              <div className="rounded-box border border-primary/30 bg-accent/40 p-4">
                <p className="mb-2 text-sm font-semibold">Next step</p>
                <textarea className="textarea textarea-sm mb-3 h-20 w-full" value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder={next.includes('recommended') ? 'Why do you recommend this candidate? (required to recommend)' : 'Note for the record (optional)'} />
                <div className="flex flex-wrap gap-2">
                  {next.map((s) => (
                    <button key={s} className={`btn btn-sm ${ACTIONS[s].className}`} disabled={change.isPending}
                      onClick={() => {
                        if (ACTIONS[s].needsNote && note.trim().length < 5) return toast.error('Write a short note for the super admin first.')
                        if (s === 'rejected' && pending !== 'rejected') return setPending('rejected')
                        change.mutate(s)
                      }}>
                      {change.isPending && change.variables === s && <span className="loading loading-spinner loading-xs" />}
                      {s === 'rejected' && pending === 'rejected' ? 'Confirm reject' : ACTIONS[s].label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-base-content/55">The candidate is emailed when their visible status changes.</p>
              </div>
            ) : (
              <p className="rounded-box bg-base-200 p-4 text-sm text-base-content/65">
                {a.status === 'recommended' && role === 'admin' ? 'Waiting for a super admin to review your recommendation.' :
                  ['hired', 'rejected'].includes(a.status) ? 'This application is closed.' : 'No action needed from you at this stage.'}
              </p>
            )}

            <div className="rounded-box border border-base-300 p-4">
              <p className="mb-3 text-sm font-semibold">History</p>
              <ol className="relative space-y-4 border-l border-base-300 pl-4">
                {a.history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" />
                    <p className="text-sm font-medium">{h.toLabel}</p>
                    <p className="text-xs text-base-content/55">{h.actorName ?? 'System'}, {formatDateTime(h.at)}</p>
                    {h.note && <p className="mt-1 rounded bg-base-200 px-2 py-1 text-xs">{h.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
