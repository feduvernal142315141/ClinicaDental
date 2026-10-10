import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReadableStream } from "node:stream/web";
import api from "@/lib/services/apiConfig";
import { signatureEvents } from "./signature-events";
vi.mock("@/lib/services/apiConfig", () => ({ default: { get: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
function stream(chunks: string[]) { return new ReadableStream({ start(controller) { chunks.forEach(chunk => controller.enqueue(new TextEncoder().encode(chunk))); controller.close(); } }); }
describe("signature SSE transport", () => {
  it("uses authenticated fetch adapter, accepts split frames and stops on terminal status", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: stream([": heartbeat\r\n\r\nevent:status\r\ndata: {\"status\":\"SENT\"}\r\n\r\n", "event: sta", "tus\ndata: {\"status\":\"SIGNED\"}\n\n"]) });
    const callback = vi.fn().mockResolvedValue(undefined); const signal = new AbortController().signal;
    await signatureEvents("doc/id", signal, callback);
    expect(callback.mock.calls.map(call => call[0].status)).toEqual(["SENT", "SIGNED"]);
    expect(api.get).toHaveBeenCalledWith("/documentation/documents/doc%2Fid/signature-events", expect.objectContaining({ adapter: "fetch", responseType: "stream", signal, timeout: 0 }));
  });
  it("reconnects rather than silently finishing when a lease ends", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: stream(["event: status\ndata: {\"status\":\"SENT\"}\n\n"]) });
    await expect(signatureEvents("doc", new AbortController().signal, vi.fn())).rejects.toThrow("connection closed");
  });
  it("rejects an invalid event instead of unlocking the consultation", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: stream(["event: status\ndata: {\"status\":\"UNKNOWN\"}\n\n"]) });
    await expect(signatureEvents("doc", new AbortController().signal, vi.fn())).rejects.toThrow("Invalid signature status");
  });
});
