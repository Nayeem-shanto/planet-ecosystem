import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SearchX } from 'lucide-react'
import { api, toQuery } from '../../lib/api'
import { useDebounce } from '../../hooks/useDebounce'
import { useCV } from '../../hooks/useCV'
import JobFilters, { DEFAULT_FILTERS } from '../../components/jobs/JobFilters'
import JobListItem from '../../components/jobs/JobListItem'
import JobDetail from '../../components/jobs/JobDetail'
import ApplyModal from '../../components/jobs/ApplyModal'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'

export default function JobsPage() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [applyJob, setApplyJob] = useState(null)
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('job')
  const cv = useCV()

  // Text inputs are debounced so we don't query the server on every keystroke.
  const q = useDebounce(filters.q)
  const location = useDebounce(filters.location)
  const query = useMemo(() => ({
    q, location, category: filters.category, types: filters.types, workplace: filters.workplace,
    maxExperience: filters.maxExperience, saved: filters.saved ? 'true' : '', sort: filters.sort,
  }), [q, location, filters.category, filters.types, filters.workplace, filters.maxExperience, filters.saved, filters.sort])

  const jobs = useQuery({
    queryKey: ['jobs', query],
    queryFn: () => api(`/jobs${toQuery(query)}`),
    placeholderData: keepPreviousData, // keep showing old results while new ones load
  })

  const toggleSave = useMutation({
    mutationFn: (job) => api(`/jobs/${job.id}/save`, { method: job.saved ? 'DELETE' : 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  if (jobs.isPending) return <PageLoader />
  if (jobs.isError) return <ErrorState error={jobs.error} onRetry={jobs.refetch} />

  const list = jobs.data.jobs
  const selected = list.find((j) => j.id === selectedId) ?? (selectedId ? null : list[0])
  const select = (id) => {
    setParams({ job: id })
    if (!window.matchMedia('(min-width: 80rem)').matches) window.scrollTo({ top: 0 })
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-5">
        <h1 className="text-2xl font-bold sm:text-[28px]">Find your next role</h1>
        <p className="mt-1 text-base-content/65">Openings from every company in Planet Ecosystem.</p>
      </div>
      <JobFilters filters={filters} onChange={setFilters} hasCV={jobs.data.hasCV} count={list.length} loading={jobs.isFetching} />

      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={SearchX} title="No jobs match these filters" action={<button className="btn btn-outline btn-sm" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</button>}>
            Try a broader search, or check back soon: new roles are posted every week.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className={`thin-scroll space-y-3 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1 ${selectedId ? 'hidden xl:block' : ''}`}>
            {list.map((job) => <JobListItem key={job.id} job={job} selected={job.id === selected?.id} onSelect={select} />)}
          </div>
          <div className={selectedId ? '' : 'hidden xl:block'}>
            {selected ? (
              <JobDetail job={selected} onApply={() => setApplyJob(selected)} onToggleSave={() => toggleSave.mutate(selected)} onBack={() => setParams({})} />
            ) : (
              <EmptyState title="This job isn’t in the current results">Pick a job from the list.</EmptyState>
            )}
          </div>
        </div>
      )}
      <ApplyModal job={applyJob} cv={cv.data} onClose={() => setApplyJob(null)} />
    </div>
  )
}
