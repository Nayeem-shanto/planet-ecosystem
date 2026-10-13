const uid = () => crypto.randomUUID()

export const emptyCV = () => ({
  personal: { fullName: '', title: '', email: '', phone: '', address: '', linkedin: '', website: '', summary: '', dateOfBirth: '', nationality: '' },
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
  references: [],
})

export const newExperience = () => ({ id: uid(), role: '', company: '', location: '', start: '', end: '', current: false, details: '' })
export const newEducation = () => ({ id: uid(), degree: '', institution: '', start: '', end: '', result: '' })
export const newCertification = () => ({ id: uid(), name: '', issuer: '', year: '' })
export const newReference = () => ({ id: uid(), name: '', relation: '', contact: '' })

/** Fill any missing keys, e.g. for CVs saved before a field existed. */
export function normalizeCV(data) {
  const base = emptyCV()
  if (!data) return base
  return {
    ...base,
    ...data,
    personal: { ...base.personal, ...(data.personal ?? {}) },
    references: data.references ?? [],
  }
}

export function cvCompleteness(cv, hasPhoto) {
  if (!cv) return 0
  const p = cv.personal
  const checks = [p.fullName, p.title, p.email, p.phone, p.summary?.length > 40, cv.education.length > 0, cv.experience.length > 0 || cv.certifications.length > 0, cv.skills.length >= 3, hasPhoto]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}
