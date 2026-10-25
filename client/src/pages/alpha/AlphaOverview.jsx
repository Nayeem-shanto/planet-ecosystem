import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Building2, Gauge, ShieldCheck, Trophy, TrendingDown, UserMinus, UserPlus, Zap } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import PageLoader from '../../components/ui/PageLoader'
import Modal from '../../components/ui/Modal'
import { OrbitMark } from '../../components/brand/Logo'
import StaffForm from '../../components/staff/StaffForm'

const count = (params) => ({ queryKey: ['users', { ...params, page: 1, count: true }], queryFn: () => api(`/users?pageSize=1&${new URLSearchParams(params)}`) })
const rate = (hired, applied) => (applied ? `${Math.round((hired / applied) * 100)}%` : '-')
const days = (d) => (d == null ? '-' : `${d} day${d === 1 ? '' : 's'}`)

function Highlight({ icon: Icon, label, company, detail, tone }) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-5">
      <p className="flex items-center gap-2 text-sm text-base-content/60"><Icon className={`size-4 ${tone}`} />{label}</p>
      <p className="mt-2 truncate text-lg font-bold">{company?.name ?? 'Not enough data'}</p>
      <p className="mt-0.5 text-sm text-base-content/60">{company ? detail(company) : 'Shows up once candidates are hired.'}</p>
    </div>
  )
}

