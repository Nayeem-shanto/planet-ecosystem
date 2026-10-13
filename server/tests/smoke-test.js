/**
 * End-to-end smoke test of the whole hiring workflow, through the real API.
 *
 * DEVELOPMENT ONLY. It creates test accounts and data in your database.
 * Requirements:
 *   1. The server is running in development mode (npm run dev)
 *   2. SMTP_HOST is empty (the test reads confirmation links from the dev outbox)
 *   3. Pass the alpha admin login on the command line:
 *        SMOKE_ALPHA_EMAIL=you@x.com SMOKE_ALPHA_PASSWORD=... npm run test:smoke -w server
 *      (PowerShell: $env:SMOKE_ALPHA_EMAIL="you@x.com"; $env:SMOKE_ALPHA_PASSWORD="..."; npm run test:smoke -w server)
 */
const BASE = process.env.SMOKE_API_URL ?? 'http://localhost:4000'
const ALPHA = { email: process.env.SMOKE_ALPHA_EMAIL, password: process.env.SMOKE_ALPHA_PASSWORD }
if (!ALPHA.email || !ALPHA.password) {
  console.error('Set SMOKE_ALPHA_EMAIL and SMOKE_ALPHA_PASSWORD first (see the comment at the top of this file).')
  process.exit(1)
}

const run = Date.now()
const digits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('')
const sessions = {}
let failures = 0

async function call(who, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'planet-ecosystem', ...(sessions[who] && { Cookie: sessions[who] }) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const cookie = res.headers.get('set-cookie')
  if (cookie) sessions[who] = cookie.split(';')[0]
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data }
}

function expect(label, result, status) {
  const ok = result.status === status
  if (!ok) failures++
  console.log(`${ok ? '✓' : '✗'} ${label} (${result.status}${ok ? '' : `, expected ${status}: ${JSON.stringify(result.data).slice(0, 160)}`})`)
  return result
}

async function confirmationToken(email) {
  const html = await (await fetch(`${BASE}/dev/outbox-latest?to=${encodeURIComponent(email)}`)).text()
  return html.match(/token=([A-Za-z0-9_-]+)/)?.[1]
}

const password = 'SmokeTest123'
const candidate = { name: 'Smoke Candidate', email: `candidate.${run}@smoke.test`, phone: '01712345678', idType: 'nid', idNumber: digits(10), workType: 'job_seeker', workDetail: 'QA', password, confirmPassword: password }

// --- Security basics ---
expect('Requests without the CSRF header are rejected', { status: (await fetch(`${BASE}/api/auth/login`, { method: 'POST' })).status }, 403)

// --- Candidate registration ---
expect('Candidate registers', await call('c', 'POST', '/api/auth/register/general', candidate), 201)
expect('Duplicate email is rejected', await call('c', 'POST', '/api/auth/register/general', candidate), 409)
expect('Login blocked before email confirmation', await call('c', 'POST', '/api/auth/login', { email: candidate.email, password, role: 'general' }), 403)
expect('Email confirmed', await call('c', 'POST', '/api/auth/verify-email', { token: await confirmationToken(candidate.email) }), 200)
expect('Wrong role tab is rejected', await call('c', 'POST', '/api/auth/login', { email: candidate.email, password, role: 'admin' }), 403)
expect('Candidate signs in', await call('c', 'POST', '/api/auth/login', { email: candidate.email, password, role: 'general' }), 200)

