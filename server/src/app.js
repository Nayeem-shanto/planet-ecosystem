import path from 'node:path'
import fs from 'node:fs'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { env, isProduction } from './config/env.js'
import { requireCsrfHeader } from './middleware/csrf.js'
import { apiLimiter } from './middleware/rateLimit.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import authRoutes from './routes/auth.routes.js'
import companyRoutes from './routes/companies.routes.js'
import userRoutes from './routes/users.routes.js'
import jobRoutes from './routes/jobs.routes.js'
import cvRoutes from './routes/cv.routes.js'
import applicationRoutes from './routes/applications.routes.js'
import notificationRoutes from './routes/notifications.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import auditRoutes from './routes/audit.routes.js'
import fileRoutes from './routes/files.routes.js'
import devRoutes from './routes/dev.routes.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by') // don't advertise the framework
  app.set('trust proxy', env.TRUST_PROXY) // correct client IPs behind Nginx

  // Security headers. The Content Security Policy lists exactly where scripts,
  // fonts and connections may come from, which limits the damage of any XSS bug.
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'wasm-unsafe-eval'", 'blob:', 'https://cdn.jsdelivr.net'], // OCR engine
        workerSrc: ["'self'", 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://tessdata.projectnaptha.com'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"], // can't be put in an iframe (clickjacking)
      },
    },
    crossOriginEmbedderPolicy: false,
  }))

  // In development the client runs on another port; in production both are
  // served from this one server, so CORS stays closed.
  if (!isProduction) app.use(cors({ origin: env.APP_URL, credentials: true }))

  app.use(morgan(isProduction ? 'combined' : 'dev'))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.get('/api/health', (req, res) => res.json({ ok: true }))

  const api = express.Router()
  api.use(apiLimiter, requireCsrfHeader)
  api.use('/auth', authRoutes)
  api.use('/companies', companyRoutes)
  api.use('/users', userRoutes)
  api.use('/jobs', jobRoutes)
  api.use('/cv', cvRoutes)
  api.use('/applications', applicationRoutes)
  api.use('/notifications', notificationRoutes)
  api.use('/analytics', analyticsRoutes)
  api.use('/audit', auditRoutes)
  api.use('/files', fileRoutes)
  api.use(notFoundHandler)
  app.use('/api', api)

  if (!isProduction) app.use('/dev', devRoutes)

  // Production: serve the built React app, and send every non-API URL to
  // index.html so client-side routes like /app/jobs survive a page refresh.
  const clientDist = path.resolve('../client/dist')
  if (isProduction && fs.existsSync(clientDist)) {
    // Files in /assets have a content hash in their name, so they can be cached
    // for a year. Everything else (index.html, theme-init.js) must stay fresh.
    app.use('/assets', express.static(path.join(clientDist, 'assets'), { maxAge: '1y', immutable: true }))
    app.use(express.static(clientDist, { index: false, maxAge: 0 }))
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.set('Cache-Control', 'no-cache')
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  app.use(errorHandler)
  return app
}