export default function AlphaOverview() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [hiring, pending, general, admins, supers, companies] = useQueries({
    queries: [
      { queryKey: ['analytics', 'hiring'], queryFn: () => api('/analytics/hiring') },
      { queryKey: ['pending-users'], queryFn: () => api('/users/pending') },
      count({ role: 'general', status: 'active' }), count({ role: 'admin', status: 'active' }), count({ role: 'super_admin', status: 'active' }),
      { queryKey: ['companies'], queryFn: async () => (await api('/companies')).companies },
    ],
  })
  if ([hiring, pending, general, admins, supers, companies].some((q) => q.isPending)) return <PageLoader />
  const waiting = pending.data?.users.length ?? 0
  const { totals, byCompany } = hiring.data ?? { totals: {}, byCompany: [] }

  // Companies that have hired someone, for the "most / fewest / fastest / slowest" cards.
  const hiringCompanies = byCompany.filter((c) => c.hired > 0)
  const most = hiringCompanies[0]
  const fewest = hiringCompanies.length > 1 ? hiringCompanies.at(-1) : undefined
  const bySpeed = hiringCompanies.filter((c) => c.avgDaysToHire != null).sort((a, b) => a.avgDaysToHire - b.avgDaysToHire)
  const fastest = bySpeed[0]
  const slowest = bySpeed.length > 1 ? bySpeed.at(-1) : undefined

  const closeCreate = (created) => {
    setCreating(false)
    if (created) qc.invalidateQueries({ queryKey: ['users'] })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-box bg-[#0C0C0E] p-6 text-white sm:p-8">
        <OrbitMark className="pointer-events-none absolute -right-10 -top-14 size-72 opacity-25" />
        <div className="relative">
          <p className="text-sm text-white/60">Alpha admin</p>
          <h1 className="mt-1 text-3xl font-bold">Welcome, {user.name.split(' ')[0]}</h1>
          <p className="mt-2 max-w-xl text-white/70">See how hiring is going across the group, and manage who runs it.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={() => setCreating(true)}><UserPlus className="size-4" /> Create super admin</button>
            {waiting > 0 && <Link to="/alpha/registrations" className="btn btn-outline border-white/30 text-white hover:bg-white/10"><ShieldCheck className="size-4" /> Review {waiting} registration{waiting > 1 ? 's' : ''}</Link>}
          </div>
        </div>
      </section>

      {hiring.isError ? (
        <div role="alert" className="alert alert-error alert-soft text-sm">Hiring figures could not be loaded: {hiring.error.message}</div>
      ) : (
        <>
          <section className="grid gap-px overflow-hidden rounded-box border border-base-300 bg-base-300 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Total applied', totals.applications, `${totals.applicants} candidates`],
              ['Hired', totals.hired, `${totals.hiredLast30Days} in the last 30 days`],
              ['Hire rate', rate(totals.hired, totals.applications), 'of all applications'],
              ['Avg. time to hire', days(totals.avgDaysToHire), 'from applying to hired'],
              ['In interview', totals.interview, 'waiting for a decision'],
              ['Open jobs', totals.openJobs, 'published, before deadline'],
            ].map(([label, value, sub]) => (
              <div key={label} className="bg-base-100 p-5">
                <p className="text-sm text-base-content/60">{label}</p>
                <p className="mt-1 text-3xl font-bold">{value}</p>
                <p className="mt-1 text-xs text-base-content/50">{sub}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Highlight icon={Trophy} tone="text-success" label="Most hires" company={most} detail={(c) => `${c.hired} hired of ${c.applications} applied`} />
            <Highlight icon={TrendingDown} tone="text-warning" label="Fewest hires" company={fewest} detail={(c) => `${c.hired} hired of ${c.applications} applied`} />
            <Highlight icon={Zap} tone="text-primary" label="Fastest hiring" company={fastest} detail={(c) => `${days(c.avgDaysToHire)} on average`} />
            <Highlight icon={Gauge} tone="text-error" label="Slowest hiring" company={slowest} detail={(c) => `${days(c.avgDaysToHire)} on average`} />
          </section>

          <section className="rounded-box border border-base-300 bg-base-100">
            <h2 className="px-5 pt-5 font-semibold">Hiring by company</h2>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Company</th><th className="text-right">Applied</th><th className="text-right">In interview</th><th className="text-right">Hired</th><th className="text-right">Hire rate</th><th className="text-right">Avg. time to hire</th><th className="text-right">Open jobs</th></tr></thead>
                <tbody>{byCompany.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td className="text-right tabular-nums">{c.applications}</td>
                    <td className="text-right tabular-nums">{c.interview}</td>
                    <td className="text-right tabular-nums font-semibold">{c.hired}</td>
                    <td className="text-right tabular-nums">{rate(c.hired, c.applications)}</td>
                    <td className="text-right tabular-nums">{days(c.avgDaysToHire)}</td>
                    <td className="text-right tabular-nums">{c.openJobs}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="grid gap-px overflow-hidden rounded-box border border-base-300 bg-base-300 sm:grid-cols-4">
        {[['Candidates', general.data?.total, '/alpha/users'], ['Admins', admins.data?.total, '/alpha/users'], ['Super admins', supers.data?.total, '/alpha/users'], ['Companies', companies.data?.length, '/alpha/companies']].map(([label, value, to]) => (
          <Link key={label} to={to} className="bg-base-100 p-5 hover:bg-base-200/70"><p className="text-sm text-base-content/60">{label}</p><p className="mt-1 text-3xl font-bold">{value ?? '-'}</p></Link>
        ))}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button onClick={() => setCreating(true)} className="rounded-box border border-base-300 bg-base-100 p-5 text-left hover:border-primary/40">
          <UserPlus className="mb-3 size-6 text-primary" /><p className="font-semibold">Create super admin</p><p className="mt-1 text-sm text-base-content/60">Add a super admin for a company. The account is active right away.</p>
        </button>
        {[[UserMinus, 'Manage staff', 'Suspend or remove admins and super admins.', '/alpha/users'], [Building2, 'Companies', 'Add and update the companies in the group.', '/alpha/companies'], [BarChart3, 'Insights', 'Charts on applications, salaries and jobs.', '/alpha/insights']].map(([Icon, title, text, to]) => (
          <Link key={title} to={to} className="rounded-box border border-base-300 bg-base-100 p-5 hover:border-primary/40">
            <Icon className="mb-3 size-6 text-primary" /><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-base-content/60">{text}</p>
          </Link>
        ))}
      </div>

      <Modal open={creating} onClose={() => closeCreate()} title="Create super admin">
        <StaffForm role="super_admin" onDone={closeCreate} />
      </Modal>
    </div>
  )
}
