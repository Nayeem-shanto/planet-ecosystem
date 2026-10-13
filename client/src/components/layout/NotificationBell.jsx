import { Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications'
import { timeAgo } from '../../lib/format'

export default function NotificationBell({ basePath }) {
  const { data, markRead, markAll } = useNotifications()
  const navigate = useNavigate()
  const unread = data?.unread ?? 0
  const items = data?.notifications?.slice(0, 6) ?? []

  const open = (n) => {
    if (!n.readAt) markRead.mutate(n.id)
    document.activeElement?.blur() // closes the daisyUI dropdown
    if (n.link) navigate(n.link)
  }

  return (
    <div className="dropdown dropdown-end">
      <button tabIndex={0} className="btn btn-ghost btn-sm btn-square relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-content">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <div tabIndex={0} className="dropdown-content z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-box border border-base-300 bg-base-100 shadow-xl">
        <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
          <p className="font-semibold">Notifications</p>
          {unread > 0 && <button className="link text-xs" onClick={() => markAll.mutate()}>Mark all as read</button>}
        </div>
        <ul className="max-h-96 overflow-y-auto thin-scroll">
          {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-base-content/60">You’re all caught up.</li>}
          {items.map((n) => (
            <li key={n.id}>
              <button onClick={() => open(n)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-base-200 ${n.readAt ? '' : 'bg-accent/50'}`}>
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-primary'}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{n.title}</span>
                  {n.body && <span className="block truncate text-xs text-base-content/60">{n.body}</span>}
                  <span className="mt-0.5 block text-[11px] text-base-content/50">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Link to={`${basePath}/notifications`} onClick={() => document.activeElement?.blur()} className="block border-t border-base-300 px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-base-200">
          View all
        </Link>
      </div>
    </div>
  )
}