// --- Staff registration and approval ---
const { companies } = (await call('x', 'GET', '/api/companies/public')).data
if (!companies.length) { console.error('No companies. Run: npm run db:seed'); process.exit(1) }
const staff = (role, n) => ({ name: `Smoke ${role}`, email: `${role}.${run}@smoke.test`, phone: '01812345678', employeeId: `SMK-${n}`, idNumber: digits(13), companyId: companies[0].id, designation: 'Tester', password, confirmPassword: password })
for (const [role, who] of [['admin', 'a'], ['super_admin', 's']]) {
  const s = staff(role, who)
  expect(`${role} registers`, await call(who, 'POST', `/api/auth/register/${role}`, s), 201)
  await call(who, 'POST', '/api/auth/verify-email', { token: await confirmationToken(s.email) })
  expect(`${role} cannot sign in before approval`, await call(who, 'POST', '/api/auth/login', { email: s.email, password, role }), 403)
}
expect('Alpha admin signs in', await call('alpha', 'POST', '/api/auth/login', { ...ALPHA, role: 'alpha_admin' }), 200)
const pending = (await call('alpha', 'GET', '/api/users/pending')).data.users.filter((u) => u.email.includes(`.${run}@`))
for (const u of pending) expect(`Alpha approves ${u.email}`, await call('alpha', 'POST', `/api/users/${u.id}/approve`), 200)
expect('Admin signs in', await call('a', 'POST', '/api/auth/login', { email: staff('admin', 'a').email, password, role: 'admin' }), 200)
expect('Super admin signs in', await call('s', 'POST', '/api/auth/login', { email: staff('super_admin', 's').email, password, role: 'super_admin' }), 200)

// --- Permissions ---
expect('Candidate cannot list users', await call('c', 'GET', '/api/users'), 403)
expect('Admin cannot see analytics', await call('a', 'GET', '/api/analytics/overview'), 403)

// --- Job approval ---
const job = await call('a', 'POST', '/api/jobs', {
  companyId: companies[0].id, title: `Smoke Test Job ${run}`, category: 'Other', type: 'Full-time', workplace: 'On-site', location: 'Dhaka',
  experienceMin: 0, salaryMin: 20000, salaryMax: 30000, vacancies: 1, deadline: new Date(Date.now() + 7 * 864e5).toISOString(),
  description: 'A job created by the automated smoke test. Safe to delete.', responsibilities: [], requirements: [], benefits: [], skills: ['Testing'],
})
expect('Admin creates a job (waits for approval)', job, 201)
const jobId = job.data.job.id
const hidden = !(await call('c', 'GET', '/api/jobs')).data.jobs.some((j) => j.id === jobId)
expect('Unapproved job is hidden from candidates', { status: hidden ? 200 : 500 }, 200)
expect('Super admin approves the job', await call('s', 'POST', `/api/jobs/${jobId}/review`, { decision: 'approve' }), 200)

// --- Hiring pipeline ---
expect('Applying without a CV is rejected', await call('c', 'POST', '/api/applications', { jobId, expectedSalary: 25000 }), 400)
expect('Candidate saves CV', await call('c', 'PUT', '/api/cv', { personal: { fullName: 'Smoke Candidate' }, experience: [], education: [], skills: ['Testing'], languages: [], certifications: [], references: [] }), 200)
const app = expect('Candidate applies', await call('c', 'POST', '/api/applications', { jobId, expectedSalary: 25000 }), 201)
const appId = app.data.application.id
expect('Admin cannot skip to interview', await call('a', 'POST', `/api/applications/${appId}/status`, { status: 'interview' }), 403)
expect('Admin shortlists', await call('a', 'POST', `/api/applications/${appId}/status`, { status: 'shortlisted' }), 200)
expect('Admin recommends (with note)', await call('a', 'POST', `/api/applications/${appId}/status`, { status: 'recommended', note: 'Smoke test recommendation' }), 200)
expect('Super admin approves for interview', await call('s', 'POST', `/api/applications/${appId}/status`, { status: 'interview' }), 200)
expect('Admin marks hired', await call('a', 'POST', `/api/applications/${appId}/status`, { status: 'hired' }), 200)
const mine = (await call('c', 'GET', '/api/applications/mine')).data.applications.find((a) => a.id === appId)
expect('Candidate sees "Hired"', { status: mine?.statusLabel === 'Hired' ? 200 : 500 }, 200)

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.')
process.exit(failures ? 1 : 0)
