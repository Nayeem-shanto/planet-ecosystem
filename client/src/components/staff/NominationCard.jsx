import { BadgeCheck } from 'lucide-react'
import { OrbitMark } from '../brand/Logo'
import { formatDate } from '../../lib/format'

/** "You are nominated as Admin of XYZ company. Admin ID: ADM-0001." */
export default function NominationCard({ user }) {
  return (
    <section className="relative overflow-hidden rounded-box bg-[#0C0C0E] p-6 text-white">
      <OrbitMark className="pointer-events-none absolute -right-8 -top-10 size-56 opacity-25" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 text-sm text-white/65"><BadgeCheck className="size-4 text-[#8B7FC6]" /> Approved{user.approvedAt && ` on ${formatDate(user.approvedAt)}`}</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">You are nominated as {user.roleLabel} of {user.company?.name}</h1>
          <p className="mt-1 text-white/65">{user.designation}{user.employeeId && `, employee ID ${user.employeeId}`}</p>
        </div>
        <div className="rounded-box border border-white/15 bg-white/5 px-5 py-4 text-center">
          <p className="text-xs text-white/60">{user.roleLabel} ID</p>
          <p className="mt-1 font-brand text-xl tracking-wider">{user.staffCode}</p>
        </div>
      </div>
    </section>
  )
}
