import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CONSENT_REQUIRED_COOKIE, OPT_IN_COUNTRIES } from "@/lib/cookie-consent";

// Routes that don't require authentication
const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/verify-email", "/privacy", "/support"]);

// Routes that authenticated users should be redirected away from
const AUTH_ROUTES = new Set(["/login", "/register"]);

export function middleware(request: NextRequest): NextResponse {
  return withConsentRegion(request, route(request));
}

/**
 * Tell the cookie banner whether this visitor's country requires opt-in before analytics
 * cookies. Vercel supplies the country; when it's unknown (e.g. local dev) opt-in is assumed.
 */
function withConsentRegion(request: NextRequest, response: NextResponse): NextResponse {
  const country = request.headers.get("x-vercel-ip-country");
  const required = !country || OPT_IN_COUNTRIES.has(country) ? "1" : "0";
  if (request.cookies.get(CONSENT_REQUIRED_COOKIE)?.value !== required) {
    response.cookies.set(CONSENT_REQUIRED_COOKIE, required, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  }
  return response;
}

function route(request: NextRequest): NextResponse {
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
