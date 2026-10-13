import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { resizeImage } from '../../lib/cv/image'

export async function uploadPhoto(source) {
  const blob = await resizeImage(source)
  const form = new FormData()
  form.append('photo', blob, 'photo.jpg')
  return api('/cv/photo', { method: 'POST', formData: form })
}

export default function PhotoUploader({ photoUrl }) {
  const inputRef = useRef(null)
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)

  const remove = useMutation({
    mutationFn: () => api('/cv/photo', { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cv'] }); toast.success('Photo removed') },
  })

  async function handleFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Choose a JPG or PNG image.')
    setBusy(true)
    try {
      await uploadPhoto(file)
      await qc.invalidateQueries({ queryKey: ['cv'] })
      toast.success('Photo updated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
      inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="grid h-[96px] w-[78px] shrink-0 place-items-center overflow-hidden rounded-lg border border-base-300 bg-base-200">
        {photoUrl ? <img src={photoUrl} alt="Your CV photo" className="h-full w-full object-cover" /> : <Camera className="size-6 text-base-content/40" />}
      </div>
      <div>
        <p className="text-sm font-medium">Photo</p>
        <p className="mb-2 text-xs text-base-content/55">A recent passport-style photo with a plain background.</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-sm" onClick={() => inputRef.current.click()} disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : <Camera className="size-4" />} {photoUrl ? 'Change' : 'Upload'}
          </button>
          {photoUrl && <button type="button" className="btn btn-ghost btn-sm text-error" onClick={() => remove.mutate()}><Trash2 className="size-4" /> Remove</button>}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => handleFile(e.target.files[0])} />
      </div>
    </div>
  )
}
