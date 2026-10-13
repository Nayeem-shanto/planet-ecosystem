import { env } from './config/env.js'
import { pool } from './db/index.js'
import { createApp } from './app.js'

const app = createApp()

// Check the database before accepting traffic, so a bad DATABASE_URL fails loudly.
try {
  await pool.query('select 1')
} catch (err) {
  console.error('\n❌ Cannot connect to PostgreSQL. Check DATABASE_URL in server/.env and that PostgreSQL is running.')
  console.error(`   ${err.message}\n`)
  process.exit(1)
}

const server = app.listen(env.PORT, () => {
  console.log(`\n🪐 Planet Ecosystem API running on http://localhost:${env.PORT} (${env.NODE_ENV})`)
  if (env.NODE_ENV !== 'production') console.log(`   Dev email outbox: http://localhost:${env.PORT}/dev/outbox\n`)
})

// Graceful shutdown: finish in-flight requests, then close DB connections.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => pool.end().then(() => process.exit(0)))
  })
}
