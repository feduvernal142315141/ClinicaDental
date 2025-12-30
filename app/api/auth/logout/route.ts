import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearAuthCookies, readAuthCookies } from "@/lib/auth/server/cookies";
import { logoutWithBackend } from "@/lib/auth/server/backend-auth";

export async function POST() {
  const cookieStore = await cookies();
  const { refreshToken, accessToken } = readAuthCookies(cookieStore);

  // Best-effort: invalidar refresh token en backend
  if (refreshToken) {
    await logoutWithBackend({ refreshToken, accessToken });
  }

  clearAuthCookies(cookieStore);

  return NextResponse.json({ ok: true });
}
