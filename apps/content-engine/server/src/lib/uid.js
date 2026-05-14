import { randomBytes } from 'crypto'
// Generate a short cuid-like unique ID
export const uid = () => randomBytes(12).toString('base64url')
