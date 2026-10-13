import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { formatDateTime } from '../../lib/format'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import EmptyState from '../../components/ui/EmptyState'

export default function NotificationsPage() {
  const { data, isPending, markRead, markAll } = useNotifications()
  const navigate = useNavigate()
  if (isPending) return <PageLoader />
  const items = data?.notifications ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" description="Important updates are also sent to your email." actions={data?.unread > 0 && <button className="btn btn-sm" onClick={() => markAll.mutate()}>Mark all as read</button>} />
      {items.length === 0 ? <EmptyState icon={Bell} title="No notifications yet">Updates about your account and applications will appear here.</EmptyState> : (
        <ul className="divide-y divide-base-300 overflow-hidden rounded-box border border-base-300 bg-base-100">
          {items.map((n) => (
            <li key={n.id}>
              <button className={`flex w-full gap-3 px-5 py-4 text-left hover:bg-base-200 ${n.readAt ? '' : 'bg-accent/40'}`} onClick={() => { if (!n.readAt) markRead.mutate(n.id); if (n.link) navigate(n.link) }}>
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-primary'}`} />
                <span className="min-w-0 flex-1"><span className="block font-medium">{n.title}</span>{n.body && <span className="block text-sm text-base-content/65">{n.body}</span>}</span>
                <span className="shrink-0 text-xs text-base-content/50">{formatDateTime(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
