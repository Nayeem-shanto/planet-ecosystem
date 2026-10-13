/**
 * Label + input + error message, wired for accessibility:
 * the error is linked with aria-describedby so screen readers announce it.
 */
export default function Field({ label, error, hint, children, className = '', id }) {
  const errorId = id ? `${id}-error` : undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      {typeof children === 'function' ? children({ 'aria-invalid': Boolean(error), 'aria-describedby': error ? errorId : undefined }) : children}
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-error">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-base-content/55">{hint}</p>
      ) : null}
    </div>
  )
}
