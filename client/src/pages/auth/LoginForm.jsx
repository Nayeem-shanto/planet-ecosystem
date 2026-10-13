import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginSchema } from '@planet/shared'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { HOME_BY_ROLE } from '../../lib/roles'
import Field from '../../components/ui/Field'
import PasswordInput from './PasswordInput'

export default function LoginForm({ role }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState(null)

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', role },
  })

  async function onSubmit(values) {
    setServerError(null)
    try {
      const { user } = await login.mutateAsync({ ...values, role })
      const from = location.state?.from
      navigate(from?.startsWith(HOME_BY_ROLE[user.role]) ? from : HOME_BY_ROLE[user.role], { replace: true })
    } catch (err) {
      setServerError(err)
    }
  }

  async function resendVerification() {
    const { message } = await api('/auth/resend-verification', { method: 'POST', body: { email: getValues('email') } })
    toast.success(message)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Email" id="login-email" error={errors.email?.message}>
        {(a11y) => <input id="login-email" type="email" autoComplete="email" className={`input w-full ${errors.email ? 'input-error' : ''}`} {...a11y} {...register('email')} />}
      </Field>
      <Field label="Password" id="login-password" error={errors.password?.message}>
        {(a11y) => <PasswordInput id="login-password" autoComplete="current-password" {...a11y} {...register('password')} />}
      </Field>
      <div className="flex justify-end">
        <Link to="/forgot-password" className="link link-hover text-sm text-primary">Forgot password?</Link>
      </div>

      {serverError && (
        <div role="alert" className="alert alert-error alert-soft items-start text-sm">
          <div>
            <p>{serverError.message}</p>
            {serverError.code === 'EMAIL_NOT_VERIFIED' && (
              <button type="button" className="link mt-1 font-semibold" onClick={resendVerification}>Send a new confirmation link</button>
            )}
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-block" disabled={isSubmitting}>
        {isSubmitting && <span className="loading loading-spinner loading-sm" />}
        Sign in
      </button>
    </form>
  )
}
