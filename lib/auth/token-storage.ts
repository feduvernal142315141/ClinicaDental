import { AUTH_COOKIE_NAMES } from "./cookies";
import { decodeJwtPayload } from "./jwt";
import type { ValidateOtpResponse } from "@/lib/entity/doctors";

const LOGGED_USER_KEY = "loggedUser";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoggedUser = {
  logged: true;
  userInfo: Record<string, unknown>;
  accessToken: string;
  accessTokenExpiresIn: string;
  refreshToken: string;
  refreshTokenExpiresIn: string;
  changePassword: boolean;
  passwordExpirationDate?: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function saveAuthTokens(tokens: AuthTokens) {
  if (!canUseStorage()) return;
  localStorage.setItem(AUTH_COOKIE_NAMES.accessToken, tokens.accessToken);
  localStorage.setItem(AUTH_COOKIE_NAMES.refreshToken, tokens.refreshToken);
}

export function saveLoggedUser(tokens: ValidateOtpResponse) {
  if (!canUseStorage()) return;

  const userInfo = decodeJwtPayload(tokens.accessToken) ?? {};

  const payload: LoggedUser = {
    logged: true,
    userInfo,
    accessToken: tokens.accessToken,
    accessTokenExpiresIn: tokens.accessTokenExpiresIn,
    refreshToken: tokens.refreshToken,
    refreshTokenExpiresIn: tokens.refreshTokenExpiresIn,
    changePassword: false,
    passwordExpirationDate: tokens.passwordExpirationDate,
  };

  localStorage.setItem(LOGGED_USER_KEY, JSON.stringify(payload));

  // Compatibilidad: algunos lugares leen tokens “planos”.
  saveAuthTokens({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

export function loadAuthTokens(): AuthTokens | null {
  if (!canUseStorage()) return null;
  const accessToken = localStorage.getItem(AUTH_COOKIE_NAMES.accessToken);
  const refreshToken = localStorage.getItem(AUTH_COOKIE_NAMES.refreshToken);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function loadLoggedUser(): LoggedUser | null {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(LOGGED_USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LoggedUser;
    if (!parsed?.logged || !parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAuthTokens() {
  if (!canUseStorage()) return;
  localStorage.removeItem(AUTH_COOKIE_NAMES.accessToken);
  localStorage.removeItem(AUTH_COOKIE_NAMES.refreshToken);
  localStorage.removeItem(LOGGED_USER_KEY);
}
