import { Link, Navigate, useLocation } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import AuthLayout from './AuthLayout'

export default function RegisterSuccess() {
  const { state } = useLocation()
  if (!state?.message) return <Navigate to="/register" replace />
  const isStaff = state.role !== 'general'

  return (
    <AuthLayout>
      <div className="text-center">
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-success/15 text-success"><MailCheck className="size-8" /></span>
        <h2 className="text-2xl font-bold">Registration successful</h2>
        <p className="mx-auto mt-3 max-w-md text-base-content/70">{state.message}</p>
        <p className="mt-2 text-sm text-base-content/60">We sent the link to <strong>{state.email}</strong>.</p>
      </div>
      <ol className="mx-auto mt-8 max-w-sm space-y-3 text-sm">
        {['Open the email and click “Confirm email”.', isStaff ? 'Wait for the alpha admin to approve your account. We will email you.' : 'Sign in with your email and password.', isStaff ? 'Sign in with your email and password.' : null]
          .filter(Boolean)
          .map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-content">{i + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
      </ol>
      <Link to={`/login?role=${state.role}`} className="btn btn-primary btn-block mt-8">Continue to sign in</Link>
    </AuthLayout>
  )
}
