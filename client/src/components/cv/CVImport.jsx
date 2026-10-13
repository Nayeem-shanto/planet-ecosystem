import { useEffect, useState } from 'react'
import { Upload } from 'lucide-react'
import { ACCEPTED_CV_FILES, extractFromFile, parseCVText } from '../../lib/cv/parser'

const MAX_MB = 10

export default function CVImport({ onImported }) {
  const [status, setStatus] = useState('idle') // idle | reading | done | error
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [dragging, setDragging] = useState(false)

  // Turn the extracted photo into something an <img> can show.
  useEffect(() => {
    if (!result?.photo) return setPhotoPreview(null)
    const canvas = document.createElement('canvas')
    canvas.width = result.photo.width
    canvas.height = result.photo.height
    canvas.getContext('2d').drawImage(result.photo, 0, 0)
    setPhotoPreview(canvas.toDataURL('image/jpeg', 0.85))
  }, [result])

  async function handleFile(file) {
    if (!file) return
    if (file.size > MAX_MB * 1024 * 1024) { setStatus('error'); return setError(`The file is larger than ${MAX_MB} MB.`) }
    setStatus('reading'); setError(''); setProgress(0)
    try {
      const { text, photo } = await extractFromFile(file, setProgress)
      if (text.trim().length < 30) throw new Error('No readable text was found. Try a clearer scan, or upload a PDF.')
      setResult({ fileName: file.name, cv: parseCVText(text), photo })
      setStatus('done')
    } catch (err) {
      setError(err.message); setStatus('error')
    }
  }

  const found = result && [
    ['Name', result.cv.personal.fullName], ['Email', result.cv.personal.email], ['Phone', result.cv.personal.phone],
    ['Jobs', result.cv.experience.length], ['Education', result.cv.education.length], ['Skills', result.cv.skills.length],
  ]

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        className={`flex cursor-pointer flex-col items-center rounded-box border-2 border-dashed p-10 text-center transition-colors ${dragging ? 'border-primary bg-accent/50' : 'border-base-300 bg-base-100 hover:border-primary/60'}`}
      >
        <span className="mb-3 grid size-14 place-items-center rounded-full bg-accent text-accent-content"><Upload className="size-7" /></span>
        <span className="text-lg font-semibold">Drop your CV here, or click to choose</span>
        <span className="mt-1 text-sm text-base-content/60">PDF, DOCX, JPG or PNG, up to {MAX_MB} MB. The file stays on your device while it’s read.</span>
        <input type="file" className="sr-only" accept={ACCEPTED_CV_FILES} onChange={(e) => handleFile(e.target.files[0])} />
      </label>

      {status === 'reading' && (
        <div className="rounded-box border border-base-300 bg-base-100 p-5">
          <p className="mb-2 font-medium">Reading your CV…</p>
          <progress className="progress progress-primary w-full" value={progress || undefined} max="100" />
          <p className="mt-2 text-xs text-base-content/60">Images take longer: the text is recognised in your browser (OCR).</p>
        </div>
      )}
      {status === 'error' && <div role="alert" className="alert alert-error alert-soft">{error}</div>}

      {status === 'done' && (
        <div className="rounded-box border border-base-300 bg-base-100 p-5">
          <p className="font-semibold">Read {result.fileName}</p>
          <div className="mt-3 flex gap-4">
            <div className="grid h-[96px] w-[78px] shrink-0 place-items-center overflow-hidden rounded-lg border border-base-300 bg-base-200 text-center text-[11px] text-base-content/50">
              {photoPreview ? <img src={photoPreview} alt="Photo found in your CV" className="h-full w-full object-cover" /> : 'No photo found'}
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {found.map(([label, value]) => (
                <div key={label} className="rounded-lg bg-base-200 p-2.5">
                  <dt className="text-xs text-base-content/60">{label}</dt>
                  <dd className={`break-all font-medium ${value ? '' : 'text-warning'}`}>{value || 'Not found'}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-3 text-sm text-base-content/70">Every CV is laid out differently. After importing, check each section and fill in anything we missed{!result.photo && ', and upload your photo'}.</p>
          <button className="btn btn-primary mt-4" onClick={() => onImported(result.cv, result.photo)}>Use this and review</button>
        </div>
      )}
    </div>
  )
}
