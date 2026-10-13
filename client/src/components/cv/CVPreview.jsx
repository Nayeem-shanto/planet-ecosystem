/**
 * The CV in a standard single-column, reverse-chronological layout: the format
 * recruiters and applicant tracking systems read most reliably. A passport-style
 * photo sits top right, as is standard for CVs in Bangladesh.
 */
const BRAND = '#54489C'

function Heading({ children }) {
  return <h3 className="mb-2 mt-5 border-b pb-1 text-[12.5px] font-bold tracking-wide" style={{ color: BRAND, borderColor: '#d9d5ea' }}>{children}</h3>
}

const period = (start, end, current) => [start, current ? 'Present' : end].filter(Boolean).join(' – ')

export default function CVPreview({ cv, photoUrl, printable = false }) {
  const { personal: p, experience, education, skills, languages, certifications, references = [] } = cv
  const contact = [p.email, p.phone, p.address, p.linkedin, p.website].filter(Boolean)
  const personalRows = [['Date of birth', p.dateOfBirth], ['Nationality', p.nationality]].filter(([, v]) => v)
  const isEmpty = !p.fullName && !experience.length && !education.length

  return (
    <div className={`${printable ? 'cv-print' : ''} mx-auto min-h-[640px] w-full max-w-[794px] rounded-sm bg-white p-[7%] font-sans text-[11.5px] leading-relaxed text-[#23202f] shadow-xl ring-1 ring-black/5`}>
      {isEmpty ? (
        <div className="grid min-h-[520px] place-items-center text-center text-neutral-400">Your CV preview appears here as you fill in the form.</div>
      ) : (
        <>
          <header className="flex items-start justify-between gap-6 border-b-2 pb-4" style={{ borderColor: BRAND }}>
            <div className="min-w-0">
              <h2 className="text-[25px] font-extrabold leading-tight text-[#0C0C0E]">{p.fullName || 'Your name'}</h2>
              {p.title && <p className="text-[13.5px] font-semibold" style={{ color: BRAND }}>{p.title}</p>}
              {contact.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[10.5px] text-neutral-600">
                  {contact.map((c) => <span key={c} className="break-all">{c}</span>)}
                </p>
              )}
            </div>
            {photoUrl && <img src={photoUrl} alt="" className="h-[118px] w-[96px] shrink-0 rounded-sm object-cover ring-1 ring-neutral-200" />}
          </header>

          {p.summary && (<><Heading>Career summary</Heading><p>{p.summary}</p></>)}

          {experience.length > 0 && (
            <>
              <Heading>Work experience</Heading>
              <div className="space-y-3">
                {experience.map((x) => (
                  <div key={x.id} className="break-inside-avoid">
                    <div className="flex justify-between gap-4">
                      <p className="font-semibold">{x.role}{x.company && <span className="font-normal">, {x.company}</span>}</p>
                      <p className="shrink-0 text-neutral-500">{period(x.start, x.end, x.current)}</p>
                    </div>
                    {x.location && <p className="text-neutral-500">{x.location}</p>}
                    {x.details && <ul className="mt-1 list-disc space-y-0.5 pl-4">{x.details.split('\n').filter(Boolean).map((line, i) => <li key={i}>{line}</li>)}</ul>}
                  </div>
                ))}
              </div>
            </>
          )}

          {education.length > 0 && (
            <>
              <Heading>Education</Heading>
              <div className="space-y-2">
                {education.map((x) => (
                  <div key={x.id} className="flex justify-between gap-4 break-inside-avoid">
                    <div><p className="font-semibold">{x.degree}</p><p>{x.institution}{x.result && <span className="text-neutral-500">, {x.result}</span>}</p></div>
                    <p className="shrink-0 text-neutral-500">{period(x.start, x.end)}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {skills.length > 0 && (<><Heading>Skills</Heading><p>{skills.join(', ')}</p></>)}

          {certifications.length > 0 && (
            <>
              <Heading>Training and certifications</Heading>
              <ul className="space-y-0.5">{certifications.map((c) => <li key={c.id}><span className="font-semibold">{c.name}</span>{c.issuer && `, ${c.issuer}`}{c.year && <span className="text-neutral-500"> ({c.year})</span>}</li>)}</ul>
            </>
          )}

          {languages.length > 0 && (<><Heading>Languages</Heading><p>{languages.join(', ')}</p></>)}

          {personalRows.length > 0 && (
            <>
              <Heading>Personal details</Heading>
              <dl className="grid grid-cols-[120px_1fr] gap-y-0.5">{personalRows.flatMap(([k, v]) => [<dt key={`${k}-t`} className="text-neutral-500">{k}</dt>, <dd key={`${k}-d`}>{v}</dd>])}</dl>
            </>
          )}

          {references.length > 0 && (
            <>
              <Heading>References</Heading>
              <div className="grid gap-3 sm:grid-cols-2">{references.map((r) => <div key={r.id}><p className="font-semibold">{r.name}</p><p>{r.relation}</p><p className="text-neutral-500">{r.contact}</p></div>)}</div>
            </>
          )}
        </>
      )}
    </div>
  )
}
