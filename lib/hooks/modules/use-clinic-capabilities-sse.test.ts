import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useClinicCapabilitiesSse } from "./use-clinic-capabilities-sse";
import {
  clinicCapabilitiesSseUrl,
  createClinicCapabilitiesSseTicket,
  getClinicCapabilitiesSessionId,
} from "@/lib/services/modules/clinic-capabilities-sse.service";

vi.mock("@/lib/services/modules/clinic-capabilities-sse.service", () => ({
  clinicCapabilitiesSseUrl: vi.fn(() => "http://api.test/clinic/capabilities/events?ticket=ticket"),
  createClinicCapabilitiesSseTicket: vi.fn(async () => "ticket"),
  getClinicCapabilitiesSessionId: vi.fn(() => "session-id"),
}));

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly listeners = new Map<string, EventListener[]>();
  readonly close = vi.fn();
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(name: string, listener: EventListener): void {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }

  emit(name: string): void {
    this.listeners.get(name)?.forEach((listener) => listener(new Event(name)));
  }
}

describe("useClinicCapabilitiesSse", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.clearAllMocks();
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  it("opens the dedicated stream and refreshes capabilities on connect and change", async () => {
    const onChanged = vi.fn();
    const { unmount } = renderHook(() => useClinicCapabilitiesSse(true, onChanged));

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    expect(getClinicCapabilitiesSessionId).toHaveBeenCalledOnce();
    expect(createClinicCapabilitiesSseTicket).toHaveBeenCalledWith("session-id");
    expect(clinicCapabilitiesSseUrl).toHaveBeenCalledWith("ticket");

    act(() => {
      FakeEventSource.instances[0].emit("connected");
      FakeEventSource.instances[0].emit("capabilities-changed");
    });
    expect(onChanged).toHaveBeenCalledTimes(2);

    unmount();
    expect(FakeEventSource.instances[0].close).toHaveBeenCalledOnce();
  });
});
