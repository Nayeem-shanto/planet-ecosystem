import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserCog, UserPlus } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { BRAND, CHART_COLORS } from '../../lib/brand'
import { taka } from '../../lib/format'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import ErrorState from '../../components/ui/ErrorState'
import NominationCard from '../../components/staff/NominationCard'
import StaffForm from '../../components/staff/StaffForm'
import Modal from '../../components/ui/Modal'

function Panel({ title, children, className = '' }) {
  return <section className={`rounded-box border border-base-300 bg-base-100 p-5 ${className}`}><h2 className="mb-4 font-bold">{title}</h2>{children}</section>
}
const tooltipStyle = { contentStyle: { borderRadius: 10, border: '1px solid #e6e3f1', fontSize: 12 } }
const axis = { fontSize: 11, fill: '#8a879a' }

function Empty() {
  return <p className="grid h-56 place-items-center text-sm text-base-content/50">No applications in this period yet.</p>
}

export default function InsightsPage() {
  const { user } = useAuth()
  const [days, setDays] = useState(90)
  const data = useQuery({ queryKey: ['analytics', days], queryFn: () => api(`/analytics/overview?days=${days}`) })
  const isSuper = user.role === 'super_admin'
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const team = useQuery({ queryKey: ['team'], queryFn: () => api('/users/team'), enabled: isSuper })
  const closeCreate = (created) => {
    setCreating(false)
    if (created) qc.invalidateQueries({ queryKey: ['team'] })
  }

  if (data.isPending) return <PageLoader />
  if (data.isError) return <ErrorState error={data.error} onRetry={data.refetch} />
  const d = data.data
  const k = d.kpis
  const hasData = k.applications > 0

  const todo = isSuper
    ? [['Job posts to approve', k.jobApprovals, '/super/job-approvals'], ['Recommendations to decide', k.recommendations, '/super/recommendations']]
    : [['Registrations to approve', k.registrations, '/alpha/registrations']]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {isSuper && user.staffCode && <NominationCard user={user} />}
      {isSuper && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => setCreating(true)} className="rounded-box border border-base-300 bg-base-100 p-5 text-left hover:border-primary/40">
            <UserPlus className="mb-3 size-6 text-primary" /><p className="font-semibold">Create admin</p><p className="mt-1 text-sm text-base-content/60">Add an admin to {user.company?.name}. The account is active right away.</p>
          </button>
          <Link to="/super/team" className="rounded-box border border-base-300 bg-base-100 p-5 hover:border-primary/40">
            <UserCog className="mb-3 size-6 text-primary" /><p className="font-semibold">My admins{team.data && ` (${team.data.users.length})`}</p><p className="mt-1 text-sm text-base-content/60">Suspend, reactivate or remove the admins of your company.</p>
          </Link>
          <Modal open={creating} onClose={() => closeCreate()} title="Create admin">
            <StaffForm role="admin" company={user.company} onDone={closeCreate} />
          </Modal>
        </div>
      )}
      <PageHeader
        title="Hiring insights"
        description="Where people apply, what they expect to earn, and how the pipeline is moving."
        actions={<select className="select select-sm" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">
          <option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 12 months</option>
        </select>}
      />

      <section className="grid gap-px overflow-hidden rounded-box border border-base-300 bg-base-300 sm:grid-cols-2 lg:grid-cols-5">
        {[['Applications', k.applications], ['Unique applicants', k.applicants], ['Average expected salary', taka(k.avgExpectedSalary)], ['Hired', k.hired], ['Live job posts', k.publishedJobs]].map(([label, value]) => (
          <div key={label} className="bg-base-100 p-5"><p className="text-sm text-base-content/60">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
        ))}
      </section>

      {todo.some(([, n]) => n > 0) && (
        <div className="flex flex-wrap gap-3">
          {todo.filter(([, n]) => n > 0).map(([label, n, to]) => (
            <Link key={label} to={to} className="flex items-center gap-3 rounded-box border border-warning/40 bg-warning/10 px-4 py-3 text-sm hover:bg-warning/15">
              <span className="text-lg font-bold">{n}</span> {label}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Applications by company">
          {!hasData ? <Empty /> : (
            <ResponsiveContainer width="100%" height={Math.max(220, d.byCompany.length * 48)}>
              <BarChart data={d.byCompany} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="#eceaf4" />
                <XAxis type="number" allowDecimals={false} tick={axis} />
                <YAxis type="category" dataKey="company" width={150} tick={axis} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, 'Applications']} />
                <Bar dataKey="applications" fill={BRAND.purple} radius={[0, 6, 6, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Expected monthly salary">
          {!hasData ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.bySalary} margin={{ right: 8 }}>
                <CartesianGrid vertical={false} stroke="#eceaf4" />
                <XAxis dataKey="bucket" tick={axis} />
                <YAxis allowDecimals={false} tick={axis} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, 'Applicants']} />
                <Bar dataKey="applications" fill={BRAND.purpleLight} radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Applications per day (last 30 days)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={d.timeline} margin={{ right: 8 }}>
              <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={BRAND.purple} stopOpacity={0.35} /><stop offset="1" stopColor={BRAND.purple} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#eceaf4" />
              <XAxis dataKey="day" tick={axis} tickFormatter={(v) => v.slice(5)} minTickGap={24} />
              <YAxis allowDecimals={false} tick={axis} />
              <Tooltip {...tooltipStyle} formatter={(v) => [v, 'Applications']} />
              <Area type="monotone" dataKey="applications" stroke={BRAND.purple} strokeWidth={2} fill="url(#area)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Who is applying">
          {!hasData ? <Empty /> : (
            <div className="flex flex-wrap items-center gap-6">
              <PieChart width={200} height={200}>
                  <Pie data={d.byWorkType} dataKey="applicants" nameKey="workType" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {d.byWorkType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
              </PieChart>
              <ul className="space-y-1.5 text-sm">
                {d.byWorkType.map((w, i) => <li key={w.workType} className="flex items-center gap-2"><span className="size-3 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />{w.workType}<span className="ml-auto pl-4 font-semibold">{w.applicants}</span></li>)}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Hiring pipeline">
          <ul className="space-y-3">
            {d.pipeline.map((p) => {
              const max = Math.max(1, ...d.pipeline.map((x) => x.n))
              return (
                <li key={p.status}>
                  <div className="mb-1 flex justify-between text-sm"><span>{p.label}</span><span className="font-semibold">{p.n}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-base-200"><div className="h-full rounded-full bg-primary" style={{ width: `${(p.n / max) * 100}%` }} /></div>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title="Average expected salary by company">
          {!hasData ? <Empty /> : (
            <table className="table table-sm">
              <thead><tr><th>Company</th><th className="text-right">Applications</th><th className="text-right">Avg. expected</th><th className="text-right">Hired</th></tr></thead>
              <tbody>{d.byCompany.map((c) => <tr key={c.company}><td>{c.company}</td><td className="text-right">{c.applications}</td><td className="text-right">{taka(c.avgExpectedSalary)}</td><td className="text-right">{c.hired}</td></tr>)}</tbody>
            </table>
          )}
        </Panel>

        <Panel title="Most applied jobs">
          {d.topJobs.length === 0 ? <Empty /> : (
            <ol className="space-y-2">{d.topJobs.map((j, i) => (
              <li key={`${j.title}-${i}`} className="flex items-center gap-3 rounded-lg bg-base-200 px-3 py-2 text-sm">
                <span className="grid size-6 place-items-center rounded-full bg-accent text-xs font-bold text-accent-content">{i + 1}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{j.title}</span><span className="block truncate text-xs text-base-content/55">{j.company}</span></span>
                <span className="font-semibold">{j.applications}</span>
              </li>
            ))}</ol>
          )}
        </Panel>
      </div>
    </div>
  )
}
