import Logo from '../../components/brand/Logo'
import ThemeToggle from '../../components/layout/ThemeToggle'

/** The orbit, drawn large and slowly turning: the visual signature of the brand. */
function OrbitScene() {
  return (
    <svg viewBox="0 0 600 600" className="absolute -right-40 top-1/2 h-[130%] -translate-y-1/2 opacity-90" aria-hidden="true">
      <defs>
        <linearGradient id="og" x1="0" x2="1"><stop offset="0" stopColor="#6A5CA8" /><stop offset="1" stopColor="#51449C" /></linearGradient>
        <radialGradient id="glow"><stop offset="0" stopColor="#54489C" stopOpacity="0.45" /><stop offset="1" stopColor="#54489C" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="300" cy="300" r="260" fill="url(#glow)" />
      <g className="orbit-spin">
        <ellipse cx="300" cy="300" rx="250" ry="105" transform="rotate(-32 300 300)" fill="none" stroke="url(#og)" strokeWidth="10" strokeLinecap="round" strokeDasharray="1100 150" />
        <circle cx="205" cy="128" r="30" fill="url(#og)" />
        <circle cx="460" cy="402" r="40" fill="url(#og)" />
        <circle cx="236" cy="452" r="15" fill="url(#og)" />
      </g>
      <g className="orbit-spin-reverse" opacity="0.35">
        <ellipse cx="300" cy="300" rx="290" ry="150" transform="rotate(18 300 300)" fill="none" stroke="#8B7FC6" strokeWidth="1.5" strokeDasharray="4 10" />
      </g>
    </svg>
  )
}

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="relative hidden overflow-hidden bg-[#0C0C0E] p-12 text-white lg:flex lg:flex-col">
        <OrbitScene />
        {/* Fade the orbit behind the headline so the text stays easy to read */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#0C0C0E] via-[#0C0C0E]/90 to-transparent" />
        <div className="relative"><Logo inverse /></div>
        <div className="relative mt-auto max-w-md">
          <h1 className="text-[44px] font-extrabold leading-[1.08]">Every career opportunity across Planet Ecosystem.</h1>
          <p className="mt-5 text-lg leading-relaxed text-white/70">
            Build your CV once, apply to any company in the group, and follow each application from submission to offer.
          </p>
          <p className="mt-10 border-t border-white/15 pt-5 text-sm text-white/50">A sister concern of Sandhani Group of Companies</p>
        </div>
      </section>

      <section className="flex flex-col bg-base-100 px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="lg:invisible"><Logo compact /></div>
          <ThemeToggle />
        </div>
        <div className="mx-auto my-auto w-full max-w-[520px] py-8">{children}</div>
      </section>
    </div>
  )
}
