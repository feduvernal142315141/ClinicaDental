import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readAuthCookies, setAuthCookies } from "@/lib/auth/server/cookies";
import { refreshTokensWithBackend } from "@/lib/auth/server/backend-auth";

export async function POST() {
  const cookieStore = await cookies();
  const { refreshToken, accessToken } = readAuthCookies(cookieStore);

  if (!refreshToken) {
    return NextResponse.json(
      { code: "NO_REFRESH_TOKEN", message: "No hay refresh token" },
      { status: 401 }
    );
  }

  const refreshed = await refreshTokensWithBackend({
    refreshToken,
    accessToken,
  });
  if (!refreshed.ok) {
    return NextResponse.json(
      {
        code: refreshed.code,
        message:
          refreshed.code === "NO_API_URL"
            ? "API_URL/NEXT_PUBLIC_API_URL no configurado"
            : refreshed.code === "BAD_RESPONSE"
            ? "Respuesta inválida"
            : "No se pudo refrescar",
      },
      { status: refreshed.status }
    );
  }

  setAuthCookies(cookieStore, refreshed.tokens);

  return NextResponse.json({ ok: true });
}
