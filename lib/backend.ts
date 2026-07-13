// Server-side backend config. Used ONLY inside Next.js route handlers (app/api/*),
// so BACKEND_TOKEN never reaches the browser. Set these in .env.local.
//
// BACKEND_USER_ID + BACKEND_TOKEN must match one entry of the backend's USER_TOKENS
// (e.g. USER_TOKENS="tok_rohan:rohan"  ->  BACKEND_USER_ID=rohan, BACKEND_TOKEN=tok_rohan).

export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8097'
export const USER_ID = process.env.BACKEND_USER_ID || 'rohan'
export const TOKEN = process.env.BACKEND_TOKEN || ''

export function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${TOKEN}` }
}
