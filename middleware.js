import { updateSession } from '@/lib/supabase/middleware'
export async function middleware(request) { return await updateSession(request) }
export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|manifest.json|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
