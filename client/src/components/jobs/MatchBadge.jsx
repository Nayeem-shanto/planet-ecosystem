export default function MatchBadge({ match, size = 'badge-sm' }) {
  if (!match) return null
  const tone = match.score >= 70 ? 'badge-success' : match.score >= 40 ? 'badge-warning' : 'badge-ghost'
  return <span className={`badge badge-soft ${tone} ${size} whitespace-nowrap font-semibold`}>{match.score}% match</span>
}
