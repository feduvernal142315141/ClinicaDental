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
  // Prioridad 1: localStorage (loggedUser) - fuente principal de verdad
  if (typeof window !== "undefined") {
    try {
      const loggedUserRaw = localStorage.getItem("loggedUser");
      if (loggedUserRaw) {
        const parsed = JSON.parse(loggedUserRaw) as { accessToken?: string };
        if (parsed?.accessToken) return parsed.accessToken;
      }
    } catch {
      // Ignorar errores de parsing
    }
  }

  // Prioridad 2: Cookie como fallback
  const cookieToken = readCookie(AUTH_COOKIE_NAMES.accessToken);
  if (cookieToken) return cookieToken;

  // Prioridad 3: localStorage directo (legacy)
  if (typeof window !== "undefined") {
    return localStorage.getItem(AUTH_COOKIE_NAMES.accessToken);
  }

  return null;
}
