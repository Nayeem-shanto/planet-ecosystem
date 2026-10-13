import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-box border border-dashed border-base-300 bg-base-100 px-6 py-14 text-center">
      <span className="mb-3 grid size-12 place-items-center rounded-full bg-accent text-accent-content">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-md text-sm text-base-content/65">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
