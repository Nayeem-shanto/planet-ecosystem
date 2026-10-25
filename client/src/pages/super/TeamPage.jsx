import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { formatDate, timeAgo } from '../../lib/format'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import Avatar from '../../components/ui/Avatar'
import Modal from '../../components/ui/Modal'
import StaffForm from '../../components/staff/StaffForm'

const STATUS_LABELS = { active: 'Active', suspended: 'Suspended' }

/** A super admin's admins: create, suspend, reactivate and remove them. */
export default function TeamPage() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const team = useQuery({ queryKey: ['team'], queryFn: () => api('/users/team') })
  const refresh = () => qc.invalidateQueries({ queryKey: ['team'] })

  const act = useMutation({
    mutationFn: ({ u, verb }) => api(`/users/${u.id}/${verb}`, { method: 'POST' }),
    onSuccess: ({ user }, { verb }) => { toast.success(`${user.name} ${verb === 'suspend' ? 'suspended and signed out' : 'reactivated'}`); refresh() },
    onError: (err) => toast.error(err.message),
  })
  const remove = useMutation({
    mutationFn: (u) => api(`/users/${u.id}`, { method: 'DELETE' }),
    onSuccess: (_, u) => { toast.success(`${u.name} was removed`); refresh() },
    onError: (err) => toast.error(err.message),
  })

  const closeCreate = (created) => {
    setCreating(false)
    if (created) refresh()
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="My admins"
        description={`Admins of ${me.company?.name}. Suspending someone signs them out immediately; removing deletes their account.`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}><UserPlus className="size-4" /> Create admin</button>}
      />
      {team.isPending ? <PageLoader /> : team.isError ? <ErrorState error={team.error} onRetry={team.refetch} /> : team.data.users.length === 0 ? (
        <EmptyState icon={Users} title="No admins yet">Create the first admin for {me.company?.name}.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table">
            <thead><tr><th>Admin</th><th>Designation</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
            <tbody>{team.data.users.map((u) => (
              <tr key={u.id}>
                <td><div className="flex items-center gap-3"><Avatar name={u.name} size="size-9" /><div><p className="font-semibold">{u.name}</p><p className="text-xs text-base-content/55">{u.email}{u.staffCode && ` · ${u.staffCode}`}</p></div></div></td>
                <td className="text-sm">{u.designation ?? '-'}</td>
                <td><StatusBadge status={u.status} label={STATUS_LABELS[u.status] ?? u.status} size="badge-sm" /></td>
                <td className="text-sm text-base-content/60">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : `Added ${formatDate(u.createdAt)}`}</td>
                <td className="whitespace-nowrap text-right">
                  {u.status === 'active' && <button className="btn btn-ghost btn-xs" onClick={() => confirm(`Suspend ${u.name}? They’ll be signed out immediately.`) && act.mutate({ u, verb: 'suspend' })}>Suspend</button>}
                  {u.status === 'suspended' && <button className="btn btn-ghost btn-xs" onClick={() => act.mutate({ u, verb: 'reactivate' })}>Reactivate</button>}
                  <button className="btn btn-ghost btn-xs text-error" disabled={remove.isPending} onClick={() => confirm(`Remove ${u.name} permanently? Their account is deleted and they can no longer sign in. Jobs they posted stay.`) && remove.mutate(u)}>Remove</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <Modal open={creating} onClose={() => closeCreate()} title="Create admin">
        <StaffForm role="admin" company={me.company} onDone={closeCreate} />
      </Modal>
    </div>
  )
}
