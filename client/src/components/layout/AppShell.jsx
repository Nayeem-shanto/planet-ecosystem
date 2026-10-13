import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3, Briefcase, Building2, ClipboardCheck, FileText, Gauge, History, Inbox, LayoutDashboard, LogOut, Menu,
  ScrollText, ShieldCheck, Sparkles, UserCircle, Users,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Logo from '../brand/Logo'
import Avatar from '../ui/Avatar'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'

/** Each role gets its own navigation: four different interfaces on one shell. */
const NAV = {
  general: {
    base: '/app',
    items: [
      { to: '', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/jobs', label: 'Find jobs', icon: Briefcase },
      { to: '/applications', label: 'My applications', icon: Inbox },
      { to: '/cv', label: 'My CV', icon: FileText },
    ],
  },
  admin: {
    base: '/admin',
    items: [
      { to: '', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/jobs', label: 'Job posts', icon: Briefcase },
      { to: '/applications', label: 'Applications', icon: Users },
    ],
  },
  super_admin: {
    base: '/super',
    items: [
      { to: '', label: 'Insights', icon: BarChart3, end: true },
      { to: '/job-approvals', label: 'Job approvals', icon: ClipboardCheck },
      { to: '/recommendations', label: 'Recommendations', icon: Sparkles },
      { to: '/applications', label: 'All applications', icon: Users },
      { to: '/jobs', label: 'Job posts', icon: Briefcase },
      { to: '/applicants', label: 'Applicant log', icon: ScrollText },
      { to: '/activity', label: 'Activity log', icon: History },
    ],
  },
  alpha_admin: {
    base: '/alpha',
    items: [
      { to: '', label: 'Overview', icon: Gauge, end: true },
      { to: '/registrations', label: 'Registrations', icon: ShieldCheck },
      { to: '/users', label: 'Users', icon: Users },
      { to: '/companies', label: 'Companies', icon: Building2 },
      { to: '/insights', label: 'Insights', icon: BarChart3 },
      { to: '/activity', label: 'Activity log', icon: History },
    ],
  },
}

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const nav = NAV[user.role]

  const closeDrawer = () => {
    const toggle = document.getElementById('app-drawer')
    if (toggle) toggle.checked = false
  }

  const handleLogout = async () => {
    await logout.mutateAsync().catch(() => {})
    navigate('/login', { replace: true })
  }

  return (
    <div className="drawer lg:drawer-open">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-base-300 bg-base-100/85 px-4 backdrop-blur sm:px-6">
          <label htmlFor="app-drawer" className="btn btn-ghost btn-sm btn-square lg:hidden" aria-label="Open menu"><Menu className="size-5" /></label>
          <div className="lg:hidden"><Logo compact /></div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell basePath={nav.base} />
            <div className="dropdown dropdown-end">
              <button tabIndex={0} className="ml-1 flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-base-200 sm:pr-3">
                <Avatar name={user.name} size="size-8" />
                <span className="hidden text-left sm:block">
                  <span className="block max-w-40 truncate text-sm font-semibold leading-tight">{user.name}</span>
                  <span className="block text-xs text-base-content/55">{user.roleLabel}{user.staffCode && user.role !== 'alpha_admin' ? ` ${user.staffCode}` : ''}</span>
                </span>
              </button>
              <ul tabIndex={0} className="menu dropdown-content z-50 mt-2 w-60 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl">
                <li className="menu-title truncate">{user.email}</li>
                <li><NavLink to={`${nav.base}/profile`} onClick={() => document.activeElement?.blur()}><UserCircle className="size-4" /> My profile</NavLink></li>
                <li><button onClick={handleLogout}><LogOut className="size-4" /> Sign out</button></li>
              </ul>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <aside className="drawer-side z-40">
        <label htmlFor="app-drawer" className="drawer-overlay" aria-label="Close menu" />
        <nav className="flex min-h-full w-64 flex-col border-r border-base-300 bg-base-100 px-4 py-5">
          <div className="mb-7 px-2"><Logo /></div>
          <p className="mb-2 px-3 text-xs font-medium text-base-content/50">{user.roleLabel} panel</p>
          <ul className="menu w-full gap-0.5 p-0">
            {nav.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={`${nav.base}${item.to}`}
                  end={item.end}
                  onClick={closeDrawer}
                  className={({ isActive }) => `rounded-lg px-3 py-2.5 ${isActive ? 'bg-accent font-semibold text-accent-content' : 'text-base-content/75 hover:text-base-content'}`}
                >
                  <item.icon className="size-[18px]" /> {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-auto rounded-box bg-base-200 p-4 text-xs leading-relaxed text-base-content/60">
            Planet Ecosystem is a sister concern of Sandhani Group of Companies.
          </div>
        </nav>
      </aside>
    </div>
  )
}
