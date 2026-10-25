import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { HOME_BY_ROLE } from '../../lib/roles'
import AuthLayout from './AuthLayout'
import LoginForm from './LoginForm'
import GeneralRegisterForm from './GeneralRegisterForm'

export default function AuthPage({ mode }) {
  const { user, loading } = useAuth()

  if (!loading && user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />

  return (
    <AuthLayout>
      <div className="mb-6 grid grid-cols-2 border-b border-base-300">
        {[['login', 'Sign in', '/login'], ['register', 'Register', '/register']].map(([key, label, to]) => (
          <Link
            key={key}
            to={to}
            className={`-mb-px border-b-2 pb-3 text-center text-base font-semibold ${mode === key ? 'border-primary text-primary' : 'border-transparent text-base-content/55 hover:text-base-content'}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <h2 className="text-2xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
      <p className="mb-6 mt-1 text-base-content/65">
        {mode === 'login' ? 'Sign in with your email and password.' : 'Register to apply for jobs at Planet Ecosystem.'}
      </p>

      {mode === 'login' ? <LoginForm /> : <GeneralRegisterForm />}

      <p className="mt-6 text-center text-sm text-base-content/65">
        {mode === 'login' ? (
          <>New to Planet Ecosystem? <Link to="/register" className="link font-semibold text-primary">Register</Link></>
        ) : (
          <>Already registered? <Link to="/login" className="link font-semibold text-primary">Sign in</Link></>
        )}
      </p>
    </AuthLayout>
  )
}
