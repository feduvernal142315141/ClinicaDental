import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
const token = "a".repeat(43);
const context = (action: string) => ({ params: Promise.resolve({ action }) });
beforeEach(() => vi.stubEnv("API_URL", "https://api.example.test"));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("public signing proxy", () => {
  it("forwards no staff session and prevents caching", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 })); vi.stubGlobal("fetch", fetch);
    const result = await GET(new Request("https://clinic.example.test/api/document-signing/context", { headers: { "X-Document-Token": token, Cookie: "staff-session=secret", Authorization: "Bearer staff" } }), context("context"));
    expect(result.status).toBe(200); expect(result.headers.get("Cache-Control")).toContain("no-store");
    expect(fetch.mock.calls[0][1].headers).toEqual({ "X-Document-Token": token });
  });
  it("rejects unknown actions and tokens without contacting backend", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await GET(new Request("https://clinic.example.test/api/document-signing/context"), context("context"))).status).toBe(401);
    expect((await GET(new Request("https://clinic.example.test/api/document-signing/private", { headers: { "X-Document-Token": token } }), context("private"))).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects a specialist signature submitted through the public route", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const result = await POST(new Request("https://clinic.example.test/api/document-signing/sign", { method: "POST", headers: { "X-Document-Token": token }, body: JSON.stringify({ specialistSignatureBase64: "ink" }) }), context("sign"));
    expect(result.status).toBe(400); expect(fetch).not.toHaveBeenCalled();
  });
});
