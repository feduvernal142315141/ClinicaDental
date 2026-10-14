import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/apiConfig", () => ({
  default: { post: vi.fn() },
}));

describe("clinic capabilities SSE service", () => {
  beforeEach(async () => {
    const service = await import("./clinic-capabilities-sse.service");
    service.clearClinicCapabilitiesSessionId();
  });

  it("keeps one browser-page session id until logout clears it", async () => {
    const service = await import("./clinic-capabilities-sse.service");
    const first = service.getClinicCapabilitiesSessionId();
    const second = service.getClinicCapabilitiesSessionId();

    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second).toBe(first);

    service.clearClinicCapabilitiesSessionId();
    expect(service.getClinicCapabilitiesSessionId()).not.toBe(first);
  });

  it("builds the dedicated capability stream URL", async () => {
    const service = await import("./clinic-capabilities-sse.service");
    expect(service.clinicCapabilitiesSseUrl("ticket id")).toContain(
      "/clinic/capabilities/events?ticket=ticket%20id",
    );
  });
});
