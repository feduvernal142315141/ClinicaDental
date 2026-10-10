import { NextResponse } from "next/server";

const headers = { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
const fail = (status: number) => NextResponse.json({ message: "No se pudo procesar la solicitud de firma." }, { status, headers });
async function proxy(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const allowed = request.method === "GET" ? ["context", "page"] : ["preview", "sign"];
  if (!allowed.includes(action)) return fail(404);
  const token = request.headers.get("X-Document-Token");
  if (!token || !/^[A-Za-z0-9_-]{32,256}$/.test(token)) return fail(401);
  const api = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!api) return fail(503);
  const target = new URL(`${api.replace(/\/$/, "")}/public/document-signing/${action}`);
  if (action === "page") {
    const page = new URL(request.url).searchParams.get("page") ?? "0";
    if (!/^\d{1,2}$/.test(page)) return fail(400);
    target.searchParams.set("page", page);
  }
  let body: string | undefined;
  if (request.method === "POST") {
    // Bound the streamed payload as well as Content-Length (which clients can omit).
    const reader = request.body?.getReader();
    if (!reader) return fail(400);
    let size = 0; const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_500_000) { await reader.cancel(); return fail(413); }
      chunks.push(value);
    }
    try {
      const decoded = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (decoded.specialistSignatureBase64 !== undefined) return fail(400);
      body = JSON.stringify({ method: decoded.method, accepted: decoded.accepted, signatureBase64: decoded.signatureBase64, documentHash: decoded.documentHash });
    } catch { return fail(400); }
  }
  try {
    const response = await fetch(target, {
      method: request.method, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(30_000),
      headers: { "X-Document-Token": token, ...(body ? { "Content-Type": "application/json" } : {}) }, body,
    });
    if (!response.ok) return fail(response.status);
    return new Response(response.body, { status: response.status, headers: { ...headers, "Content-Type": action === "preview" ? "application/pdf" : "application/json" } });
  } catch { return fail(502); }
}
export const GET = proxy;
export const POST = proxy;
