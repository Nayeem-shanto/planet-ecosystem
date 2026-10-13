import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { generalRegisterSchema, ID_TYPES, PASSWORD_RULES, WORK_TYPES } from '@planet/shared'
import { useState } from 'react'
import { api, applyServerErrors } from '../../lib/api'
import Field from '../../components/ui/Field'
import PasswordInput from './PasswordInput'

export default function GeneralRegisterForm() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(generalRegisterSchema),
    defaultValues: { idType: 'nid', workType: '' },
  })
  const idType = watch('idType')
  const workType = watch('workType')
  const detailLabel = WORK_TYPES.find((w) => w.value === workType)?.detailLabel ?? 'Details'

  async function onSubmit(values) {
    setServerError('')
    try {
      const result = await api('/auth/register/general', { method: 'POST', body: values })
      navigate('/register/success', { state: { ...result, role: 'general' } })
    } catch (err) {
      if (!applyServerErrors(err, setError) || !err.fields) setServerError(err.message)
    }
  }

  const input = (name, label, { hint, ...props } = {}, className = '') => (
    <Field label={label} id={`g-${name}`} error={errors[name]?.message} className={className} hint={hint}>
      {(a11y) => <input id={`g-${name}`} className={`input w-full ${errors[name] ? 'input-error' : ''}`} {...a11y} {...props} {...register(name)} />}
    </Field>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
      {input('name', 'Full name', { autoComplete: 'name' }, 'sm:col-span-2')}
      {input('email', 'Email', { type: 'email', autoComplete: 'email' })}
      {input('phone', 'Phone number', { type: 'tel', autoComplete: 'tel', placeholder: '01XXXXXXXXX' })}

      <Field label="ID type" id="g-idType">
        <select id="g-idType" className="select w-full" {...register('idType')}>
          {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      {input('idNumber', idType === 'birth_certificate' ? 'Birth certificate number' : 'NID number', { inputMode: 'numeric', hint: idType === 'birth_certificate' ? '17 digits' : '10, 13 or 17 digits' })}

      <Field label="I am a" id="g-workType" error={errors.workType?.message}>
        {(a11y) => (
          <select id="g-workType" className={`select w-full ${errors.workType ? 'select-error' : ''}`} {...a11y} {...register('workType')}>
            <option value="" disabled>Choose one</option>
            {WORK_TYPES.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        )}
      </Field>
      {input('workDetail', detailLabel)}

      <Field label="Password" id="g-password" error={errors.password?.message} hint={PASSWORD_RULES}>
        {(a11y) => <PasswordInput id="g-password" autoComplete="new-password" {...a11y} {...register('password')} />}
      </Field>
      <Field label="Confirm password" id="g-confirm" error={errors.confirmPassword?.message}>
        {(a11y) => <PasswordInput id="g-confirm" autoComplete="new-password" {...a11y} {...register('confirmPassword')} />}
      </Field>

      {serverError && <div role="alert" className="alert alert-error alert-soft text-sm sm:col-span-2">{serverError}</div>}
      <p className="text-xs text-base-content/55 sm:col-span-2">Your ID number is encrypted and is only used to verify your identity.</p>
      <button className="btn btn-primary btn-block sm:col-span-2" disabled={isSubmitting}>
        {isSubmitting && <span className="loading loading-spinner loading-sm" />}
        Create account
      </button>
    </form>
  )
}
