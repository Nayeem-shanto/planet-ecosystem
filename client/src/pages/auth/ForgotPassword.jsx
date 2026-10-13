import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { forgotPasswordSchema } from '@planet/shared'
import { api } from '../../lib/api'
import Field from '../../components/ui/Field'
import AuthLayout from './AuthLayout'

export default function ForgotPassword() {
  const [done, setDone] = useState('')
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (values) => {
    setError('')
    try { setDone((await api('/auth/forgot-password', { method: 'POST', body: values })).message) }
    catch (err) { setError(err.message) }
  }

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold">Reset your password</h2>
      <p className="mb-6 mt-1 text-base-content/65">Enter your account email. We’ll send you a link to choose a new password.</p>
      {done ? (
        <div className="alert alert-success alert-soft">{done}</div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="Email" id="fp-email" error={errors.email?.message}>
            {(a11y) => <input id="fp-email" type="email" autoComplete="email" className="input w-full" {...a11y} {...register('email')} />}
          </Field>
          {error && <div role="alert" className="alert alert-error alert-soft text-sm">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={isSubmitting}>Send reset link</button>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link to="/login" className="link text-primary">Back to sign in</Link></p>
    </AuthLayout>
  )
}
