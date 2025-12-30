import { AUTH_COOKIE_NAMES } from "@/lib/auth/cookies";

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

function baseCookieOptions(): Omit<CookieSetOptions, "httpOnly" | "maxAge"> {
  return {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function setAuthCookies(
  cookieStore: CookieStoreLike,
  tokens: { accessToken: string; refreshToken: string }
) {
  cookieStore.set(AUTH_COOKIE_NAMES.accessToken, tokens.accessToken, {
    ...baseCookieOptions(),
    httpOnly: false,
  });

  cookieStore.set(AUTH_COOKIE_NAMES.refreshToken, tokens.refreshToken, {
    ...baseCookieOptions(),
    httpOnly: true,
  });
}

export function clearAuthCookies(cookieStore: CookieStoreLike) {
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
