import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { JOB_STATUS_LABELS } from '@planet/shared'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { timeAgo } from '../../lib/format'
import NominationCard from '../../components/staff/NominationCard'
import StatusBadge from '../../components/ui/StatusBadge'
import Avatar from '../../components/ui/Avatar'
import PageLoader from '../../components/ui/PageLoader'

export default function AdminOverview() {
  const { user } = useAuth()
  const counts = useQuery({ queryKey: ['app-counts'], queryFn: () => api('/applications/summary/counts') })
  const jobs = useQuery({ queryKey: ['manage-jobs', ''], queryFn: () => api('/jobs/manage') })
  const recent = useQuery({ queryKey: ['staff-applications', { recent: true }], queryFn: () => api('/applications?status=submitted') })
  if (counts.isPending || jobs.isPending || recent.isPending) return <PageLoader />

  const c = counts.data?.counts ?? {}
  const myJobs = (jobs.data?.jobs ?? []).filter((j) => j.createdById === user.id)
  const tiles = [
    ['New applications to review', c.submitted ?? 0, '/admin/applications'],
    ['Shortlisted', c.shortlisted ?? 0, '/admin/applications'],
    ['Waiting for super admin', c.recommended ?? 0, '/admin/applications'],
    ['In interview stage', c.interview ?? 0, '/admin/applications'],
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <NominationCard user={user} />
      <section className="grid gap-px overflow-hidden rounded-box border border-base-300 bg-base-300 sm:grid-cols-4">
        {tiles.map(([label, value, to]) => (
          <Link key={label} to={to} className="bg-base-100 p-5 hover:bg-base-200/70"><p className="text-sm text-base-content/60">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></Link>
        ))}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-box border border-base-300 bg-base-100 p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">New applications</h2><Link to="/admin/applications" className="link text-sm text-primary">Review all</Link></div>
          {recent.data.applications.length === 0 ? <p className="py-6 text-sm text-base-content/60">Nothing new to review.</p> : (
            <ul className="divide-y divide-base-300">
              {recent.data.applications.slice(0, 6).map((a) => (
                <li key={a.id}><Link to={`/admin/applications?open=${a.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                  <Avatar name={a.candidate.name} src={a.photoUrl} size="size-9" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a.candidate.name}</p><p className="truncate text-xs text-base-content/55">{a.job.title}</p></div>
                  <span className="text-xs text-base-content/50">{timeAgo(a.createdAt)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-box border border-base-300 bg-base-100 p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">My job posts</h2><Link to="/admin/jobs" className="btn btn-primary btn-sm"><Plus className="size-4" /> New post</Link></div>
          {myJobs.length === 0 ? <p className="py-6 text-sm text-base-content/60">You haven’t posted any jobs yet.</p> : (
            <ul className="divide-y divide-base-300">
              {myJobs.slice(0, 6).map((j) => (
                <li key={j.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{j.title}</p><p className="text-xs text-base-content/55">{j.applicationCount} applicants</p></div>
                  <StatusBadge status={j.status} label={JOB_STATUS_LABELS[j.status]} size="badge-sm" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
