import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAMES } from "@/lib/auth/cookies";
import {
  DEFAULT_LOGIN_REDIRECT,
  DEFAULT_LOGOUT_REDIRECT,
  isAuthRoute,
  isPublicRoute,
} from "@/lib/constants/routes.constants";


export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const loggedUserRaw = request.cookies.get("loggedUser")?.value;
  let accessToken = request.cookies.get(AUTH_COOKIE_NAMES.accessToken)?.value;

  if (!accessToken && loggedUserRaw) {
    try {
      const decoded = decodeURIComponent(loggedUserRaw);
      const parsed = JSON.parse(decoded) as { accessToken?: string };
      if (parsed?.accessToken) accessToken = parsed.accessToken;
    } catch {
      // ignore invalid cookie
    }
  }
  const isAuthenticated = !!accessToken;

  // Rutas públicas y de auth basadas en constantes centralizadas.
  // Nota: "/" se considera pública aunque no esté en PUBLIC_ROUTES.
  const isPublic = pathname === "/" || isPublicRoute(pathname);
  const isAuth = isAuthRoute(pathname);

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL(DEFAULT_LOGOUT_REDIRECT, request.url));
  }

  if (isAuthenticated && (pathname === "/" || isAuth)) {
    return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
