export { default } from "next-auth/middleware";

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
    "/((?!api|_next/static|_next/image|favicon.ico|login|register|track/|playlists/).*)",
  ],
};
