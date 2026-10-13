import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { companySchema } from '@planet/shared'
import { useCompanies } from '../../hooks/useCompanies'
import { api, applyServerErrors } from '../../lib/api'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import EmptyState from '../../components/ui/EmptyState'
import CompanyMark from '../../components/ui/CompanyMark'
import Modal from '../../components/ui/Modal'

function CompanyForm({ company, onDone }) {
  const [error, setError] = useState('')
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: { name: company?.name ?? '', industry: company?.industry ?? '', location: company?.location ?? '', about: company?.about ?? '', website: company?.website ?? '' },
  })
  const submit = async (values) => {
    try {
      await api(company ? `/companies/${company.id}` : '/companies', { method: company ? 'PATCH' : 'POST', body: values })
      toast.success(company ? 'Company updated' : 'Company added')
      onDone()
    } catch (err) { if (!applyServerErrors(err, setFieldError)) setError(err.status === 409 ? 'A company with this name already exists.' : err.message) }
  }
  const field = (name, label, props = {}) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input className={`input w-full ${errors[name] ? 'input-error' : ''}`} {...props} {...register(name)} />
      {errors[name] && <span className="mt-1 block text-xs text-error">{errors[name].message}</span>}
    </label>
  )
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">{field('name', 'Company name')}</div>
      {field('industry', 'Industry')}
      {field('location', 'Head office location')}
      <div className="sm:col-span-2">{field('website', 'Website', { placeholder: 'https://' })}</div>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-sm font-medium">About</span>
        <textarea className="textarea h-28 w-full" {...register('about')} placeholder="Shown to candidates beside every job post." />
      </label>
      {error && <div role="alert" className="alert alert-error alert-soft text-sm sm:col-span-2">{error}</div>}
      <div className="modal-action sm:col-span-2"><button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button><button className="btn btn-primary" disabled={isSubmitting}>{company ? 'Save changes' : 'Add company'}</button></div>
    </form>
  )
}

export default function CompaniesPage() {
  const qc = useQueryClient()
  const companies = useCompanies()
  const [editing, setEditing] = useState(undefined)
  const refresh = () => { qc.invalidateQueries({ queryKey: ['companies'] }); setEditing(undefined) }

  async function toggle(c) {
    try {
      await api(`/companies/${c.id}/${c.isActive ? 'deactivate' : 'activate'}`, { method: 'POST' })
      toast.success(c.isActive ? `${c.name} deactivated: hidden from registration and new jobs` : `${c.name} activated`)
      refresh()
    } catch (err) { toast.error(err.message) }
  }

  if (companies.isPending) return <PageLoader />
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Companies" description="The companies of Planet Ecosystem. Staff choose from this list when they register, and every job belongs to one." actions={<button className="btn btn-primary" onClick={() => setEditing(null)}><Plus className="size-4" /> Add company</button>} />
      {companies.data.length === 0 ? <EmptyState icon={Building2} title="No companies yet" action={<button className="btn btn-primary btn-sm" onClick={() => setEditing(null)}>Add the first company</button>}>Add a company before admins can register or post jobs.</EmptyState> : (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.data.map((c) => (
            <article key={c.id} className={`flex flex-col rounded-box border border-base-300 bg-base-100 p-5 ${c.isActive ? '' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <CompanyMark name={c.name} size="size-12" />
                <div className="min-w-0 flex-1"><h2 className="text-lg font-bold leading-tight">{c.name}</h2><p className="text-sm text-base-content/60">{c.industry}, {c.location}</p></div>
                <span className={`badge badge-sm ${c.isActive ? 'badge-success badge-soft' : 'badge-ghost'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <p className="mt-3 line-clamp-3 flex-1 text-sm text-base-content/75">{c.about || 'No description yet.'}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-base-content/55">{c.jobCount} job posts</span>
                <div className="flex gap-1">
                  <button className="btn btn-ghost btn-sm" onClick={() => toggle(c)}>{c.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)}><Pencil className="size-4" /> Edit</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit company' : 'Add company'}>
        {editing !== undefined && <CompanyForm key={editing?.id ?? 'new'} company={editing} onDone={refresh} />}
      </Modal>
    </div>
  )
}
