import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = new Set(["/", "/login", "/register"]);

// Routes that authenticated users should be redirected away from
const AUTH_ROUTES = new Set(["/login", "/register"]);

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Better Auth sets either the plain or __Secure- prefixed cookie depending on env
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  const isAuthenticated = !!sessionCookie?.value;

  // Authenticated users visiting login/register → send to dashboard
  if (isAuthenticated && AUTH_ROUTES.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated users visiting protected routes → send to login
  if (!isAuthenticated && !PUBLIC_ROUTES.has(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - /api/auth/*   (Better Auth endpoints — handled by the route handler)
     * - image file extensions
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/auth|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)).*)",
  ],
};
