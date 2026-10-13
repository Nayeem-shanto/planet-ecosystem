import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'
import { PASSWORD_RULES, resetPasswordSchema } from '@planet/shared'
import { api } from '../../lib/api'
import Field from '../../components/ui/Field'
import AuthLayout from './AuthLayout'
import PasswordInput from './PasswordInput'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const [done, setDone] = useState('')
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: params.get('token') ?? '' },
  })

  const onSubmit = async (values) => {
    setError('')
    try { setDone((await api('/auth/reset-password', { method: 'POST', body: values })).message) }
    catch (err) { setError(err.message) }
  }

  return (
    <AuthLayout>
      <h2 className="mb-6 text-2xl font-bold">Choose a new password</h2>
      {done ? (
        <>
          <div className="alert alert-success alert-soft">{done}</div>
          <Link to="/login" className="btn btn-primary btn-block mt-6">Go to sign in</Link>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="New password" id="rp-password" error={errors.password?.message} hint={PASSWORD_RULES}>
            {(a11y) => <PasswordInput id="rp-password" autoComplete="new-password" {...a11y} {...register('password')} />}
          </Field>
          <Field label="Confirm new password" id="rp-confirm" error={errors.confirmPassword?.message}>
            {(a11y) => <PasswordInput id="rp-confirm" autoComplete="new-password" {...a11y} {...register('confirmPassword')} />}
          </Field>
          {(error || errors.token) && <div role="alert" className="alert alert-error alert-soft text-sm">{error || 'This reset link is incomplete. Request a new one.'}</div>}
          <button className="btn btn-primary btn-block" disabled={isSubmitting}>Update password</button>
        </form>
      )}
    </AuthLayout>
  )
}
