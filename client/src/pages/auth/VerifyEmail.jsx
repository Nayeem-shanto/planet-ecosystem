import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { api } from '../../lib/api'
import AuthLayout from './AuthLayout'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const [state, setState] = useState({ status: 'loading' })
  const sent = useRef(false) // StrictMode runs effects twice in development; a token works only once

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    const token = params.get('token')
    if (!token) return setState({ status: 'error', message: 'This confirmation link is incomplete.' })
    api('/auth/verify-email', { method: 'POST', body: { token } })
      .then((res) => setState({ message: res.message, accountStatus: res.status, status: 'done' }))
      .catch((err) => setState({ status: 'error', message: err.message }))
  }, [params])

  return (
    <AuthLayout>
      <div className="text-center">
        {state.status === 'loading' && <span className="loading loading-spinner loading-lg text-primary" />}
        {state.status === 'done' && (
          <>
            <CheckCircle2 className="mx-auto mb-4 size-14 text-success" />
            <h2 className="text-2xl font-bold">Email confirmed</h2>
            <p className="mt-2 text-base-content/70">{state.message}</p>
            <Link to="/login" className="btn btn-primary mt-8">Go to sign in</Link>
          </>
        )}
        {state.status === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 size-14 text-error" />
            <h2 className="text-2xl font-bold">Link not valid</h2>
            <p className="mt-2 text-base-content/70">{state.message}</p>
            <p className="mt-1 text-sm text-base-content/60">Try signing in: you'll get an option to send a new link.</p>
            <Link to="/login" className="btn btn-primary mt-8">Go to sign in</Link>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
