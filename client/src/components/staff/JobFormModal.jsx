import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { JOB_CATEGORIES, JOB_TYPES, WORKPLACES, jobSchema } from '@planet/shared'
import Modal from '../ui/Modal'
import { applyServerErrors } from '../../lib/api'
import { splitLines, splitList } from '../../lib/format'

/**
 * The form edits lists as text (one item per line) and converts them into
 * arrays just before validation with the SAME schema the server uses.
 */
const formSchema = z.looseObject({
  responsibilities: z.string().optional().default(''),
  requirements: z.string().optional().default(''),
  benefits: z.string().optional().default(''),
  skills: z.string().optional().default(''),
}).transform((v) => ({
  ...v,
  responsibilities: splitLines(v.responsibilities),
  requirements: splitLines(v.requirements),
  benefits: splitLines(v.benefits),
  skills: splitList(v.skills),
  salaryMin: v.salaryMin === '' ? null : v.salaryMin,
  salaryMax: v.salaryMax === '' ? null : v.salaryMax,
})).pipe(jobSchema)

const toForm = (job, companies) => ({
  companyId: job?.companyId ?? companies[0]?.id ?? '',
  title: job?.title ?? '', category: job?.category ?? JOB_CATEGORIES[0], type: job?.type ?? JOB_TYPES[0],
  workplace: job?.workplace ?? WORKPLACES[0], location: job?.location ?? '', experienceMin: job?.experienceMin ?? 0,
  salaryMin: job?.salaryMin ?? '', salaryMax: job?.salaryMax ?? '', vacancies: job?.vacancies ?? 1,
  deadline: job?.deadline ? new Date(job.deadline).toISOString().slice(0, 10) : '',
  description: job?.description ?? '',
  responsibilities: job?.responsibilities?.join('\n') ?? '', requirements: job?.requirements?.join('\n') ?? '',
  benefits: job?.benefits?.join('\n') ?? '', skills: job?.skills?.join(', ') ?? '',
})

export default function JobFormModal({ job, companies, role, onClose, onSubmit }) {
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: toForm(job, companies),
  })

  const submit = async (values) => {
    setServerError('')
    // A date-only value means "end of that day" in Bangladesh time.
    const deadline = new Date(`${new Date(values.deadline).toISOString().slice(0, 10)}T23:59:59+06:00`)
    try { await onSubmit({ ...values, deadline }) }
    catch (err) { if (!applyServerErrors(err, setError) || !err.fields) setServerError(err.message) }
  }

  const err = (name) => errors[name]?.message
  const input = (name, label, props = {}, span = '') => (
    <label className={`block ${span}`}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input className={`input w-full ${err(name) ? 'input-error' : ''}`} {...props} {...register(name)} />
      {err(name) && <span className="mt-1 block text-xs text-error">{err(name)}</span>}
    </label>
  )
  const select = (name, label, options) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <select className="select w-full" {...register(name)}>
        {options.map((o) => (typeof o === 'string' ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      {err(name) && <span className="mt-1 block text-xs text-error">{err(name)}</span>}
    </label>
  )
  const textarea = (name, label, hint, h = 'h-24') => (
    <label className="block sm:col-span-2">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <textarea className={`textarea w-full ${h} ${err(name) ? 'textarea-error' : ''}`} {...register(name)} />
      {err(name) ? <span className="mt-1 block text-xs text-error">{err(name)}</span> : hint && <span className="mt-1 block text-xs text-base-content/55">{hint}</span>}
    </label>
  )

  const needsApproval = role === 'admin'
  return (
    <Modal open onClose={onClose} title={job ? 'Edit job post' : 'New job post'} size="max-w-3xl">
      {needsApproval && (
        <div className="alert alert-info alert-soft mb-5 text-sm">
          {job?.status === 'published' ? 'Saving changes sends this live job back to a super admin for approval.' : 'A super admin approves the post before it appears on the job board.'}
        </div>
      )}
      <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4 sm:grid-cols-2">
        {input('title', 'Job title', { placeholder: 'e.g. Staff Nurse' }, 'sm:col-span-2')}
        {select('companyId', 'Company', companies.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name })))}
        {select('category', 'Category', JOB_CATEGORIES)}
        {select('type', 'Job type', JOB_TYPES)}
        {select('workplace', 'Workplace', WORKPLACES)}
        {input('location', 'Location', { placeholder: 'e.g. Gulshan, Dhaka' })}
        {input('deadline', 'Application deadline', { type: 'date' })}
        {input('salaryMin', 'Minimum monthly salary (৳)', { type: 'number', min: 0 })}
        {input('salaryMax', 'Maximum monthly salary (৳)', { type: 'number', min: 0 })}
        {input('experienceMin', 'Minimum experience (years)', { type: 'number', min: 0 })}
        {input('vacancies', 'Vacancies', { type: 'number', min: 1 })}
        {textarea('description', 'About the role', null, 'h-28')}
        {textarea('responsibilities', 'Responsibilities', 'One per line')}
        {textarea('requirements', 'Requirements', 'One per line')}
        {textarea('benefits', 'Benefits', 'One per line')}
        {textarea('skills', 'Skills', 'Separate with commas. Used to match candidates’ CVs.', 'h-16')}
        {serverError && <div role="alert" className="alert alert-error alert-soft text-sm sm:col-span-2">{serverError}</div>}
        <div className="modal-action sm:col-span-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting && <span className="loading loading-spinner loading-sm" />}
            {job ? 'Save changes' : needsApproval ? 'Submit for approval' : 'Publish job'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
