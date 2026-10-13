import { initials } from '../../lib/format'

export default function Avatar({ name, src, size = 'size-10', className = '' }) {
  if (src) return <img src={src} alt="" className={`${size} shrink-0 rounded-full object-cover ${className}`} />
  return (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-content ${className}`} aria-hidden>
      {initials(name)}
    </span>
  )
}
