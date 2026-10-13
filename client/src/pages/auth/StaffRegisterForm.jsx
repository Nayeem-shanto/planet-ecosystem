import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PASSWORD_RULES, ROLE_LABELS, staffRegisterSchema } from '@planet/shared'
import { api, applyServerErrors } from '../../lib/api'
import Field from '../../components/ui/Field'
import PasswordInput from './PasswordInput'

export default function StaffRegisterForm({ role }) {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const companies = useQuery({ queryKey: ['companies', 'public'], queryFn: () => api('/companies/public') })
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(staffRegisterSchema),
    defaultValues: { companyId: '', idType: 'nid' },
  })

  async function onSubmit(values) {
    setServerError('')
    try {
      const result = await api(`/auth/register/${role}`, { method: 'POST', body: values })
      navigate('/register/success', { state: { ...result, role } })
    } catch (err) {
      if (!applyServerErrors(err, setError) || !err.fields) setServerError(err.message)
    }
  }

  const input = (name, label, props = {}, className = '') => (
    <Field label={label} id={`s-${name}`} error={errors[name]?.message} className={className}>
      {(a11y) => <input id={`s-${name}`} className={`input w-full ${errors[name] ? 'input-error' : ''}`} {...a11y} {...props} {...register(name)} />}
    </Field>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="alert alert-info alert-soft text-sm sm:col-span-2">
        {ROLE_LABELS[role]} accounts are activated by the alpha admin after you confirm your email.
      </div>
      {input('name', 'Full name', { autoComplete: 'name' }, 'sm:col-span-2')}
      {input('email', 'Official email', { type: 'email', autoComplete: 'email' })}
      {input('phone', 'Phone number', { type: 'tel', autoComplete: 'tel', placeholder: '01XXXXXXXXX' })}
      {input('employeeId', 'Employee ID')}
      {input('idNumber', 'NID number', { inputMode: 'numeric' })}

      <Field label="Company" id="s-companyId" error={errors.companyId?.message}>
        {(a11y) => (
          <select id="s-companyId" className={`select w-full ${errors.companyId ? 'select-error' : ''}`} {...a11y} {...register('companyId')}>
            <option value="" disabled>{companies.isPending ? 'Loading…' : 'Choose your company'}</option>
            {companies.data?.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </Field>
      {input('designation', 'Designation')}

      <Field label="Password" id="s-password" error={errors.password?.message} hint={PASSWORD_RULES}>
        {(a11y) => <PasswordInput id="s-password" autoComplete="new-password" {...a11y} {...register('password')} />}
      </Field>
      <Field label="Confirm password" id="s-confirm" error={errors.confirmPassword?.message}>
        {(a11y) => <PasswordInput id="s-confirm" autoComplete="new-password" {...a11y} {...register('confirmPassword')} />}
      </Field>

      {serverError && <div role="alert" className="alert alert-error alert-soft text-sm sm:col-span-2">{serverError}</div>}
      <button className="btn btn-primary btn-block sm:col-span-2" disabled={isSubmitting}>
        {isSubmitting && <span className="loading loading-spinner loading-sm" />}
        Submit for approval
      </button>
    </form>
  )
}
