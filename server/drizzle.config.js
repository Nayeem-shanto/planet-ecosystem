import { defineConfig } from 'drizzle-kit'

// Used only when YOU change src/db/schema.js and need a new migration:
//   npm run db:generate -w server
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.js',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL },
})
