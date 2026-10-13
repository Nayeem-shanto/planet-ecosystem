import { forbidden } from '../lib/httpError.js'

/**
 * CSRF protection, layer 2.
 * Browsers will not let another website add a custom header to a request to
 * our API without our CORS permission. So requiring this header on every
 * state-changing request blocks forged requests from other sites.
 */
export function requireCsrfHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (req.get('X-Requested-With') !== 'planet-ecosystem') throw forbidden('Missing security header.')
  next()
}
