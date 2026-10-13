import fs from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'
import { OUTBOX_DIR } from '../lib/mailer.js'

/**
 * DEVELOPMENT ONLY. Lists emails the app "sent" while no SMTP server is set.
 * app.js only mounts this when NODE_ENV is not production.
 */
const router = Router()

router.get('/outbox', async (req, res) => {
  const files = (await fs.readdir(OUTBOX_DIR).catch(() => [])).filter((f) => f.endsWith('.html')).sort().reverse()
  const items = await Promise.all(files.slice(0, 100).map(async (file) => {
    const head = (await fs.readFile(path.join(OUTBOX_DIR, file), 'utf8')).split('\n')[0]
    const [, to = '', subject = ''] = head.match(/to: (.*?) \| subject: (.*?) -->/) ?? []
    return { file, to, subject }
  }))
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  res.send(`<!doctype html><meta charset="utf-8"><title>Dev outbox</title>
  <body style="font-family:system-ui;max-width:900px;margin:32px auto;padding:0 16px;color:#1d1a29">
  <h1 style="color:#54489C">Development email outbox</h1>
  <p>Emails are saved here because no SMTP server is configured in <code>server/.env</code>. Newest first.</p>
  <table style="width:100%;border-collapse:collapse">${items.map((i) => `<tr style="border-top:1px solid #e7e4f2">
    <td style="padding:8px">${esc(i.to)}</td><td style="padding:8px"><a href="/dev/outbox/${encodeURIComponent(i.file)}">${esc(i.subject)}</a></td>
    <td style="padding:8px;color:#6b6880">${esc(i.file.slice(0, 19).replace('T', ' '))}</td></tr>`).join('') || '<tr><td>No emails yet.</td></tr>'}
  </table></body>`)
})

router.get('/outbox/:file', async (req, res) => {
  res.sendFile(path.join(OUTBOX_DIR, path.basename(req.params.file)))
})

/** The newest email sent to an address (used by automated tests). */
router.get('/outbox-latest', async (req, res) => {
  const to = String(req.query.to ?? '')
  const files = (await fs.readdir(OUTBOX_DIR).catch(() => [])).filter((f) => f.endsWith('.html')).sort().reverse()
  for (const file of files) {
    const html = await fs.readFile(path.join(OUTBOX_DIR, file), 'utf8')
    if (html.startsWith(`<!-- to: ${to} |`)) return res.type('text/plain').send(html)
  }
  res.status(404).send('none')
})

export default router
