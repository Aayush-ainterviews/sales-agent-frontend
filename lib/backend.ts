// Client-safe backend config. The browser talks to the backend DIRECTLY
// (direct-connect), authenticating with a short-lived Clerk JWT — so there is no
// 60s Vercel-serverless proxy in the path and long turns stream to completion.
//
// Set NEXT_PUBLIC_BACKEND_URL to the deployed backend origin, e.g.
//   https://sales-agent-production-xxxx.up.railway.app
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8097'
