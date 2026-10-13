# Planet Ecosystem Careers Portal

The careers portal for **Planet Ecosystem**, a sister concern of Sandhani Group of Companies.
Candidates register, build or import a CV, and apply to jobs. Admins post jobs and review
applicants, super admins approve job posts and recommendations, and the alpha admin approves
staff accounts.

**Stack:** React 19, Vite, Tailwind CSS 4, daisyUI 5, TanStack Query, React Hook Form + Zod ·
Node.js, Express 5, Drizzle ORM · PostgreSQL.

---

## 1. Install the tools (one time)

1. **Node.js 22 LTS** from https://nodejs.org. Check: `node -v` (must be 20.19 or newer).
2. **PostgreSQL 16 or 17** from https://www.postgresql.org/download/windows/.
   During setup, remember the password you choose for the `postgres` user. Keep the port at `5432`.
   The installer also installs **pgAdmin**, a visual tool for the database.

## 2. Create the database

Open **pgAdmin** → connect to your server → right-click **Databases** → **Create → Database…** →
name it `planet_ecosystem` → **Save**.

(Or in a terminal: `psql -U postgres -c "CREATE DATABASE planet_ecosystem;"`)

## 3. Install the project

Unzip, open PowerShell **in the `planet-ecosystem` folder**, then:

```powershell
npm install
```

