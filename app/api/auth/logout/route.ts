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

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response.cookies);
  return response;
}
