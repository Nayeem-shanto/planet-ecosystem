import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'
import Modal from '../../components/ui/Modal'

export default function RegistrationsPage() {
  const qc = useQueryClient()
  const pending = useQuery({ queryKey: ['pending-users'], queryFn: () => api('/users/pending') })
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')

  const refresh = () => { qc.invalidateQueries({ queryKey: ['pending-users'] }); qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: ['analytics'] }) }
  const approve = useMutation({
    mutationFn: (u) => api(`/users/${u.id}/approve`, { method: 'POST' }),
    onSuccess: ({ user }) => { toast.success(`${user.name} approved as ${user.roleLabel} (${user.staffCode}). They’ve been emailed.`); refresh() },
    onError: (err) => toast.error(err.message),
  })
  const reject = useMutation({
    mutationFn: () => api(`/users/${rejecting.id}/reject`, { method: 'POST', body: { reason } }),
    onSuccess: () => { toast.success('Registration rejected. The applicant has been emailed.'); setRejecting(null); setReason(''); refresh() },
    onError: (err) => toast.error(err.fields?.reason ?? err.message),
  })

  if (pending.isPending) return <PageLoader />
  if (pending.isError) return <ErrorState error={pending.error} onRetry={pending.refetch} />
  const users = pending.data.users

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Registrations" description="Admin and super admin accounts can sign in only after you approve them. Approval gives them a staff ID." />
      {users.length === 0 ? <EmptyState icon={ShieldCheck} title="No registrations waiting">New admin and super admin registrations appear here after they confirm their email.</EmptyState> : (
        <div className="space-y-4">
          {users.map((u) => (
            <article key={u.id} className="rounded-box border border-base-300 bg-base-100 p-5">
              <div className="flex flex-wrap items-start gap-4">
                <Avatar name={u.name} size="size-12" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{u.name}</h2><span className="badge badge-primary badge-soft">{u.roleLabel}</span></div>
                  <p className="text-sm text-base-content/60">{u.designation}, {u.company?.name}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-outline btn-error" onClick={() => setRejecting(u)}>Reject</button>
                  <button className="btn btn-sm btn-primary" disabled={approve.isPending} onClick={() => approve.mutate(u)}>Approve</button>
                </div>
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                {[['Email', u.email], ['Phone', u.phone], ['Employee ID', u.employeeId], ['NID', u.idNumberMasked], ['Email confirmed', formatDateTime(u.emailVerifiedAt)], ['Registered', formatDateTime(u.createdAt)]].map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-base-content/55">{k}</dt><dd className="font-medium break-all">{v}</dd></div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      )}
      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} title={`Reject ${rejecting?.name ?? ''}`}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Reason (emailed to the applicant)</span>
          <textarea className="textarea h-28 w-full" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Employee ID could not be verified with HR." />
        </label>
        <div className="modal-action"><button className="btn btn-ghost" onClick={() => setRejecting(null)}>Cancel</button><button className="btn btn-error" disabled={reject.isPending} onClick={() => reject.mutate()}>Reject registration</button></div>
      </Modal>
    </div>
  )
}
