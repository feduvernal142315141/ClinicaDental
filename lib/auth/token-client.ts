import { AUTH_COOKIE_NAMES } from "./cookies";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

export function getAccessToken(): string | null {
  return readCookie(AUTH_COOKIE_NAMES.accessToken);
}
