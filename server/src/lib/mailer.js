import fs from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

export const OUTBOX_DIR = path.resolve('storage/outbox')
const useSmtp = Boolean(env.SMTP_HOST)

/**
 * With SMTP settings: send real email.
 * Without them (development): save each email as an HTML file you can open at
 * http://localhost:4000/dev/outbox — no mail account needed while building.
 */
const transport = useSmtp
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === 'true',
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null

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
    if (useSmtp) await transport.sendMail({ from: env.MAIL_FROM, to, subject, html, text })
    else await saveToOutbox({ to, subject, html })
  } catch (err) {
    console.error(`Email to ${to} failed:`, err.message)
  }
}
