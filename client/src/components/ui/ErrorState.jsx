import { AlertTriangle } from 'lucide-react'

export default function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-box border border-error/30 bg-error/5 px-6 py-10 text-center">
      <AlertTriangle className="mb-2 size-7 text-error" aria-hidden />
      <p className="font-semibold">Couldn’t load this</p>
      <p className="mt-1 text-sm text-base-content/70">{error?.message}</p>
      {onRetry && <button className="btn btn-sm mt-4" onClick={onRetry}>Try again</button>}
    </div>
  )
}
