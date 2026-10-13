import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthContext'
import { useCV } from '../../hooks/useCV'
import { api } from '../../lib/api'
import { emptyCV, normalizeCV } from '../../lib/cv/model'
import CVForm from '../../components/cv/CVForm'
import CVPreview from '../../components/cv/CVPreview'
import CVImport from '../../components/cv/CVImport'
import { uploadPhoto } from '../../components/cv/PhotoUploader'
import PageHeader from '../../components/ui/PageHeader'
import PageLoader from '../../components/ui/PageLoader'
import ErrorState from '../../components/ui/ErrorState'

export default function CVPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const saved = useCV()
  const [draft, setDraft] = useState(null)
  const [savedJSON, setSavedJSON] = useState('')
  const [tab, setTab] = useState('form')
  const [formKey, setFormKey] = useState(0)

  // Start the draft from the saved CV, or pre-fill name/email/phone for new users.
  useEffect(() => {
    if (saved.isSuccess && draft === null) {
      const hasSaved = Boolean(saved.data?.data?.personal?.fullName)
      const initial = hasSaved
        ? normalizeCV(saved.data.data)
        : { ...emptyCV(), personal: { ...emptyCV().personal, fullName: user.name, email: user.email, phone: user.phone } }
      setDraft(initial)
      setSavedJSON(hasSaved ? JSON.stringify(initial) : '')
    }
  }, [saved.isSuccess, saved.data, draft, user])

  const dirty = draft && JSON.stringify(draft) !== savedJSON

  useEffect(() => {
    if (!dirty) return
    const warn = (e) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = useMutation({
    mutationFn: () => api('/cv', { method: 'PUT', body: draft }),
    onSuccess: ({ cv }) => {
      // The server returns the cleaned version (trimmed text, defaults filled in).
      // Use it as the new draft too, so "Saved" reflects exactly what's stored.
      const normalized = normalizeCV(cv.data)
      setDraft(normalized)
      setSavedJSON(JSON.stringify(normalized))
      qc.setQueryData(['cv'], cv)
      qc.invalidateQueries({ queryKey: ['jobs'] }) // match scores depend on the CV
      toast.success('CV saved')
    },
    onError: (err) => toast.error(err.message),
  })

  async function handleImported(imported, photo) {
    if (savedJSON && !confirm('Replace your current CV with the imported one? You can review it before saving.')) return
    setDraft({ ...imported, personal: { ...imported.personal, email: imported.personal.email || user.email } })
    setFormKey((k) => k + 1)
    setTab('form')
    if (photo) {
      try {
        await uploadPhoto(photo)
        await qc.invalidateQueries({ queryKey: ['cv'] })
        toast.success('CV imported with your photo. Review each section, then save.')
        return
      } catch { /* fall through to the message below */ }
    }
    toast.info('CV imported. Review each section, add your photo, then save.')
  }

  if (saved.isError) return <ErrorState error={saved.error} onRetry={saved.refetch} />
  if (!draft) return <PageLoader />
  const photoUrl = saved.data?.photoUrl

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="My CV"
        description="Fill in the form or import your existing CV. The preview is exactly what employers receive."
        actions={<>
          <button className="btn btn-outline" onClick={() => window.print()}><Printer className="size-4" /> Download PDF</button>
          <button className="btn btn-primary" onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
            {save.isPending && <span className="loading loading-spinner loading-sm" />}{dirty ? 'Save CV' : 'Saved'}
          </button>
        </>}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div role="tablist" className="tabs tabs-box mb-4 w-fit bg-base-300/60">
            <button role="tab" className={`tab ${tab === 'form' ? 'tab-active' : ''}`} onClick={() => setTab('form')}>Fill in the form</button>
            <button role="tab" className={`tab ${tab === 'import' ? 'tab-active' : ''}`} onClick={() => setTab('import')}>Import existing CV</button>
          </div>
          {tab === 'form' ? <CVForm key={formKey} cv={draft} onChange={setDraft} photoUrl={photoUrl} /> : <CVImport onImported={handleImported} />}
        </div>
        <div className="xl:sticky xl:top-24 xl:self-start">
          <p className="mb-2 text-sm text-base-content/55">Preview (A4). “Download PDF” opens print: choose “Save as PDF”.</p>
          <CVPreview cv={draft} photoUrl={photoUrl} printable />
        </div>
      </div>
    </div>
  )
}
