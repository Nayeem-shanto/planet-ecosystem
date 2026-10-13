import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import Modal from '../ui/Modal'
import { api } from '../../lib/api'
import { formatSalary } from '../../lib/format'

export default function ApplyModal({ job, cv, onClose }) {
  const qc = useQueryClient()
  const [salary, setSalary] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [error, setError] = useState('')

  const apply = useMutation({
    mutationFn: () => api('/applications', { method: 'POST', body: { jobId: job.id, expectedSalary: salary, coverLetter } }),
    onSuccess: () => {
      toast.success(`Application sent to ${job.company.name}. We emailed you a confirmation.`)
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['my-applications'] })
      onClose()
    },
    onError: (err) => setError(err.fields?.expectedSalary ?? err.message),
  })

  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (salary === '' || Number(salary) < 0) return setError('Enter your expected monthly salary.')
    apply.mutate()
  }

  return (
    <Modal open={Boolean(job)} onClose={onClose} title={job ? `Apply: ${job.title}` : ''}>
      {job && (!cv?.data?.personal?.fullName ? (
        <div className="space-y-4">
          <p>You need a saved CV before applying. Build one in a few minutes, or import your existing CV.</p>
          <Link to="/app/cv" className="btn btn-primary">Create my CV</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-center gap-4 rounded-box bg-base-200 p-4">
            {cv.photoUrl && <img src={cv.photoUrl} alt="" className="h-14 w-12 rounded object-cover" />}
            <div className="text-sm">
              <p className="font-semibold">{cv.data.personal.fullName}{cv.data.personal.title && `, ${cv.data.personal.title}`}</p>
              <p className="text-base-content/65">Your current CV will be attached. <Link to="/app/cv" className="link">Edit CV</Link></p>
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Expected monthly salary (৳)</span>
            <input type="number" min="0" step="500" className="input w-full" value={salary} onChange={(e) => setSalary(e.target.value)} required />
            <span className="mt-1 block text-xs text-base-content/55">Offered range: {formatSalary(job.salaryMin, job.salaryMax)}</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Cover letter (optional)</span>
            <textarea className="textarea h-32 w-full" maxLength={3000} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} placeholder={`Why are you a good fit for ${job.company.name}?`} />
          </label>
          {error && <div role="alert" className="alert alert-error alert-soft text-sm">{error}</div>}
          <div className="modal-action mt-0">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={apply.isPending}>{apply.isPending && <span className="loading loading-spinner loading-sm" />}Send application</button>
          </div>
        </form>
      ))}
    </Modal>
  )
}
