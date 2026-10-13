// A consistent colour per company, derived from its name.
const PALETTE = ['#54489C', '#2E8B6A', '#C98A1B', '#3B6FB6', '#8A5A44', '#7A4FA0', '#C2414B']
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

export default function CompanyMark({ name = '?', size = 'size-11' }) {
  const words = name.replace(/^Planet\s+/i, '').split(/\s+/).filter(Boolean)
  const letters = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase()
  return (
    <span className={`${size} grid shrink-0 place-items-center rounded-xl text-sm font-bold text-white`} style={{ backgroundColor: PALETTE[hash(name) % PALETTE.length] }} aria-hidden>
      {letters}
    </span>
  )
}
