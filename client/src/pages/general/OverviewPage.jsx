import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCV } from '../../hooks/useCV'
import { api } from '../../lib/api'
import { cvCompleteness, normalizeCV } from '../../lib/cv/model'
import { daysLeft, formatSalary } from '../../lib/format'
import CompanyMark from '../../components/ui/CompanyMark'
import MatchBadge from '../../components/jobs/MatchBadge'
import PageLoader from '../../components/ui/PageLoader'
import { OrbitMark } from '../../components/brand/Logo'

const STAGES = ['Submitted', 'Shortlisted', 'Selected for interview', 'Hired', 'Not selected']

export default function OverviewPage() {
  const { user } = useAuth()
  const cv = useCV()
  const jobs = useQuery({ queryKey: ['jobs', { sort: 'match-overview' }], queryFn: () => api('/jobs?sort=match') })
  const apps = useQuery({ queryKey: ['my-applications'], queryFn: () => api('/applications/mine') })
  if (cv.isPending || jobs.isPending || apps.isPending) return <PageLoader />

  const hasCV = Boolean(cv.data?.data?.personal?.fullName)
  const completeness = hasCV ? cvCompleteness(normalizeCV(cv.data.data), Boolean(cv.data.photoUrl)) : 0
  const list = jobs.data?.jobs ?? []
  const recommended = list.filter((j) => !j.applied).slice(0, 4)
  const closing = [...list].filter((j) => daysLeft(j.deadline) <= 10).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 4)
  const applications = apps.data?.applications ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-box bg-[#0C0C0E] p-6 text-white sm:p-8">
        <OrbitMark className="pointer-events-none absolute -right-10 -top-14 size-72 opacity-25" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Hello, {user.name.split(' ')[0]}</h1>
            <p className="mt-2 max-w-lg text-white/70">{list.length} roles are open across Planet Ecosystem. {hasCV ? 'Your CV is ready to send.' : 'Set up your CV so you can apply in one click.'}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/app/jobs" className="btn btn-primary">Browse jobs</Link>
              <Link to="/app/cv" className="btn btn-ghost border-white/25 text-white hover:bg-white/10">{hasCV ? 'Edit my CV' : 'Create my CV'}</Link>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-box bg-white/8 p-4">
            <div className="radial-progress text-[#8B7FC6]" style={{ '--value': completeness, '--size': '4.5rem', '--thickness': '6px' }} role="progressbar" aria-valuenow={completeness}>
              <span className="text-lg font-bold text-white">{completeness}%</span>
            </div>
            <div className="text-sm"><p className="font-semibold">CV completeness</p><p className="text-white/60">{completeness < 100 ? 'Complete CVs rank higher in matches.' : 'Looking complete.'}</p></div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STAGES.map((s) => (
          <Link key={s} to="/app/applications" className="rounded-box border border-base-300 bg-base-100 p-4 hover:border-primary/40">
            <p className="text-sm text-base-content/60">{s}</p>
            <p className="mt-1 text-2xl font-bold">{applications.filter((a) => a.statusLabel === s).length}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-box border border-base-300 bg-base-100 p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{jobs.data?.hasCV ? 'Best matches for your CV' : 'Latest openings'}</h2><Link to="/app/jobs" className="link text-sm text-primary">See all</Link></div>
          {recommended.length === 0 ? <p className="py-6 text-sm text-base-content/60">No new openings right now.</p> : (
            <ul className="divide-y divide-base-300">
              {recommended.map((j) => (
                <li key={j.id}><Link to={`/app/jobs?job=${j.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                  <CompanyMark name={j.company.name} size="size-10" />
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{j.title}</p><p className="truncate text-sm text-base-content/55">{j.company.name}, {formatSalary(j.salaryMin, j.salaryMax)}</p></div>
                  <MatchBadge match={j.match} />
                </Link></li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-box border border-base-300 bg-base-100 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Clock className="size-5 text-warning" /> Closing soon</h2>
          {closing.length === 0 ? <p className="text-sm text-base-content/60">No deadlines in the next 10 days.</p> : (
            <ul className="space-y-2">{closing.map((j) => (
              <li key={j.id}><Link to={`/app/jobs?job=${j.id}`} className="block rounded-lg bg-base-200 p-3 hover:bg-base-300/70">
                <p className="font-semibold">{j.title}</p><p className="text-sm text-error">{daysLeft(j.deadline)} days left</p>
              </Link></li>
            ))}</ul>
          )}
        </section>
      </div>
    </div>
  )
}
