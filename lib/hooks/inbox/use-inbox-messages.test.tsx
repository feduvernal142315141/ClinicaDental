import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { InboxMessage } from "@/lib/entity/inbox";

const api = vi.hoisted(() => ({ getInboxMessages: vi.fn(), getInboxMessagesSilent: vi.fn() }));
vi.mock("@/lib/services/inbox/inbox.service", () => api);

import { useInboxMessages } from "./use-inbox-messages";

const message = (id: string) => ({ id, createdAt: "2026-10-28T17:02:00Z", status: "DELIVERED" }) as InboxMessage;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => vi.clearAllMocks());

describe("useInboxMessages", () => {
  it("deja de cargar aunque la conexión en tiempo real refresque antes de que llegue la carga inicial", async () => {
    const initial = deferred<InboxMessage[]>();
    api.getInboxMessages.mockReturnValue(initial.promise);
    api.getInboxMessagesSilent.mockResolvedValue([message("b"), message("a")]);
    const { result } = renderHook(() => useInboxMessages("conv-1"));
    expect(result.current.loading).toBe(true);

    // Al conectar, el SSE (o el polling) pide la última página mientras la inicial sigue en vuelo.
    await act(() => result.current.refresh());
    await act(async () => initial.resolve([message("b"), message("a")]));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("deja de cargar aunque el refresco que tomó el relevo falle", async () => {
    const initial = deferred<InboxMessage[]>();
    api.getInboxMessages.mockReturnValue(initial.promise);
    api.getInboxMessagesSilent.mockRejectedValue(new Error("sin red"));
    const { result } = renderHook(() => useInboxMessages("conv-1"));

    await act(() => result.current.refresh());
    await act(async () => initial.resolve([message("a")]));

    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
