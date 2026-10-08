import { describe, expect, it } from "vitest";
import {
  EMPTY_PUBLIC_BOOKING_FORM,
  PUBLIC_BOOKING_ACTIVATION_MESSAGE,
  PUBLIC_BOOKING_MIN_ADVANCE_OPTIONS,
  bookingNumberOptions,
  buildPublicBookingRequest,
  formatBookingDays,
  formatBookingMinutes,
  hasPublicBookingProblems,
  prunePublicBookingValues,
  publicBookingFormSchema,
  publicBookingProblems,
  publicBookingStatus,
  samePublicBookingValues,
  setBookingServiceDoctors,
  toggleBookingDoctor,
  toggleBookingService,
  type PublicBookingFormValues,
} from "./public-booking";

const values = (overrides: Partial<PublicBookingFormValues> = {}): PublicBookingFormValues => ({
  ...EMPTY_PUBLIC_BOOKING_FORM,
  ...overrides,
});
const catalog = (doctorIds: string[], serviceIds: string[]) => ({
  doctorIds: new Set(doctorIds),
  serviceIds: new Set(serviceIds),
});

describe("estado de las reservas en línea", () => {
  it("distingue activo, activado sin estar disponible y desactivado", () => {
    expect(publicBookingStatus({ enabled: true, publiclyAvailable: true })).toBe("active");
    expect(publicBookingStatus({ enabled: true, publiclyAvailable: false })).toBe("pending");
    expect(publicBookingStatus({ enabled: false, publiclyAvailable: false })).toBe("disabled");
  });
});

describe("reglas de agenda", () => {
  it("muestra minutos, horas y días de forma legible", () => {
    expect(formatBookingMinutes(30)).toBe("30 min");
    expect(formatBookingMinutes(120)).toBe("2 h");
    expect(formatBookingMinutes(90)).toBe("1 h 30 min");
    expect(formatBookingMinutes(0)).toBe("Sin anticipación");
    expect(formatBookingDays(1)).toBe("1 día");
    expect(formatBookingDays(30)).toBe("30 días");
  });

  it("añade el valor guardado si no está entre las opciones, sin cambiarlo", () => {
    const options = bookingNumberOptions(PUBLIC_BOOKING_MIN_ADVANCE_OPTIONS, 45, formatBookingMinutes);
    expect(options.map((option) => option.value)).toEqual(["30", "45", "60", "120", "240", "720", "1440", "2880"]);
    expect(bookingNumberOptions(PUBLIC_BOOKING_MIN_ADVANCE_OPTIONS, 120, formatBookingMinutes)).toHaveLength(7);
  });

  it("valida los límites del backend", () => {
    expect(publicBookingFormSchema.safeParse(values()).success).toBe(true);
    expect(publicBookingFormSchema.safeParse(values({ minAdvanceMinutes: 43_201 })).success).toBe(false);
    expect(publicBookingFormSchema.safeParse(values({ maxAdvanceDays: 0 })).success).toBe(false);
    expect(publicBookingFormSchema.safeParse(values({ maxAdvanceDays: 181 })).success).toBe(false);
    expect(publicBookingFormSchema.safeParse(values({ slotIntervalMinutes: 4 })).success).toBe(false);
    expect(publicBookingFormSchema.safeParse(values({ slotIntervalMinutes: 241 })).success).toBe(false);
  });
});

describe("selección de doctores y servicios", () => {
  it("al desmarcar un doctor lo quita de los servicios que lo tenían", () => {
    const start = values({
      doctorIds: ["d1", "d2"],
      services: [
        { serviceId: "s1", doctorIds: ["d1", "d2"] },
        { serviceId: "s2", doctorIds: [] },
      ],
    });
    const next = toggleBookingDoctor(start, "d1", false);
    expect(next.doctorIds).toEqual(["d2"]);
    expect(next.services).toEqual([
      { serviceId: "s1", doctorIds: ["d2"] },
      { serviceId: "s2", doctorIds: [] },
    ]);
  });

  it("un servicio recién marcado lo atiende cualquier doctor habilitado", () => {
    const next = toggleBookingService(values(), "s1", true);
    expect(next.services).toEqual([{ serviceId: "s1", doctorIds: [] }]);
    expect(setBookingServiceDoctors(next, "s1", ["d1"]).services[0].doctorIds).toEqual(["d1"]);
    expect(toggleBookingService(next, "s1", false).services).toEqual([]);
  });
});

