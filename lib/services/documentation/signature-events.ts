import apiInstance from "@/lib/services/apiConfig";
import type { SignatureRequestStatus } from "@/lib/entity/documentation";

/** Fetch adapter retains the shared Bearer/refresh interceptors and exposes the stream. */
export async function signatureEvents(id: string, signal: AbortSignal, onStatus: (status: SignatureRequestStatus) => Promise<void>): Promise<void> {
  const response = await apiInstance.get<ReadableStream<Uint8Array>>(`/documentation/documents/${encodeURIComponent(id)}/signature-events`, {
    adapter: "fetch", responseType: "stream", timeout: 0, signal,
    headers: { Accept: "text/event-stream", "X-Silent": "true" },
  });
  const reader = response.data.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) throw new Error("Signature event connection closed");
      buffer += decoder.decode(value, { stream: true }).replace(/\r/g, "");
      if (buffer.length > 65536) throw new Error("Invalid signature event");
      let end: number;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        const lines = frame.split("\n");
        if (!lines.some(line => line.startsWith("event:") && line.slice(6).trim() === "status")) continue;
        const data: unknown = JSON.parse(lines.filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n"));
        if (!data || typeof data !== "object" || !("status" in data) || !["NONE", "SENT", "LINK_READY", "SIGNED", "EXPIRED"].includes(String(data.status))) throw new Error("Invalid signature status");
        const status = data as SignatureRequestStatus;
        await onStatus(status);
        if (["NONE", "SIGNED", "EXPIRED"].includes(status.status)) return;
      }
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
