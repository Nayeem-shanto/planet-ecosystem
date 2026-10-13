import { useId } from 'react'

/** The Planet orbit mark: a tilted orbit with three planets, in the brand gradient. */
export function OrbitMark({ className = 'size-9' }) {
  const id = useId()
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="#6A5CA8" />
          <stop offset="1" stopColor="#51449C" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="34" rx="27" ry="12" transform="rotate(-32 32 34)" fill="none" stroke={`url(#${id})`} strokeWidth="4" strokeLinecap="round" strokeDasharray="126 24" />
      <circle cx="21" cy="16" r="5.5" fill={`url(#${id})`} />
      <circle cx="47" cy="45" r="7" fill={`url(#${id})`} />
      <circle cx="25" cy="49" r="3" fill={`url(#${id})`} />
    </svg>
  )
}

/** Mark + wordmark. "inverse" is for dark backgrounds. */
export default function Logo({ inverse = false, compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <OrbitMark className={compact ? 'size-8' : 'size-10'} />
      <div className="leading-none">
        <p className={`font-brand text-[15px] tracking-wide ${inverse ? 'text-white' : 'text-[#0C0C0E] [[data-theme=planet-dark]_&]:text-white'}`}>PLANET</p>
        <p className={`mt-1 font-brand text-[8.5px] tracking-[0.28em] ${inverse ? 'text-white/70' : 'text-base-content/60'}`}>ECOSYSTEM</p>
      </div>
    </div>
  )
}
