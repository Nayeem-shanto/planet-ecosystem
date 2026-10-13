/**
 * Every request to the backend goes through here, so these rules apply everywhere:
 *  - cookies are sent (credentials: 'include'): that's how the server knows who you are
 *  - the CSRF header is added to every request
 *  - errors become ApiError objects with the server's message and field errors
 */
export class ApiError extends Error {
  constructor(status, body = {}) {
    super(body.message || `Request failed (${status})`)
    this.status = status
    this.code = body.code
    this.fields = body.fields
  }
}

export async function api(path, { method = 'GET', body, formData, signal } = {}) {
  const headers = { 'X-Requested-With': 'planet-ecosystem' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError(0, { message: 'Cannot reach the server. Check your connection and try again.' })
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

/** Build "?a=1&b=2" from an object, skipping empty values. */
export function toQuery(params = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) continue
    search.set(key, Array.isArray(value) ? value.join(',') : String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

/** Copy server field errors onto a react-hook-form form. */
export function applyServerErrors(error, setError) {
  if (!(error instanceof ApiError) || !error.fields) return false
  for (const [field, message] of Object.entries(error.fields)) setError(field, { type: 'server', message })
  return true
}
