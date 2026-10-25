import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PASSWORD_RULES, ROLE_LABELS, staffRegisterSchema } from '@planet/shared'
import { toast } from 'sonner'
import { useCompanies } from '../../hooks/useCompanies'
import { api, applyServerErrors } from '../../lib/api'
import Field from '../ui/Field'
import PasswordInput from '../../pages/auth/PasswordInput'

const ENDPOINT = { admin: '/users/admins', super_admin: '/users/super-admins' }

/**
 * Create an admin or super admin account that is active straight away.
 * With `company` set (a super admin adding admins), the company is fixed.
 */
export default function StaffForm({ role, company, onDone }) {
  const [serverError, setServerError] = useState('')
  const companies = useCompanies({ enabled: !company })
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(staffRegisterSchema),
    defaultValues: { companyId: company?.id ?? '', idType: 'nid' },
  })

  async function onSubmit(values) {
    setServerError('')
    try {
      const { user } = await api(ENDPOINT[role], { method: 'POST', body: values })
      toast.success(`${user.name} added as ${ROLE_LABELS[role]} (${user.staffCode})`)
      onDone(user)
    } catch (err) {
      if (!applyServerErrors(err, setError) || !err.fields) setServerError(err.message)
    }
  }

  const input = (name, label, props = {}, className = '') => (
    <Field label={label} id={`sf-${name}`} error={errors[name]?.message} className={className}>
      {(a11y) => <input id={`sf-${name}`} className={`input w-full ${errors[name] ? 'input-error' : ''}`} {...a11y} {...props} {...register(name)} />}
    </Field>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
      {input('name', 'Full name', { autoComplete: 'off' }, 'sm:col-span-2')}
      {input('email', 'Official email', { type: 'email', autoComplete: 'off' })}
      {input('phone', 'Phone number', { type: 'tel', placeholder: '01XXXXXXXXX' })}
      {input('employeeId', 'Employee ID')}
      {input('idNumber', 'NID number', { inputMode: 'numeric' })}

      {company ? (
        <Field label="Company" id="sf-company">
          {(a11y) => <input id="sf-company" className="input w-full" value={company.name} readOnly disabled {...a11y} />}
        </Field>
      ) : (
        <Field label="Company" id="sf-companyId" error={errors.companyId?.message}>
          {(a11y) => (
            <select id="sf-companyId" className={`select w-full ${errors.companyId ? 'select-error' : ''}`} {...a11y} {...register('companyId')}>
              <option value="" disabled>{companies.isPending ? 'Loading…' : 'Choose a company'}</option>
              {companies.data?.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </Field>
      )}
      {input('designation', 'Designation')}

      <Field label="Starting password" id="sf-password" error={errors.password?.message} hint={PASSWORD_RULES}>
        {(a11y) => <PasswordInput id="sf-password" autoComplete="new-password" {...a11y} {...register('password')} />}
      </Field>
      <Field label="Confirm password" id="sf-confirm" error={errors.confirmPassword?.message}>
        {(a11y) => <PasswordInput id="sf-confirm" autoComplete="new-password" {...a11y} {...register('confirmPassword')} />}
      </Field>
      <p className="text-sm text-base-content/60 sm:col-span-2">Share the starting password with them privately. They can change it from their profile after signing in.</p>

      {serverError && <div role="alert" className="alert alert-error alert-soft text-sm sm:col-span-2">{serverError}</div>}
      <div className="modal-action sm:col-span-2">
        <button type="button" className="btn btn-ghost" onClick={() => onDone()}>Cancel</button>
        <button className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting && <span className="loading loading-spinner loading-sm" />}
          Create {ROLE_LABELS[role].toLowerCase()}
        </button>
      </div>
    </form>
  )
}
