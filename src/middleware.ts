import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";

export default function middleware(req: NextRequest) {
  const adminPath = process.env.ADMIN_URL_PATH || '/secret-admin';
  const isAdminRoute = req.nextUrl.pathname.startsWith(adminPath) || req.nextUrl.pathname.startsWith('/api/admin');

  if (isAdminRoute) {
    const basicAuth = req.headers.get('authorization');

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');

      if (
        user === process.env.ADMIN_USERNAME &&
        pwd === process.env.ADMIN_PASSWORD
      ) {
        return NextResponse.next();
      }
    }

    return new NextResponse('Auth required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    });
  }

  // Use next-auth middleware for all other protected routes
  return withAuth(req as NextRequestWithAuth);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (auth page)
     * - register (auth page)
     * - track/ (public shared track page)
     * - playlists/ (public shared playlist page)
     */
    "/((?!api/(?!admin)|_next/static|_next/image|favicon.ico|login|register|track/|playlists/).*)",
  ],
};
