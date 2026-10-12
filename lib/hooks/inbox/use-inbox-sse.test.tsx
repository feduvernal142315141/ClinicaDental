import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ createInboxSseTicket: vi.fn() }));
vi.mock("@/lib/services/inbox/inbox.service", () => api);

import { useInboxSSE, type InboxSSEEvent } from "./use-inbox-sse";

/** EventSource de mentira: guarda la URL y deja emitir eventos con nombre. */
class FakeEventSource {
  static last: FakeEventSource | null = null;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private listeners = new Map<string, ((event: MessageEvent) => void)[]>();
  constructor(public url: string) {
    FakeEventSource.last = this;
  }
  addEventListener(name: string, listener: (event: MessageEvent) => void) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }
  emit(name: string, data: unknown) {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    this.listeners.get(name)?.forEach((listener) => listener(event));
  }
  close() {}
}

async function connect() {
  const events: InboxSSEEvent[] = [];
  const onConnected = vi.fn();
  const { result } = renderHook(() =>
    useInboxSSE({ onEvent: (event) => events.push(event), onConnected }),
  );
  await waitFor(() => expect(FakeEventSource.last).not.toBeNull());
  const source = FakeEventSource.last!;
  act(() => source.onopen?.());
  return { events, onConnected, result, source };
}

beforeEach(() => {
  vi.clearAllMocks();
  FakeEventSource.last = null;
  api.createInboxSseTicket.mockResolvedValue("ticket-1");
  vi.stubGlobal("EventSource", FakeEventSource);
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("useInboxSSE", () => {
  it("abre el stream con el ticket, sin duplicar la barra de la URL base", async () => {
    const { source, result, onConnected } = await connect();

    expect(source.url).toBe("https://api.example.test/whatsapp/inbox/events?ticket=ticket-1");
    expect(result.current).toBe("connected");
    expect(onConnected).toHaveBeenCalledTimes(1);
  });

  it("entiende los nombres de evento que emite el backend", async () => {
    const { source, events } = await connect();

    act(() => {
      source.emit("message_new", { conversationId: "c1", messageId: "m1", direction: "INBOUND" });
      source.emit("message_status", { conversationId: "c1", messageId: "m1", status: "READ" });
      source.emit("conversation_changed", { conversationId: "c1" });
      source.emit("conversation_deleted", { conversationId: "c2" });
      source.emit("summary_changed", {});
    });

    expect(events).toEqual([
      { type: "message_new", conversationId: "c1", messageId: "m1", direction: "INBOUND" },
      { type: "message_status", conversationId: "c1", messageId: "m1", status: "READ" },
      { type: "conversation_update", conversationId: "c1" },
      { type: "conversation_deleted", conversationId: "c2" },
      { type: "summary_update" },
    ]);
  });

  it("sigue aceptando los nombres del contrato anterior", async () => {
    const { source, events } = await connect();

    act(() => {
      source.emit("conversation_update", { conversationId: "c1" });
      source.emit("summary_update", {});
    });

    expect(events.map((event) => event.type)).toEqual(["conversation_update", "summary_update"]);
  });

  it("no abre el stream ni reintenta si no hay permiso para el ticket", async () => {
    FakeEventSource.last = null;
    api.createInboxSseTicket.mockRejectedValue(Object.assign(new Error("403"), { status: 403 }));

    const { result } = renderHook(() => useInboxSSE({ onEvent: vi.fn() }));

    await waitFor(() => expect(api.createInboxSseTicket).toHaveBeenCalled());
    await waitFor(() => expect(result.current).toBe("disconnected"));
    expect(FakeEventSource.last).toBeNull();
    expect(api.createInboxSseTicket).toHaveBeenCalledTimes(1);
  });
});
