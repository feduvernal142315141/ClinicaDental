import { NextResponse } from "next/server";
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

  const response = NextResponse.json({ ok: true });

  setAuthCookies(
    response.cookies,
    {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
    },
    {
      requestUrl: request.url,
      forwardedProto: request.headers.get("x-forwarded-proto"),
    }
  );

  return response;
}
