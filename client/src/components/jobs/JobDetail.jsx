import { ArrowLeft, Bookmark, Check } from 'lucide-react'
import CompanyMark from '../ui/CompanyMark'
import CompanyCard from './CompanyCard'
import MatchBadge from './MatchBadge'
import { daysLeft, formatDate, formatSalary } from '../../lib/format'

function List({ title, items }) {
  if (!items?.length) return null
  return (
    <section className="mt-7">
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <ul className="space-y-1.5">{items.map((i) => <li key={i} className="flex gap-2.5 text-base-content/85"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />{i}</li>)}</ul>
    </section>
  )
}

export default function JobDetail({ job, onApply, onToggleSave, onBack }) {
  const closed = daysLeft(job.deadline) <= 0
  const facts = [
    ['Salary', formatSalary(job.salaryMin, job.salaryMax)],
    ['Experience', job.experienceMin > 0 ? `${job.experienceMin}+ years` : 'Not required'],
    ['Vacancies', job.vacancies],
    ['Deadline', formatDate(job.deadline)],
  ]
  return (
    <div className="@container">
      <div className="grid gap-5 @3xl:grid-cols-[minmax(0,1fr)_260px] @2xl:grid-cols-[minmax(0,1fr)_240px]">
        <article className="@container/a min-w-0 rounded-box border border-base-300 bg-base-100 p-5 sm:p-7">
          {onBack && <button className="btn btn-ghost btn-sm -ml-2 mb-4 xl:hidden" onClick={onBack}><ArrowLeft className="size-4" /> All jobs</button>}
          <div className="flex flex-wrap items-start gap-4">
            <CompanyMark name={job.company.name} size="size-14" />
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold leading-tight">{job.title}</h2>
              <p className="mt-1 text-base-content/65">{job.company.name}, {job.location}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[job.type, job.workplace, job.category].map((t) => <span key={t} className="badge badge-outline">{t}</span>)}
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={onApply} disabled={job.applied || closed}>
              {job.applied ? <><Check className="size-4" /> Applied</> : closed ? 'Applications closed' : 'Apply now'}
            </button>
            <button className={`btn ${job.saved ? 'btn-secondary' : 'btn-outline'}`} onClick={onToggleSave} aria-pressed={job.saved}>
              <Bookmark className={`size-4 ${job.saved ? 'fill-current' : ''}`} /> {job.saved ? 'Saved' : 'Save'}
            </button>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-box border border-base-300 bg-base-300 @lg/a:grid-cols-4">
            {facts.map(([k, v]) => <div key={k} className="bg-base-100 p-3"><dt className="text-xs text-base-content/55">{k}</dt><dd className="mt-0.5 text-sm font-semibold">{v}</dd></div>)}
          </dl>
          {job.match && (
            <div className="mt-6 rounded-box bg-base-200 p-4">
              <div className="flex items-center justify-between gap-2"><p className="font-semibold">How your CV fits</p><MatchBadge match={job.match} size="badge-md" /></div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job.match.matchedSkills.map((s) => <span key={s} className="badge badge-success badge-soft">✓ {s}</span>)}
                {job.match.missingSkills.map((s) => <span key={s} className="badge badge-ghost text-base-content/55">{s}</span>)}
              </div>
              {job.match.missingSkills.length > 0 && <p className="mt-2 text-xs text-base-content/55">Grey skills aren’t on your CV. If you have them, add them to your CV.</p>}
            </div>
          )}
          <section className="mt-7">
            <h3 className="mb-2 text-lg font-semibold">About the role</h3>
            <p className="max-w-prose whitespace-pre-line leading-relaxed text-base-content/85">{job.description}</p>
          </section>
          <List title="What you’ll do" items={job.responsibilities} />
          <List title="What we’re looking for" items={job.requirements} />
          <List title="Benefits" items={job.benefits} />
          {job.skills?.length > 0 && (
            <section className="mt-7"><h3 className="mb-2 text-lg font-semibold">Skills</h3>
              <div className="flex flex-wrap gap-1.5">{job.skills.map((s) => <span key={s} className="badge badge-lg bg-base-200">{s}</span>)}</div>
            </section>
          )}
        </article>
        <div className="@2xl:sticky @2xl:top-24 @2xl:self-start"><CompanyCard company={job.company} /></div>
      </div>
    </div>
  )
}
