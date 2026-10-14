import fs from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

export const OUTBOX_DIR = path.resolve('storage/outbox')
const useBrevo = Boolean(env.BREVO_API_KEY)
const useSmtp = !useBrevo && Boolean(env.SMTP_HOST)

/**
 * With BREVO_API_KEY: send real email over Brevo's HTTPS API (works where SMTP
 * ports are blocked, e.g. Render free tier).
 * With SMTP settings: send real email over SMTP.
 * Without either (development): save each email as an HTML file you can open at
 * http://localhost:4000/dev/outbox — no mail account needed while building.
 */
const transport = useSmtp
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === 'true',
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      // Fail fast instead of hanging the request for minutes if the port is blocked.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    })
  : null

console.log(`📧 Email mode: ${useBrevo ? 'Brevo API' : useSmtp ? `SMTP (${env.SMTP_HOST}:${env.SMTP_PORT})` : 'dev outbox'}`)

/** "Name <email@x.com>" → { name, email } */
function parseAddress(value) {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  return match ? { name: match[1].replace(/^"|"$/g, '') || undefined, email: match[2] } : { email: value.trim() }
}

async function sendViaBrevo({ to, subject, html, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: parseAddress(env.MAIL_FROM),
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text || undefined,
    }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`)
}

async function saveToOutbox({ to, subject, html }) {
  await fs.mkdir(OUTBOX_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = `${stamp}.html`
  const meta = `<!-- to: ${to} | subject: ${subject} -->\n`
  await fs.writeFile(path.join(OUTBOX_DIR, file), meta + html)
  console.log(`📧 [dev outbox] To ${to}: "${subject}" → http://localhost:${env.PORT}/dev/outbox`)
}

/**
 * Send an email. Never throws: a failed email must not undo the action that
 * triggered it (e.g. the application was still submitted).
 * In a high-traffic system you would put emails on a background queue instead.
 */
export async function sendMail({ to, subject, html, text }) {
  try {
    if (useBrevo) await sendViaBrevo({ to, subject, html, text })
    else if (useSmtp) await transport.sendMail({ from: env.MAIL_FROM, to, subject, html, text })
    else await saveToOutbox({ to, subject, html })
  } catch (err) {
    console.error(`Email to ${to} failed:`, err.message)
  }
}
