import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { HOME_BY_ROLE } from '../../lib/roles'
import AuthLayout from './AuthLayout'
import RoleTabs from './RoleTabs'
import LoginForm from './LoginForm'
import GeneralRegisterForm from './GeneralRegisterForm'
import StaffRegisterForm from './StaffRegisterForm'

const LOGIN_ROLES = [
  { value: 'general', label: 'General' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super admin' },
  { value: 'alpha_admin', label: 'Alpha admin' },
]
const REGISTER_ROLES = LOGIN_ROLES.slice(0, 3) // alpha admin accounts are created by the system owner

export default function AuthPage({ mode }) {
  const { user, loading } = useAuth()
  const [params, setParams] = useSearchParams()
  const roles = mode === 'login' ? LOGIN_ROLES : REGISTER_ROLES
  const requested = params.get('role')
  const [role, setRole] = useState(roles.some((r) => r.value === requested) ? requested : 'general')

  if (!loading && user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />

  const changeRole = (value) => {
    setRole(value)
    setParams({ role: value }, { replace: true })
  }

  return (
    <AuthLayout>
      <div className="mb-6 grid grid-cols-2 border-b border-base-300">
        {[['login', 'Sign in', '/login'], ['register', 'Register', '/register']].map(([key, label, to]) => (
          <Link
            key={key}
            to={`${to}${role !== 'alpha_admin' ? `?role=${role}` : ''}`}
            className={`-mb-px border-b-2 pb-3 text-center text-base font-semibold ${mode === key ? 'border-primary text-primary' : 'border-transparent text-base-content/55 hover:text-base-content'}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <h2 className="text-2xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
      <p className="mb-5 mt-1 text-base-content/65">
        {mode === 'login' ? 'Choose your account type, then sign in.' : 'Choose how you will use the portal.'}
      </p>

      <div className="mb-6">
        <RoleTabs roles={roles} value={role} onChange={changeRole} label="Account type" />
      </div>

      {mode === 'login' && <LoginForm key={role} role={role} />}
      {mode === 'register' && role === 'general' && <GeneralRegisterForm />}
      {mode === 'register' && role !== 'general' && <StaffRegisterForm key={role} role={role} />}

      <p className="mt-6 text-center text-sm text-base-content/65">
        {mode === 'login' ? (
          role === 'alpha_admin' ? 'Alpha admin accounts are created by the system owner.' : <>New to Planet Ecosystem? <Link to={`/register?role=${role}`} className="link font-semibold text-primary">Register</Link></>
        ) : (
          <>Already registered? <Link to={`/login?role=${role}`} className="link font-semibold text-primary">Sign in</Link></>
        )}
      </p>
    </AuthLayout>
  )
}
