/** An error with an HTTP status code. Throw it anywhere; the error middleware sends it. */
export class HttpError extends Error {
  constructor(status, message, { code, fields } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export const badRequest = (msg, extra) => new HttpError(400, msg, extra)
export const unauthorized = (msg = 'Please sign in.') => new HttpError(401, msg, { code: 'UNAUTHENTICATED' })
export const forbidden = (msg = 'You do not have permission to do this.', extra) => new HttpError(403, msg, extra)
export const notFound = (msg = 'Not found.') => new HttpError(404, msg)
export const conflict = (msg, extra) => new HttpError(409, msg, extra)
