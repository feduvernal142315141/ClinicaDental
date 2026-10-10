import { afterEach, describe, expect, it, vi } from "vitest";
import { publicSigningService, PublicSigningError } from "./public-signing.service";
afterEach(() => vi.unstubAllGlobals());
describe("public signing transport", () => {
  it("uses only the token header and omits cookies, referrer and cache", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "doc" }), { status: 200 })); vi.stubGlobal("fetch", fetch);
    await publicSigningService.context("fixture-token");
    expect(fetch).toHaveBeenCalledWith("/api/document-signing/context", expect.objectContaining({ credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", headers: { "X-Document-Token": "fixture-token" } }));
  });
  it("preserves expiry as a typed status without exposing response details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private server details", { status: 401 })));
    await expect(publicSigningService.context("fixture-token")).rejects.toEqual(new PublicSigningError(401));
  });
});
