export const AUTH_COOKIE_NAMES = {
  accessToken: "clinic_access_token",
  refreshToken: "clinic_refresh_token",
} as const;

export type AuthCookieName =
  (typeof AUTH_COOKIE_NAMES)[keyof typeof AUTH_COOKIE_NAMES];
