import { z } from 'zod'

/**
 * Read and validate environment variables once, at startup.
 * If something required is missing, the server refuses to start with a
 * clear message, instead of failing later in a confusing way ("fail fast").
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  // Where users open the site (used in email links). Render sets RENDER_EXTERNAL_URL automatically.
  APP_URL: z.url().default(process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters. Run: npm run secrets'),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i, 'ENCRYPTION_KEY must be 64 hex characters. Run: npm run secrets'),
  SESSION_HOURS: z.coerce.number().min(1).max(168).default(12),
  TRUST_PROXY: z.coerce.number().default(0), // set to 1 behind Nginx or a load balancer
  // Secure cookies are only sent over HTTPS. Keep true in production. Set false
  // ONLY to test on a plain-HTTP internal address (e.g. http://192.168.1.10).
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().default('Planet Ecosystem Careers <no-reply@planet-ecosystem.local>'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('\n❌ Invalid environment configuration (server/.env):')
  for (const issue of parsed.error.issues) console.error(`   • ${issue.path.join('.')}: ${issue.message}`)
  console.error('\nCopy server/.env.example to server/.env and fill it in.\n')
  process.exit(1)
}

export const env = parsed.data
export const isProduction = env.NODE_ENV === 'production'
