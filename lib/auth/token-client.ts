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
  const cookieToken = readCookie(AUTH_COOKIE_NAMES.accessToken);
  if (cookieToken) return cookieToken;

  if (typeof window === "undefined") return null;
  try {
    const loggedUserRaw = localStorage.getItem("loggedUser");
    if (loggedUserRaw) {
      const parsed = JSON.parse(loggedUserRaw) as { accessToken?: string };
      if (parsed?.accessToken) return parsed.accessToken;
    }

    return localStorage.getItem(AUTH_COOKIE_NAMES.accessToken);
  } catch {
    return null;
  }
}
