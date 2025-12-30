import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setAuthCookies } from "@/lib/auth/server/cookies";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    accessToken: string;
    refreshToken: string;
  };

  if (!body?.accessToken || !body?.refreshToken) {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "Tokens requeridos" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();

  setAuthCookies(cookieStore, {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
  });

  return NextResponse.json({ ok: true });
}