One install covers the client, server and shared packages (they're npm workspaces).

## 4. Configure the server

```powershell
copy server\.env.example server\.env
npm run secrets
```

Open `server\.env` in VS Code and fill in:

| Setting | What to put |
|---|---|
| `DATABASE_URL` | Replace `YOUR_POSTGRES_PASSWORD` with your postgres password |
| `JWT_SECRET`, `ENCRYPTION_KEY` | Paste the two values `npm run secrets` printed |
| `ALPHA_ADMIN_EMAIL` | The email the alpha admin will sign in with |
| `ALPHA_ADMIN_PASSWORD` | A long password you choose (letters and numbers, 8+ characters) |

> ⚠️ **Back up `ENCRYPTION_KEY`** somewhere safe (a password manager). NID numbers are encrypted
> with it. If it's lost, stored NID numbers can never be read again.

## 5. Create the tables, the alpha admin and starter data

```powershell
npm run db:migrate
npm run create-alpha
npm run db:seed
```

Then **delete the `ALPHA_ADMIN_PASSWORD` line** from `server\.env`. The account exists now;
the password shouldn't sit in a file.

`db:seed` adds the company *Planet IT Solution Limited* and three sample jobs. Add the other
group companies from the alpha admin panel (**Companies → Add company**).

## 6. Run it

```powershell
npm run dev
```

Open **http://localhost:5173**. The API runs on port 4000; the browser never talks to it directly
in development, because Vite forwards `/api` requests.

### Emails in development
With `SMTP_HOST` empty, no real emails are sent. Each one is saved and listed at
**http://localhost:4000/dev/outbox**. Open it to click confirmation links while testing.

## 7. Try the whole flow

1. **Register** a General account → open the dev outbox → click **Confirm email** → sign in.
2. **My CV** → *Import existing CV* (PDF/DOCX/JPG) or fill in the form → **Save CV**.
3. In another browser (or a private window), **Register → Admin**, confirm the email.
   Do the same for **Super admin**.
4. **Sign in → Alpha admin** → **Registrations** → approve both. They receive `ADM-0001` and `SAD-0001`.
5. As admin: **Job posts → New job post**. As super admin: **Job approvals → Approve and publish**.
6. As the candidate: **Find jobs** → sort by *Best match* → **Apply now**.
7. As admin: **Applications** → open the candidate → **Shortlist** → **Recommend to super admin**.
8. As super admin: **Recommendations** → **Approve for interview**.
9. As admin: **Mark as hired**. The candidate sees it in **My applications** and gets an email.

### Automated test
With `npm run dev` running, in a second terminal:
```powershell
$env:SMOKE_ALPHA_EMAIL="your-alpha-email"; $env:SMOKE_ALPHA_PASSWORD="your-alpha-password"
npm run test:smoke -w server
```
It runs 30 checks of the full workflow and permissions (development database only).

---

## Production deployment

1. In `server\.env`: `NODE_ENV=production`, `APP_URL=https://your-domain`, fresh secrets
   (never reuse development ones), and your SMTP details:
   ```
   SMTP_HOST=smtp.yourprovider.com
   SMTP_PORT=587
   SMTP_USER=careers@yourcompany.com
   SMTP_PASS=...
   MAIL_FROM=Planet Ecosystem Careers <careers@yourcompany.com>
   ```
2. Build and start:
   ```powershell
   npm run build
   npm run db:migrate
   npm start
   ```
   Express serves the built React app and the API from **one port** (`PORT`, default 4000).
3. **Use HTTPS.** Put Nginx (or IIS, Caddy) in front with a certificate and set `TRUST_PROXY=1`.
   Login cookies are HTTPS-only in production.
   - To test production mode on a plain-HTTP internal IP *temporarily*, add `COOKIE_SECURE=false`.
     Never leave it like that for real users.
4. Keep the server running with a process manager (e.g. `pm2 start npm --name planet -- start`).
5. **Back up** the PostgreSQL database and the `server/storage/uploads` folder (candidate photos).
6. The image-CV reader (OCR) downloads its language data from `cdn.jsdelivr.net` the first time.
   The server's security policy allows this; if your network blocks that CDN, image import won't
   work (PDF and Word import still will).

---

## Project structure

```
planet-ecosystem/
├── shared/            Rules used by BOTH client and server
│   └── src/           constants (roles, statuses, pipeline), Zod validation, CV match score
├── server/            Express API
│   ├── src/
│   │   ├── config/    env.js: validates .env at startup
│   │   ├── db/        schema.js (all tables), connection pool
│   │   ├── middleware auth (JWT cookie + role checks), CSRF, validation, rate limits,
│   │   │              upload checks, error handling
│   │   ├── routes/    auth, users, companies, jobs, cv, applications, notifications,
│   │   │              analytics, audit, files, dev outbox
│   │   ├── services/  business logic (auth, transitions, public user shape)
│   │   └── lib/       encryption, email + templates, audit log, notifications
│   ├── drizzle/       SQL migrations
│   ├── scripts/       migrate, seed, create-alpha-admin, generate-secrets
│   └── tests/         smoke-test.js
└── client/            React app
    └── src/
        ├── pages/     auth, general (candidate), admin, super, alpha, shared
        ├── components layout, ui, jobs, cv, staff
        ├── lib/       api client, CV parser (PDF/DOCX/OCR), formatting, brand colours
        ├── context/   auth, theme
        └── hooks/     data hooks (TanStack Query)
```

## Changing the database
1. Edit `server/src/db/schema.js`
2. `npm run db:generate -w server` (creates a new SQL migration in `server/drizzle`)
3. Read the generated SQL, then `npm run db:migrate`

## Security summary
- Passwords: bcrypt (cost 12). NID/birth certificate numbers: AES-256-GCM encryption, HMAC for duplicate checks, only last 4 digits shown.
- Sessions: JWT in an **httpOnly** cookie (JavaScript can't read it); the user is reloaded on every request, so suspensions and password changes take effect instantly.
- Every permission is enforced **on the server**; the frontend only hides what you can't use.
- CSRF: SameSite cookies + a required custom header. Strict Content Security Policy, Helmet headers.
- Rate limits on login, registration and email links. Same error for wrong email or wrong password.
- Uploads: real file type checked from the bytes, size-limited, random names, served only to authorised users.
- CSV export is protected against formula injection. Every important action is written to the audit log.

## Known limitations
- CV import is rule-based: unusual layouts may need manual corrections (candidates always review before saving). Old `.doc` files aren't supported; use `.docx` or PDF.
- Photos are extracted automatically from PDF and Word CVs. From photographed CVs (JPG/PNG), candidates upload the photo separately.
- `npm audit` reports a moderate issue in `sprintf-js` (used by the Word reader). It needs an attacker-controlled format string, which this app never passes, so it isn't exploitable here. The dev-only `drizzle-kit` warning doesn't affect the running app.
- Emails are sent directly from the request. For very high volume, move them to a background queue.
