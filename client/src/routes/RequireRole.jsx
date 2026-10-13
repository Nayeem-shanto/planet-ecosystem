import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { HOME_BY_ROLE } from '../lib/roles'
import PageLoader from '../components/ui/PageLoader'

/**
 * Keeps each panel's pages for its own role.
 * This is for the user's convenience only. Real protection is on the server,
 * which checks the role on every API request.
 */
export default function RequireRole({ role }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader fullScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.role !== role) return <Navigate to={HOME_BY_ROLE[user.role]} replace />
  return <Outlet />
}
