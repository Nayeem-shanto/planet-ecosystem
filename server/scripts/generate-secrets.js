import crypto from 'node:crypto'

// Prints fresh random secrets to paste into server/.env.
// Never reuse secrets between development and production, and never commit them.
console.log('\nPaste these into server/.env:\n')
console.log(`JWT_SECRET=${crypto.randomBytes(48).toString('base64url')}`)
console.log(`ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}`)
console.log('\n⚠️  Keep ENCRYPTION_KEY safe and backed up. If you lose it, stored NID numbers cannot be decrypted.\n')