describe("limpieza y validación antes de guardar", () => {
  it("quita doctores y servicios que ya no se pueden ofrecer", () => {
    const start = values({
      doctorIds: ["d1", "gone"],
      services: [
        { serviceId: "s1", doctorIds: ["d1", "gone"] },
        { serviceId: "old", doctorIds: [] },
      ],
    });
    expect(prunePublicBookingValues(start, catalog(["d1"], ["s1"]))).toMatchObject({
      doctorIds: ["d1"],
      services: [{ serviceId: "s1", doctorIds: ["d1"] }],
    });
  });

  it("no deja activar sin al menos un doctor y un servicio", () => {
    const off = values();
    expect(hasPublicBookingProblems(publicBookingProblems(off, off))).toBe(false);
    const on = values({ enabled: true, doctorIds: ["d1"] });
    expect(publicBookingProblems(on, on).general).toEqual([PUBLIC_BOOKING_ACTIVATION_MESSAGE]);
    const ready = values({ enabled: true, doctorIds: ["d1"], services: [{ serviceId: "s1", doctorIds: [] }] });
    expect(hasPublicBookingProblems(publicBookingProblems(ready, ready))).toBe(false);
  });

  it("cuenta solo lo que sigue disponible para poder activar", () => {
    const start = values({ enabled: true, doctorIds: ["gone"], services: [{ serviceId: "s1", doctorIds: [] }] });
    const pruned = prunePublicBookingValues(start, catalog([], ["s1"]));
    expect(publicBookingProblems(start, pruned).general).toEqual([PUBLIC_BOOKING_ACTIVATION_MESSAGE]);
  });

  it("no amplía en silencio un servicio cuyo único doctor ya no está", () => {
    const start = values({ doctorIds: ["d1", "gone"], services: [{ serviceId: "s1", doctorIds: ["gone"] }] });
    const pruned = prunePublicBookingValues(start, catalog(["d1"], ["s1"]));
    expect(Object.keys(publicBookingProblems(start, pruned).services)).toEqual(["s1"]);
  });

  it("rechaza más de 100 doctores o servicios", () => {
    const many = values({ doctorIds: Array.from({ length: 101 }, (_, index) => `d${index}`) });
    expect(publicBookingProblems(many, many).general).toHaveLength(1);
  });

  it("arma el cuerpo del PUT solo con el contrato y la versión cargada", () => {
    const request = buildPublicBookingRequest(
      values({ enabled: true, doctorIds: ["d1"], services: [{ serviceId: "s1", doctorIds: [] }] }),
      3,
    );
    expect(request).toEqual({
      enabled: true,
      doctorIds: ["d1"],
      services: [{ serviceId: "s1", doctorIds: [] }],
      minAdvanceMinutes: 120,
      maxAdvanceDays: 30,
      slotIntervalMinutes: 30,
      version: 3,
    });
  });

  it("compara sin importar el orden", () => {
    const a = values({ doctorIds: ["d1", "d2"], services: [{ serviceId: "s1", doctorIds: [] }, { serviceId: "s2", doctorIds: [] }] });
    const b = values({ doctorIds: ["d2", "d1"], services: [{ serviceId: "s2", doctorIds: [] }, { serviceId: "s1", doctorIds: [] }] });
    expect(samePublicBookingValues(a, b)).toBe(true);
    expect(samePublicBookingValues(a, values({ doctorIds: ["d1"] }))).toBe(false);
  });
});
