import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/docs(.*)',
  '/nps(.*)',
  '/api/webhooks(.*)',
  '/api/whatsapp(.*)',
  '/api/nps(.*)',
  '/manifest.json',
  '/sw.js',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (isAdminRoute(request)) {
    const session = await auth.protect()
    const metadata = session.sessionClaims?.metadata as Record<string, string> | undefined
    if (metadata?.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return
  }
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
