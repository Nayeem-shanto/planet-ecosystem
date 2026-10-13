import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { Building2, ShieldCheck, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import PageLoader from '../../components/ui/PageLoader'
import { OrbitMark } from '../../components/brand/Logo'

const count = (params) => ({ queryKey: ['users', { ...params, page: 1, count: true }], queryFn: () => api(`/users?pageSize=1&${new URLSearchParams(params)}`) })

export default function AlphaOverview() {
  const { user } = useAuth()
  const [pending, general, admins, supers, suspended, companies] = useQueries({
    queries: [
      { queryKey: ['pending-users'], queryFn: () => api('/users/pending') },
      count({ role: 'general', status: 'active' }), count({ role: 'admin', status: 'active' }), count({ role: 'super_admin', status: 'active' }),
      count({ status: 'suspended' }),
      { queryKey: ['companies'], queryFn: async () => (await api('/companies')).companies },
    ],
  })
  if ([pending, general, admins, supers, suspended, companies].some((q) => q.isPending)) return <PageLoader />
  const waiting = pending.data.users.length

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-box bg-[#0C0C0E] p-6 text-white sm:p-8">
        <OrbitMark className="pointer-events-none absolute -right-10 -top-14 size-72 opacity-25" />
        <div className="relative">
          <p className="text-sm text-white/60">Alpha admin</p>
          <h1 className="mt-1 text-3xl font-bold">Welcome, {user.name.split(' ')[0]}</h1>
          <p className="mt-2 max-w-xl text-white/70">You control who can manage hiring: approve staff registrations, manage companies and oversee all activity.</p>
          {waiting > 0 && <Link to="/alpha/registrations" className="btn btn-primary mt-5"><ShieldCheck className="size-4" /> Review {waiting} registration{waiting > 1 ? 's' : ''}</Link>}
        </div>
      </section>
      <section className="grid gap-px overflow-hidden rounded-box border border-base-300 bg-base-300 sm:grid-cols-3 lg:grid-cols-6">
        {[['Waiting for approval', waiting, '/alpha/registrations'], ['Candidates', general.data.total, '/alpha/users'], ['Admins', admins.data.total, '/alpha/users'], ['Super admins', supers.data.total, '/alpha/users'], ['Suspended', suspended.data.total, '/alpha/users'], ['Companies', companies.data.length, '/alpha/companies']].map(([label, value, to]) => (
          <Link key={label} to={to} className="bg-base-100 p-5 hover:bg-base-200/70"><p className="text-sm text-base-content/60">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></Link>
        ))}
      </section>
      <div className="grid gap-4 sm:grid-cols-3">
        {[[ShieldCheck, 'Registrations', 'Approve or reject admin and super admin accounts.', '/alpha/registrations'], [Users, 'Users', 'Search accounts, suspend or reactivate them.', '/alpha/users'], [Building2, 'Companies', 'Add and update the companies in the group.', '/alpha/companies']].map(([Icon, title, text, to]) => (
          <Link key={title} to={to} className="rounded-box border border-base-300 bg-base-100 p-5 hover:border-primary/40">
            <Icon className="mb-3 size-6 text-primary" /><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-base-content/60">{text}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
