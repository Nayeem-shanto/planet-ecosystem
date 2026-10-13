import { APP_TRANSITIONS, CANDIDATE_STATUS_LABELS } from '@planet/shared'
import { forbidden } from '../lib/httpError.js'

/** Throw unless this role is allowed to move an application from → to. */
export function assertTransition(role, from, to) {
  const allowed = APP_TRANSITIONS[role]?.[from] ?? []
  if (!allowed.includes(to)) {
    throw forbidden(`You can't move an application from "${from}" to "${to}".`, { code: 'INVALID_TRANSITION' })
  }
}

/** Does the candidate see a different status after this change? Only then do we email them. */
export const candidateSeesChange = (from, to) => CANDIDATE_STATUS_LABELS[from] !== CANDIDATE_STATUS_LABELS[to]

export const CANDIDATE_MESSAGES = {
  shortlisted: 'Good news: you have been shortlisted. The hiring team is reviewing your profile further.',
  interview: 'Congratulations, you have been selected for an interview. The hiring team will contact you with the details.',
  hired: 'Congratulations, you have been selected for this position. The HR team will contact you about the next steps.',
  rejected: 'Thank you for your interest. After careful review, the team has decided not to move forward with your application this time. We encourage you to apply for other roles.',
}
