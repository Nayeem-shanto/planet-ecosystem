import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { newCertification, newEducation, newExperience, newReference } from '../../lib/cv/model'
import { splitList } from '../../lib/format'
import PhotoUploader from './PhotoUploader'

function Input({ label, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input className="input input-sm w-full" {...props} />
    </label>
  )
}

function Card({ title, action, children }) {
  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Keeps the raw text so typing commas feels natural, while storing an array. */
function ListInput({ label, value, onChange, placeholder }) {
  const [text, setText] = useState(value.join(', '))
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <textarea className="textarea textarea-sm h-20 w-full" value={text} placeholder={placeholder}
        onChange={(e) => { setText(e.target.value); onChange(splitList(e.target.value)) }} />
      {value.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{value.map((v) => <span key={v} className="badge badge-sm bg-base-200">{v}</span>)}</div>}
    </label>
  )
}

export default function CVForm({ cv, onChange, photoUrl }) {
  const setPersonal = (key, value) => onChange({ ...cv, personal: { ...cv.personal, [key]: value } })
  const update = (section, id, key, value) => onChange({ ...cv, [section]: cv[section].map((x) => (x.id === id ? { ...x, [key]: value } : x)) })
  const add = (section, factory) => onChange({ ...cv, [section]: [...cv[section], factory()] })
  const remove = (section, id) => onChange({ ...cv, [section]: cv[section].filter((x) => x.id !== id) })

  const addBtn = (section, factory, label) => (
    <button type="button" className="btn btn-ghost btn-sm text-primary" onClick={() => add(section, factory)}><Plus className="size-4" /> {label}</button>
  )
  const removeBtn = (section, id) => (
    <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => remove(section, id)}><Trash2 className="size-3.5" /> Remove</button>
  )
  const p = cv.personal

  return (
    <div className="space-y-4">
      <Card title="Personal details">
        <div className="mb-5"><PhotoUploader photoUrl={photoUrl} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Full name" value={p.fullName} onChange={(e) => setPersonal('fullName', e.target.value)} />
          <Input label="Professional headline" placeholder="e.g. Staff Nurse, Frontend Developer" value={p.title} onChange={(e) => setPersonal('title', e.target.value)} />
          <Input label="Email" type="email" value={p.email} onChange={(e) => setPersonal('email', e.target.value)} />
          <Input label="Phone" value={p.phone} onChange={(e) => setPersonal('phone', e.target.value)} />
          <Input label="Address" className="sm:col-span-2" value={p.address} onChange={(e) => setPersonal('address', e.target.value)} />
          <Input label="Date of birth" placeholder="e.g. 14 March 1998" value={p.dateOfBirth} onChange={(e) => setPersonal('dateOfBirth', e.target.value)} />
          <Input label="Nationality" value={p.nationality} onChange={(e) => setPersonal('nationality', e.target.value)} />
          <Input label="LinkedIn" value={p.linkedin} onChange={(e) => setPersonal('linkedin', e.target.value)} />
          <Input label="Website or portfolio" value={p.website} onChange={(e) => setPersonal('website', e.target.value)} />
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Career summary</span>
            <textarea className="textarea textarea-sm h-24 w-full" placeholder="Two or three sentences: who you are, what you’re good at, and what you want next." value={p.summary} onChange={(e) => setPersonal('summary', e.target.value)} />
          </label>
        </div>
      </Card>

      <Card title="Work experience" action={addBtn('experience', newExperience, 'Add job')}>
        {cv.experience.length === 0 && <p className="text-sm text-base-content/60">Internships, part-time work and volunteering all count.</p>}
        <div className="space-y-4">
          {cv.experience.map((x) => (
            <div key={x.id} className="rounded-lg border border-base-300 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Job title" value={x.role} onChange={(e) => update('experience', x.id, 'role', e.target.value)} />
                <Input label="Organization" value={x.company} onChange={(e) => update('experience', x.id, 'company', e.target.value)} />
                <Input label="Location" value={x.location} onChange={(e) => update('experience', x.id, 'location', e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Start year" inputMode="numeric" value={x.start} onChange={(e) => update('experience', x.id, 'start', e.target.value)} />
                  <Input label="End year" inputMode="numeric" disabled={x.current} value={x.current ? '' : x.end} onChange={(e) => update('experience', x.id, 'end', e.target.value)} />
                </div>
                <label className="label cursor-pointer gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={x.current} onChange={(e) => update('experience', x.id, 'current', e.target.checked)} />
                  I currently work here
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium">What you did (one point per line)</span>
                  <textarea className="textarea textarea-sm h-24 w-full" value={x.details} onChange={(e) => update('experience', x.id, 'details', e.target.value)} />
                </label>
              </div>
              <div className="mt-2 text-right">{removeBtn('experience', x.id)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Education" action={addBtn('education', newEducation, 'Add education')}>
        <div className="space-y-4">
          {cv.education.map((x) => (
            <div key={x.id} className="rounded-lg border border-base-300 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Degree or exam" placeholder="e.g. B.Sc. in Nursing, HSC" value={x.degree} onChange={(e) => update('education', x.id, 'degree', e.target.value)} />
                <Input label="Institution" value={x.institution} onChange={(e) => update('education', x.id, 'institution', e.target.value)} />
                <Input label="Result" placeholder="e.g. CGPA 3.60/4.00" value={x.result} onChange={(e) => update('education', x.id, 'result', e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Start year" inputMode="numeric" value={x.start} onChange={(e) => update('education', x.id, 'start', e.target.value)} />
                  <Input label="End year" inputMode="numeric" value={x.end} onChange={(e) => update('education', x.id, 'end', e.target.value)} />
                </div>
              </div>
              <div className="mt-2 text-right">{removeBtn('education', x.id)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Skills and languages">
        <div className="grid gap-4">
          <ListInput label="Skills (separate with commas)" placeholder="e.g. Patient care, MS Excel, React" value={cv.skills} onChange={(skills) => onChange({ ...cv, skills })} />
          <ListInput label="Languages" placeholder="Bangla, English" value={cv.languages} onChange={(languages) => onChange({ ...cv, languages })} />
        </div>
      </Card>

      <Card title="Training and certifications" action={addBtn('certifications', newCertification, 'Add')}>
        <div className="space-y-3">
          {cv.certifications.map((x) => (
            <div key={x.id} className="grid items-end gap-3 sm:grid-cols-[2fr_1.5fr_0.8fr_auto]">
              <Input label="Name" value={x.name} onChange={(e) => update('certifications', x.id, 'name', e.target.value)} />
              <Input label="Issued by" value={x.issuer} onChange={(e) => update('certifications', x.id, 'issuer', e.target.value)} />
              <Input label="Year" value={x.year} onChange={(e) => update('certifications', x.id, 'year', e.target.value)} />
              <button type="button" className="btn btn-ghost btn-sm btn-square text-error" onClick={() => remove('certifications', x.id)} aria-label="Remove"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="References" action={cv.references.length < 5 && addBtn('references', newReference, 'Add reference')}>
        <div className="space-y-3">
          {cv.references.map((x) => (
            <div key={x.id} className="grid items-end gap-3 sm:grid-cols-[1.2fr_1.5fr_1.3fr_auto]">
              <Input label="Name" value={x.name} onChange={(e) => update('references', x.id, 'name', e.target.value)} />
              <Input label="Position and organization" value={x.relation} onChange={(e) => update('references', x.id, 'relation', e.target.value)} />
              <Input label="Phone or email" value={x.contact} onChange={(e) => update('references', x.id, 'contact', e.target.value)} />
              <button type="button" className="btn btn-ghost btn-sm btn-square text-error" onClick={() => remove('references', x.id)} aria-label="Remove"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
