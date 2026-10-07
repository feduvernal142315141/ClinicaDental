import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { leadError, makeConversion, makeLead, renderHookWithQuery } from "./lead-test-utils";

const service = vi.hoisted(() => ({ book: vi.fn() }));
vi.mock("@/lib/services/leads/leads.service", () => ({ leadsService: service }));

const availability = vi.hoisted(() => ({ refetch: vi.fn() }));
vi.mock("@/lib/hooks/leads/use-lead-catalogs", () => ({
  useLeadDoctorSchedule: () => ({ data: null }),
  useLeadAvailability: () => ({ data: ["10:00", "10:30"], isFetching: false, refetch: availability.refetch }),
}));
vi.mock("@/lib/hooks/settings/use-clinic-general-settings", () => ({
  useClinicGeneralSettings: () => ({ rawSchedule: null }),
}));

const patients = vi.hoisted(() => ({ createPatient: vi.fn() }));
const appointments = vi.hoisted(() => ({ createAppointment: vi.fn() }));
vi.mock("@/lib/services/patients", () => ({ patientsService: patients }));
vi.mock("@/lib/services/appointments", () => ({ appointmentsService: appointments }));

import type { Lead } from "@/lib/entity/leads";
import { classifyBookingError, useLeadBookingForm } from "@/lib/hooks/leads/use-lead-booking-form";

type Hook = { current: ReturnType<typeof useLeadBookingForm> };

async function fillAndSubmit(result: Hook, extra: Record<string, unknown> = {}) {
  await act(async () => {
    result.current.form.setValue("doctorId", "doctor-1");
    result.current.form.setValue("date", "2026-10-12");
  });
  await act(async () => {
    result.current.form.setValue("time", "10:00");
    for (const [key, value] of Object.entries(extra)) {
      result.current.form.setValue(key as "notes", value as string);
    }
  });
  await act(async () => {
    await result.current.submit();
  });
}

const setup = (lead: Lead = makeLead(), existingPatientId?: string) =>
  renderHookWithQuery(() => useLeadBookingForm({ open: true, lead, existingPatientId }));

describe("reserva de la primera cita", () => {
  beforeEach(() => vi.clearAllMocks());

  it("éxito: una sola llamada a /book y nunca crea paciente ni cita por su cuenta", async () => {
    const conversion = makeConversion();
    service.book.mockResolvedValueOnce(conversion);
    const { result } = setup();
    await fillAndSubmit(result, { notes: "Primera valoración" });

    expect(service.book).toHaveBeenCalledTimes(1);
    expect(service.book).toHaveBeenCalledWith("lead-1", {
      doctorId: "doctor-1",
      date: "2026-10-12",
      time: "10:00",
      type: "consultation",
      notes: "Primera valoración",
      fullName: "Carlos Prueba",
    });
    expect(service.book.mock.calls[0][1]).not.toHaveProperty("clinicId");
    // `duration` vacío = estándar de la clínica: no se envía.
    expect(service.book.mock.calls[0][1]).not.toHaveProperty("duration");
    expect(patients.createPatient).not.toHaveBeenCalled();
    expect(appointments.createAppointment).not.toHaveBeenCalled();
    expect(result.current.result).toEqual(conversion);
    expect(result.current.result?.appointment?.id).toBe("appointment-7");
    expect(result.current.error).toBeNull();
  });

  it("rechazo de la agenda (400): muestra el mensaje, no queda nada creado y deja elegir otro horario", async () => {
    service.book.mockRejectedValueOnce(leadError(400, undefined, "El horario ya está ocupado."));
    const { result } = setup();
    await fillAndSubmit(result);

    expect(result.current.result).toBeNull();
    expect(result.current.error).toEqual({ kind: "agenda", message: "El horario ya está ocupado." });
    expect(result.current.form.getValues("time")).toBe("");
    expect(result.current.form.getValues("doctorId")).toBe("doctor-1");
    expect(availability.refetch).toHaveBeenCalled();

    // Segundo intento con otro horario.
    service.book.mockResolvedValueOnce(makeConversion());
    await act(async () => {
      result.current.form.setValue("time", "10:30");
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(service.book).toHaveBeenCalledTimes(2);
    expect(service.book.mock.calls[1][1]).toMatchObject({ time: "10:30" });
    await waitFor(() => expect(result.current.result).not.toBeNull());
    expect(result.current.error).toBeNull();
  });

  it("reintento: la misma petición devuelve la misma cita con replayed: true", async () => {
    const replay = makeConversion({ replayed: true, patientCreated: false });
    service.book.mockResolvedValueOnce(replay);
    const { result } = setup();
    await fillAndSubmit(result);
    expect(result.current.result?.replayed).toBe(true);
    expect(result.current.result?.appointment?.id).toBe("appointment-7");
  });

  it("prospecto sin nombre: lo exige antes de llamar al backend", async () => {
    const { result } = setup(makeLead({ fullName: null }));
    expect(result.current.requireName).toBe(true);
    await fillAndSubmit(result);
    expect(service.book).not.toHaveBeenCalled();
    let valid = true;
    await act(async () => {
      valid = await result.current.form.trigger("fullName");
    });
    expect(valid).toBe(false);
    expect(result.current.form.getFieldState("fullName").error?.message).toBe(
      "Indica el nombre para crear al paciente.",
    );
  });

  it("para un paciente existente envía existingPatientId y no pide nombre", async () => {
    service.book.mockResolvedValueOnce(
      makeConversion({ lead: makeLead({ stage: "LOST", outcome: "EXISTING_PATIENT" }), patientCreated: false }),
    );
    const { result } = setup(makeLead({ fullName: null, patientMatchStatus: "POSSIBLE" }), "patient-1");
    expect(result.current.requireName).toBe(false);
    await fillAndSubmit(result);
    expect(service.book.mock.calls[0][1]).toMatchObject({ existingPatientId: "patient-1" });
    expect(result.current.result?.lead.outcome).toBe("EXISTING_PATIENT");
  });

  it("clasifica los 409 de la reserva por errorCode", () => {
    expect(classifyBookingError(leadError(409, "LEAD_ALREADY_CONVERTED"))).toMatchObject({ kind: "already-converted" });
    expect(classifyBookingError(leadError(409, "LEAD_PATIENT_MATCH_UNRESOLVED"))).toMatchObject({ kind: "match-unresolved" });
    expect(classifyBookingError(leadError(400, "LEAD_INVALID", "Falta el nombre."))).toEqual({
      kind: "other",
      message: "Falta el nombre.",
    });
  });
});
