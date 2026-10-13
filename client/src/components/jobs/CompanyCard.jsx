import { Globe } from 'lucide-react'
import CompanyMark from '../ui/CompanyMark'

export default function CompanyCard({ company }) {
  return (
    <aside className="rounded-box border border-base-300 bg-base-100 p-5">
      <h3 className="mb-4 text-sm font-semibold text-base-content/55">About the company</h3>
      <div className="flex items-center gap-3">
        <CompanyMark name={company.name} size="size-12" />
        <div className="min-w-0">
          <p className="font-bold leading-tight">{company.name}</p>
          <p className="text-sm text-base-content/60">{company.industry}</p>
        </div>
      </div>
      {company.about && <p className="mt-4 text-sm leading-relaxed text-base-content/80">{company.about}</p>}
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-base-content/60">Location</dt><dd className="text-right font-medium">{company.location}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-base-content/60">Group</dt><dd className="text-right font-medium">Planet Ecosystem</dd></div>
      </dl>
      {company.website && (
        <a href={company.website} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm mt-5 w-full"><Globe className="size-4" /> Visit website</a>
      )}
    </aside>
  )
}
