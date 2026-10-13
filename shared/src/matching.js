/**
 * How well does a CV fit a job? Explainable on purpose:
 * skill overlap (70%) + experience fit (30%).
 * Shared by the server (sorting applicants) and the client (job board).
 */
const normalize = (s) => String(s).toLowerCase().trim()

export function yearsOfExperience(cv) {
  const thisYear = new Date().getFullYear()
  return (cv?.experience ?? []).reduce((total, item) => {
    const start = parseInt(item.start, 10)
    const end = item.current ? thisYear : parseInt(item.end, 10)
    return Number.isNaN(start) || Number.isNaN(end) || end < start ? total : total + (end - start)
  }, 0)
}

export function matchScore(job, cv) {
  if (!cv?.skills?.length) return null
  const cvSkills = new Set(cv.skills.map(normalize))
  const jobSkills = job.skills ?? []
  const matchedSkills = jobSkills.filter((s) => cvSkills.has(normalize(s)))
  const missingSkills = jobSkills.filter((s) => !cvSkills.has(normalize(s)))
  const skillPart = jobSkills.length ? matchedSkills.length / jobSkills.length : 0.5
  const required = Number(job.experienceMin) || 0
  const expPart = required === 0 ? 1 : Math.min(yearsOfExperience(cv) / required, 1)
  return { score: Math.round((skillPart * 0.7 + expPart * 0.3) * 100), matchedSkills, missingSkills }
}
