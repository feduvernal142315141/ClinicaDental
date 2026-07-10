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
  // Prioridad 1: cookie `clinic_access_token` (no httpOnly) — es la ÚNICA
  // fuente que el refresh (`/api/auth/refresh` → setAuthCookies) ROTA. El login
  // también la escribe, así que tras refrescar aquí vive SIEMPRE el token
  // vigente. Si en su lugar leyéramos primero `localStorage.loggedUser`, el
  // retry tras un 401 reenviaría el access token viejo (el refresh no toca
  // localStorage) → 401 de nuevo → falso "sesión expirada".
  const cookieToken = readCookie(AUTH_COOKIE_NAMES.accessToken);
  if (cookieToken) return cookieToken;

  // Prioridad 2: localStorage (loggedUser) como fallback (p. ej. si la cookie
  // no está disponible en este contexto).
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

  // Prioridad 3: localStorage directo (legacy)
  if (typeof window !== "undefined") {
    return localStorage.getItem(AUTH_COOKIE_NAMES.accessToken);
  }

  return null;
}
