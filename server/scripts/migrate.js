import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from '../src/db/index.js'

// Applies every migration in ./drizzle that hasn't run yet. Safe to run many times.
await migrate(db, { migrationsFolder: './drizzle' })
console.log('✅ Database is up to date.')
await pool.end()
