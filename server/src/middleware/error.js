import { ZodError } from 'zod'
import multer from 'multer'
import { fieldErrors } from '@planet/shared'
import { HttpError } from '../lib/httpError.js'

export function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Endpoint not found.' })
}

/**
 * One place that turns every error into a consistent JSON response.
 * Unexpected errors are logged in full on the server, but the client only
 * gets a generic message: stack traces reveal internals to attackers.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Please fix the highlighted fields.', fields: fieldErrors(err) })
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, code: err.code, fields: err.fields })
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'The file is too large (max 2 MB).' : 'Upload failed.'
    return res.status(400).json({ message })
  }
  if (err?.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large.' })
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON.' })
  // Postgres unique violation that slipped past our own checks (e.g. a race).
  if (err?.cause?.code === '23505' || err?.code === '23505') {
    return res.status(409).json({ message: 'This record already exists.' })
  }

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err)
  res.status(500).json({ message: 'Something went wrong on our side. Please try again.' })
}
