import { MapPin, Search } from 'lucide-react'
import { JOB_CATEGORIES, JOB_TYPES, WORKPLACES } from '@planet/shared'

export const DEFAULT_FILTERS = { q: '', location: '', category: '', types: [], workplace: '', maxExperience: '', saved: false, sort: 'newest' }

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'match', label: 'Best match for my CV' },
  { value: 'salary', label: 'Highest salary' },
  { value: 'deadline', label: 'Deadline soonest' },
]

export default function JobFilters({ filters, onChange, hasCV, count, loading }) {
  const set = (key, value) => onChange({ ...filters, [key]: value })
  const toggleType = (t) => set('types', filters.types.includes(t) ? filters.types.filter((x) => x !== t) : [...filters.types, t])

  return (
    <div className="space-y-3">
      <div className="grid gap-2 rounded-box border border-base-300 bg-base-100 p-2 md:grid-cols-[1.4fr_1fr_auto]">
        <label className="input w-full border-0 bg-transparent shadow-none">
          <Search className="size-4 opacity-55" />
          <input type="search" placeholder="Job title, skill or company" value={filters.q} onChange={(e) => set('q', e.target.value)} aria-label="Search jobs" />
        </label>
        <label className="input w-full border-0 bg-transparent shadow-none md:rounded-none md:border-l md:border-base-300">
          <MapPin className="size-4 opacity-55" />
          <input type="search" placeholder="City or area" value={filters.location} onChange={(e) => set('location', e.target.value)} aria-label="Location" />
        </label>
        <select className="select w-full md:w-60" value={filters.sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort">
          {SORTS.map((s) => <option key={s.value} value={s.value} disabled={s.value === 'match' && !hasCV}>{s.label}{s.value === 'match' && !hasCV ? ' (add skills to your CV)' : ''}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select className="select select-sm w-auto" value={filters.category} onChange={(e) => set('category', e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {JOB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="select select-sm w-auto" value={filters.workplace} onChange={(e) => set('workplace', e.target.value)} aria-label="Workplace">
          <option value="">Any workplace</option>
          {WORKPLACES.map((w) => <option key={w}>{w}</option>)}
        </select>
        <select className="select select-sm w-auto" value={filters.maxExperience} onChange={(e) => set('maxExperience', e.target.value)} aria-label="Experience">
          <option value="">Any experience</option>
          <option value="0">No experience needed</option>
          {[1, 2, 3, 5].map((n) => <option key={n} value={n}>Up to {n} year{n > 1 ? 's' : ''}</option>)}
        </select>
        <div className="join">
          {JOB_TYPES.map((t) => (
            <input key={t} type="checkbox" aria-label={t} checked={filters.types.includes(t)} onChange={() => toggleType(t)}
              className="btn btn-sm join-item border-base-300 bg-base-100 font-medium checked:border-primary checked:bg-primary checked:text-primary-content" />
          ))}
        </div>
        <label className="label cursor-pointer gap-2 text-sm">
          <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={filters.saved} onChange={(e) => set('saved', e.target.checked)} />
          Saved only
        </label>
        <span className="ml-auto flex items-center gap-2 text-sm text-base-content/60">
          {loading && <span className="loading loading-spinner loading-xs" />}
          {count} {count === 1 ? 'job' : 'jobs'}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => onChange(DEFAULT_FILTERS)}>Clear</button>
      </div>
    </div>
  )
}
