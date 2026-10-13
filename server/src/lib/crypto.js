import crypto from 'node:crypto'
import { env } from '../config/env.js'

const key = Buffer.from(env.ENCRYPTION_KEY, 'hex')

/**
 * Encrypt sensitive values (NID / birth certificate numbers) with AES-256-GCM.
 * GCM also detects tampering: if someone edits the stored value, decrypt fails.
 * Stored format: iv.authTag.ciphertext (all base64)
 */
export function encrypt(plainText) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString('base64')).join('.')
}

export function decrypt(stored) {
  const [iv, tag, data] = stored.split('.').map((part) => Buffer.from(part, 'base64'))
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/**
 * Keyed hash (HMAC). Lets us check "is this NID already registered?" without
 * decrypting every row. A plain hash would be guessable, because NID numbers
 * have few possible values; the secret key prevents that.
 */
export const keyedHash = (value) => crypto.createHmac('sha256', key).update(value).digest('hex')

/** Random token for email links. We email the token and store only its hash. */
export function createToken() {
  const token = crypto.randomBytes(32).toString('base64url')
  return { token, tokenHash: sha256(token) }
}

export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')
