import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Everything except the landing page and the auth pages requires a signed-in user.
// Unauthenticated hits to /search, /batches, /admin, etc. redirect to /sign-in.
const isPublic = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // run on all routes except Next internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
