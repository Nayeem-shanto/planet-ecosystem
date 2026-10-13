import { env } from '../config/env.js'

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/**
 * One branded layout for every email. Inline styles only, because most email
 * clients ignore <style> tags. User-provided text is always escaped.
 */
export function layout({ heading, paragraphs = [], button, footnote }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(p)}</p>`).join('')
  const cta = button
    ? `<p style="margin:24px 0"><a href="${button.url}" style="background:#54489C;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">${escapeHtml(button.label)}</a></p>
       <p style="font-size:12px;color:#6b6880;word-break:break-all">If the button doesn't work, open this link: ${button.url}</p>`
    : ''
  const html = `<!doctype html><html><body style="margin:0;background:#f4f3f8;font-family:Arial,Helvetica,sans-serif;color:#1d1a29">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
      <tr><td style="background:linear-gradient(90deg,#6A5CA8,#51449C);background-color:#54489C;padding:20px 28px;color:#fff;font-weight:700;letter-spacing:2px;font-size:15px">PLANET ECOSYSTEM</td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 16px;font-size:20px;color:#0C0C0E">${escapeHtml(heading)}</h1>
        ${body}${cta}
        ${footnote ? `<p style="margin-top:24px;font-size:12px;color:#6b6880">${escapeHtml(footnote)}</p>` : ''}
      </td></tr>
      <tr><td style="padding:16px 28px;background:#faf9fd;font-size:12px;color:#6b6880">Planet Ecosystem, a sister concern of Sandhani Group of Companies. This is an automated message.</td></tr>
    </table>
  </td></tr></table></body></html>`
  const text = [heading, ...paragraphs, button ? `${button.label}: ${button.url}` : '', footnote ?? ''].filter(Boolean).join('\n\n')
  return { html, text }
}

const link = (path) => `${env.APP_URL}${path}`

export const templates = {
  verifyEmail: ({ name, token }) => ({
    subject: 'Confirm your email address',
    ...layout({
      heading: `Welcome, ${name}`,
      paragraphs: ['Thanks for registering with Planet Ecosystem. Confirm your email address to activate your account.'],
      button: { label: 'Confirm email', url: link(`/verify-email?token=${token}`) },
      footnote: 'This link expires in 24 hours. If you did not register, ignore this email.',
    }),
  }),

  staffPending: ({ name, roleLabel }) => ({
    subject: 'Your registration is waiting for approval',
    ...layout({
      heading: 'Email confirmed',
      paragraphs: [`Hi ${name}, your ${roleLabel} registration is now with the alpha admin for approval.`, 'We will email you as soon as it is reviewed. You cannot sign in until then.'],
    }),
  }),

  staffApproved: ({ name, roleLabel, staffCode, companyName }) => ({
    subject: `You are approved as ${roleLabel}`,
    ...layout({
      heading: 'Your account is approved',
      paragraphs: [`Hi ${name}, you have been nominated as ${roleLabel} of ${companyName}.`, `Your ${roleLabel} ID is ${staffCode}.`],
      button: { label: 'Sign in', url: link('/login') },
    }),
  }),

  staffRejected: ({ name, roleLabel, reason }) => ({
    subject: 'Your registration was not approved',
    ...layout({
      heading: 'Registration not approved',
      paragraphs: [`Hi ${name}, your ${roleLabel} registration was not approved.`, reason ? `Reason: ${reason}` : 'Contact your HR team for details.'],
    }),
  }),

  accountSuspended: ({ name }) => ({
    subject: 'Your account has been suspended',
    ...layout({ heading: 'Account suspended', paragraphs: [`Hi ${name}, your Planet Ecosystem account has been suspended. Contact your HR team if you think this is a mistake.`] }),
  }),

  accountReactivated: ({ name }) => ({
    subject: 'Your account is active again',
    ...layout({ heading: 'Account reactivated', paragraphs: [`Hi ${name}, your Planet Ecosystem account is active again.`], button: { label: 'Sign in', url: link('/login') } }),
  }),

  resetPassword: ({ name, token }) => ({
    subject: 'Reset your password',
    ...layout({
      heading: 'Reset your password',
      paragraphs: [`Hi ${name}, we received a request to reset your password.`],
      button: { label: 'Choose a new password', url: link(`/reset-password?token=${token}`) },
      footnote: 'This link expires in 30 minutes. If you did not ask for this, ignore this email; your password stays the same.',
    }),
  }),

  passwordChanged: ({ name }) => ({
    subject: 'Your password was changed',
    ...layout({ heading: 'Password changed', paragraphs: [`Hi ${name}, your password was just changed and you were signed out on all devices.`, 'If this was not you, reset your password immediately and contact HR.'] }),
  }),

  applicationReceived: ({ name, jobTitle, companyName }) => ({
    subject: `Application received: ${jobTitle}`,
    ...layout({
      heading: 'We received your application',
      paragraphs: [`Hi ${name}, your application for ${jobTitle} at ${companyName} has been submitted.`, 'We will email you whenever its status changes.'],
      button: { label: 'Track your application', url: link('/app/applications') },
    }),
  }),

  applicationStatus: ({ name, jobTitle, companyName, statusLabel, message }) => ({
    subject: `Application update: ${jobTitle}`,
    ...layout({
      heading: statusLabel,
      paragraphs: [`Hi ${name}, there is an update on your application for ${jobTitle} at ${companyName}.`, message],
      button: { label: 'View application', url: link('/app/applications') },
    }),
  }),

  jobReviewed: ({ name, jobTitle, approved, note }) => ({
    subject: approved ? `Job published: ${jobTitle}` : `Job not approved: ${jobTitle}`,
    ...layout({
      heading: approved ? 'Your job post is live' : 'Your job post was not approved',
      paragraphs: [`Hi ${name}, the super admin ${approved ? 'approved and published' : 'did not approve'} "${jobTitle}".`, note ? `Note: ${note}` : ''].filter(Boolean),
      button: { label: 'Open job posts', url: link('/admin/jobs') },
    }),
  }),
}
