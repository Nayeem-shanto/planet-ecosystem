import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from '../config/env.js'
import * as schema from './schema.js'

// A pool keeps a few connections open and reuses them, instead of opening a
// new connection (slow) for every request.
export const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 })
export const db = drizzle(pool, { schema })
export { schema }
