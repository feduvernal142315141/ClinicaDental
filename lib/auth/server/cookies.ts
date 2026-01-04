import { AUTH_COOKIE_NAMES } from "@/lib/auth/cookies";

const LOGGED_USER_COOKIE = "loggedUser";

export type CookieSetOptions = {
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  path?: string;
  maxAge?: number;
};

export type CookieStoreLike = {
  get: (name: string) => { value: string } | undefined;
  set: (name: string, value: string, options: CookieSetOptions) => void;
};

function isHttpsRequest(input?: {
  requestUrl?: string;
  forwardedProto?: string | null;
}): boolean {
  const forwardedProto = (input?.forwardedProto ?? "").toLowerCase();
  if (forwardedProto === "https") return true;

  const url = input?.requestUrl;
  if (!url) return false;
  return url.startsWith("https://");
}

function baseCookieOptions(input?: {
  requestUrl?: string;
  forwardedProto?: string | null;
}): Omit<CookieSetOptions, "httpOnly" | "maxAge"> {
  return {
    sameSite: "lax",
    // Importante: si se corre en modo producción pero en HTTP local (p.ej. next start en localhost),
    // una cookie `Secure` no se persiste en el navegador y el middleware te redirige a /login.
    // También contemplamos despliegues detrás de proxy (x-forwarded-proto).
    secure: isHttpsRequest(input),
    path: "/",
  };
}

export function setAuthCookies(
  cookieStore: CookieStoreLike,
  tokens: { accessToken: string; refreshToken: string },
  options?: {
    requestUrl?: string;
    forwardedProto?: string | null;
  }
) {
  // Cookie de sesión para middleware (no depende de localStorage)
  cookieStore.set(
    LOGGED_USER_COOKIE,
    encodeURIComponent(
      JSON.stringify({
        accessToken: tokens.accessToken,
      })
    ),
    {
      ...baseCookieOptions(options),
      httpOnly: true,
    }
  );

  cookieStore.set(AUTH_COOKIE_NAMES.accessToken, tokens.accessToken, {
    ...baseCookieOptions(options),
    httpOnly: false,
  });

  cookieStore.set(AUTH_COOKIE_NAMES.refreshToken, tokens.refreshToken, {
    ...baseCookieOptions(options),
    httpOnly: true,
  });
}

export function clearAuthCookies(cookieStore: CookieStoreLike) {
  cookieStore.set(LOGGED_USER_COOKIE, "", {
    ...baseCookieOptions(),
    httpOnly: true,
    maxAge: 0,
  });

  cookieStore.set(AUTH_COOKIE_NAMES.accessToken, "", {
    ...baseCookieOptions(),
    httpOnly: false,
    maxAge: 0,
  });

  cookieStore.set(AUTH_COOKIE_NAMES.refreshToken, "", {
    ...baseCookieOptions(),
    httpOnly: true,
    maxAge: 0,
  });
}

export function readAuthCookies(cookieStore: CookieStoreLike) {
  return {
    accessToken: cookieStore.get(AUTH_COOKIE_NAMES.accessToken)?.value,
    refreshToken: cookieStore.get(AUTH_COOKIE_NAMES.refreshToken)?.value,
  };
}
