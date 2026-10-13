import { Bookmark, MapPin } from 'lucide-react'
import CompanyMark from '../ui/CompanyMark'
import MatchBadge from './MatchBadge'
import { daysLeft, formatSalary } from '../../lib/format'

export default function JobListItem({ job, selected, onSelect }) {
  const left = daysLeft(job.deadline)
  return (
    <button type="button" onClick={() => onSelect(job.id)} aria-current={selected ? 'true' : undefined}
      className={`w-full rounded-box border bg-base-100 p-4 text-left transition-colors ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-base-300 hover:border-primary/40'}`}>
      <div className="flex gap-3">
        <CompanyMark name={job.company.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-snug">{job.title}</h3>
            {job.saved && <Bookmark className="size-4 shrink-0 fill-primary text-primary" aria-label="Saved" />}
          </div>
          <p className="truncate text-sm text-base-content/65">{job.company.name}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-base-content/55"><MapPin className="size-3.5" /> {job.location} ({job.workplace})</p>
          <p className="mt-2 text-sm font-semibold">{formatSalary(job.salaryMin, job.salaryMax)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="badge badge-sm badge-outline">{job.type}</span>
            <MatchBadge match={job.match} />
            {job.applied && <span className="badge badge-sm badge-primary">Applied</span>}
            <span className={`ml-auto text-xs ${left <= 5 ? 'font-semibold text-error' : 'text-base-content/50'}`}>{left} days left</span>
          </div>
        </div>
      </div>
    </button>
  )
}
