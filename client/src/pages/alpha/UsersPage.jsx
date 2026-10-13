import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ROLE_LABELS } from '@planet/shared'
import { useAuth } from '../../context/AuthContext'
import { useDebounce } from '../../hooks/useDebounce'
import { api, toQuery } from '../../lib/api'
import { formatDate, timeAgo } from '../../lib/format'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import Avatar from '../../components/ui/Avatar'
import Pagination from '../../components/ui/Pagination'

const STATUS_LABELS = { active: 'Active', pending_verification: 'Email not confirmed', pending_approval: 'Waiting for approval', rejected: 'Rejected', suspended: 'Suspended' }

export default function UsersPage() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [f, setF] = useState({ role: '', status: '', q: '' })
  const [page, setPage] = useState(1)
  const q = useDebounce(f.q)
  const query = useMemo(() => ({ ...f, q, page }), [f, q, page])
  const users = useQuery({ queryKey: ['users', query], queryFn: () => api(`/users${toQuery(query)}`), placeholderData: keepPreviousData })
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setPage(1) }

  const act = useMutation({
    mutationFn: ({ u, verb }) => api(`/users/${u.id}/${verb}`, { method: 'POST' }),
    onSuccess: ({ user }, { verb }) => { toast.success(`${user.name} ${verb === 'suspend' ? 'suspended and signed out' : 'reactivated'}`); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Users" description="Everyone with an account. Suspending someone signs them out immediately." />
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="input input-sm w-full max-w-xs"><Search className="size-4 opacity-55" /><input type="search" placeholder="Name, email or staff ID" value={f.q} onChange={(e) => set('q', e.target.value)} /></label>
        <select className="select select-sm w-auto" value={f.role} onChange={(e) => set('role', e.target.value)} aria-label="Role"><option value="">All roles</option>{Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select className="select select-sm w-auto" value={f.status} onChange={(e) => set('status', e.target.value)} aria-label="Status"><option value="">All statuses</option>{Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </div>
      {users.isPending ? <PageLoader /> : users.isError ? <ErrorState error={users.error} onRetry={users.refetch} /> : users.data.users.length === 0 ? <EmptyState icon={Users} title="No users match">Try another filter.</EmptyState> : (
        <div className="rounded-box border border-base-300 bg-base-100">
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>User</th><th>Role</th><th>Company</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
              <tbody>{users.data.users.map((u) => (
                <tr key={u.id}>
                  <td><div className="flex items-center gap-3"><Avatar name={u.name} size="size-9" /><div><p className="font-semibold">{u.name}</p><p className="text-xs text-base-content/55">{u.email}</p></div></div></td>
                  <td><p>{u.roleLabel}</p>{u.staffCode && u.role !== 'alpha_admin' && <p className="text-xs text-base-content/55">{u.staffCode}</p>}</td>
                  <td className="text-sm">{u.company?.name ?? '-'}</td>
                  <td><StatusBadge status={u.status} label={STATUS_LABELS[u.status]} size="badge-sm" /></td>
                  <td className="text-sm text-base-content/60">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : `Joined ${formatDate(u.createdAt)}`}</td>
                  <td className="text-right">
                    {u.id !== me.id && u.role !== 'alpha_admin' && u.status === 'active' && <button className="btn btn-ghost btn-xs text-error" onClick={() => confirm(`Suspend ${u.name}? They’ll be signed out immediately.`) && act.mutate({ u, verb: 'suspend' })}>Suspend</button>}
                    {u.status === 'suspended' && <button className="btn btn-ghost btn-xs" onClick={() => act.mutate({ u, verb: 'reactivate' })}>Reactivate</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="px-4 pb-4"><Pagination page={page} pageSize={users.data.pageSize} total={users.data.total} onChange={setPage} /></div>
        </div>
      )}
    </div>
  )
}
