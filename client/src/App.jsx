import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { HOME_BY_ROLE } from './lib/roles'
import RequireRole from './routes/RequireRole'
import AppShell from './components/layout/AppShell'
import PageLoader from './components/ui/PageLoader'
import AuthPage from './pages/auth/AuthPage'

// Each page is downloaded only when first opened (code splitting), so the
// sign-in page loads fast even though the app has 25+ screens.
const RegisterSuccess = lazy(() => import('./pages/auth/RegisterSuccess'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const OverviewPage = lazy(() => import('./pages/general/OverviewPage'))
const JobsPage = lazy(() => import('./pages/general/JobsPage'))
const ApplicationsPage = lazy(() => import('./pages/general/ApplicationsPage'))
const CVPage = lazy(() => import('./pages/general/CVPage'))
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'))
const ManageJobsPage = lazy(() => import('./pages/shared/ManageJobsPage'))
const StaffApplicationsPage = lazy(() => import('./pages/shared/StaffApplicationsPage'))
const ActivityLogPage = lazy(() => import('./pages/shared/ActivityLogPage'))
const ProfilePage = lazy(() => import('./pages/shared/ProfilePage'))
const NotificationsPage = lazy(() => import('./pages/shared/NotificationsPage'))
const InsightsPage = lazy(() => import('./pages/super/InsightsPage'))
const JobApprovalsPage = lazy(() => import('./pages/super/JobApprovalsPage'))
const ApplicantLogPage = lazy(() => import('./pages/super/ApplicantLogPage'))
const TeamPage = lazy(() => import('./pages/super/TeamPage'))
const AlphaOverview = lazy(() => import('./pages/alpha/AlphaOverview'))
const RegistrationsPage = lazy(() => import('./pages/alpha/RegistrationsPage'))
const UsersPage = lazy(() => import('./pages/alpha/UsersPage'))
const CompaniesPage = lazy(() => import('./pages/alpha/CompaniesPage'))

function Home() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader fullScreen />
  return <Navigate to={user ? HOME_BY_ROLE[user.role] : '/login'} replace />
}

/** Pages every signed-in role has. */
const common = (
  <>
    <Route path="profile" element={<ProfilePage />} />
    <Route path="notifications" element={<NotificationsPage />} />
  </>
)

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader fullScreen />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/register/success" element={<RegisterSuccess />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<RequireRole role="general" />}>
            <Route path="/app" element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="jobs" element={<JobsPage />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="cv" element={<CVPage />} />
              {common}
            </Route>
          </Route>

          <Route element={<RequireRole role="admin" />}>
            <Route path="/admin" element={<AppShell />}>
              <Route index element={<AdminOverview />} />
              <Route path="jobs" element={<ManageJobsPage />} />
              <Route path="applications" element={<StaffApplicationsPage />} />
              {common}
            </Route>
          </Route>

          <Route element={<RequireRole role="super_admin" />}>
            <Route path="/super" element={<AppShell />}>
              <Route index element={<InsightsPage />} />
              <Route path="job-approvals" element={<JobApprovalsPage />} />
              <Route path="recommendations" element={<StaffApplicationsPage fixedStatus="recommended" title="Recommendations" description="Candidates recommended by admins. Approve to send them to interview, or decline." />} />
              <Route path="applications" element={<StaffApplicationsPage title="All applications" />} />
              <Route path="jobs" element={<ManageJobsPage />} />
              <Route path="applicants" element={<ApplicantLogPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="activity" element={<ActivityLogPage />} />
              {common}
            </Route>
          </Route>

          <Route element={<RequireRole role="alpha_admin" />}>
            <Route path="/alpha" element={<AppShell />}>
              <Route index element={<AlphaOverview />} />
              <Route path="registrations" element={<RegistrationsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="insights" element={<InsightsPage />} />
              <Route path="activity" element={<ActivityLogPage />} />
              {common}
            </Route>
          </Route>

          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
