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
  '/booking(.*)',
  '/api/booking(.*)',
  '/sala(.*)',
  '/verificar(.*)',
  '/manifest.json',
  '/sw.js',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (isAdminRoute(request)) {
    // Admin routes require auth — the actual superadmin check happens
    // in (admin)/layout.tsx via DB query (defense-in-depth)
    await auth.protect()
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
