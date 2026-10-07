import { describe, expect, it } from "vitest";
import {
  describeLeadActivity,
  hasPendingPatientMatch,
  isFollowUpOverdue,
  isLeadClosed,
  isLeadOpen,
  leadActorLabel,
  leadDisplayName,
  leadStatus,
  pipelineAttentionCount,
  pipelineStageCount,
  type Lead,
  type LeadPipeline,
} from "./index";
import {
  buildCreateLeadRequest,
  buildUpdateLeadRequest,
  EMPTY_LEAD_FORM,
  isEmptyLeadUpdate,
  leadBookingSchema,
  leadFormSchema,
  leadLoseSchema,
  leadToFormValues,
} from "./schemas";

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    fullName: "Carlos Prueba",
    phone: "8888-1234",
    phoneE164: "+50588881234",
    phoneVerified: true,
    email: "carlos@correo.test",
    stage: "QUALIFIED",
    outcome: "OPEN",
    lostReason: null,
    temperature: "HOT",
    source: "REFERRAL",
    sourceDetail: "La tía Marta",
    sourceCampaign: null,
    externalLeadId: null,
    sourceMetadata: {},
    interestServiceId: "service-1",
    interestServiceName: "Implante dental",
    interestNote: "Quiere un implante",
    assignedToUserId: "user-1",
    conversationId: null,
    patientMatchStatus: "NONE",
    matchedPatientId: null,
    patientId: null,
    convertedAt: null,
    conversionMethod: null,
    firstAppointmentId: null,
    consentStatus: "UNKNOWN",
    consentSource: null,
    consentAt: null,
    lastActivityAt: "2026-10-07T19:08:50Z",
    nextFollowUpAt: null,
    overdueFollowUp: false,
    version: 3,
    createdAt: "2026-10-07T19:08:44Z",
    createdBy: "Recepción",
    ...overrides,
  };
}

describe("leadStatus: el estado se pinta desde `outcome`, no desde `stage`", () => {
  it("abierto usa la etapa", () => {
    expect(leadStatus({ stage: "NEW", outcome: "OPEN" })).toMatchObject({ key: "NEW", label: "Nuevo" });
    expect(leadStatus({ stage: "CONTACTED", outcome: "OPEN" }).label).toBe("Contactado");
    expect(leadStatus({ stage: "QUALIFIED", outcome: "OPEN" }).label).toBe("Calificado");
  });

  it("EXISTING_PATIENT llega con stage LOST pero se muestra 'Ya era paciente' (neutro), nunca 'Perdido'", () => {
    const status = leadStatus({ stage: "LOST", outcome: "EXISTING_PATIENT" });
    expect(status).toEqual({ key: "EXISTING_PATIENT", label: "Ya era paciente", tone: "neutral" });
    expect(status.label).not.toBe("Perdido");
  });

  it("LOST es 'Perdido' y CONVERTED es 'Convertido'", () => {
    expect(leadStatus({ stage: "LOST", outcome: "LOST" })).toMatchObject({ label: "Perdido", tone: "danger" });
    expect(leadStatus({ stage: "CONVERTED", outcome: "CONVERTED" })).toMatchObject({
      label: "Convertido",
      tone: "success",
    });
  });

  it("abierto / cerrado / coincidencia pendiente", () => {
    expect(isLeadOpen({ outcome: "OPEN" })).toBe(true);
    expect(isLeadClosed({ outcome: "LOST" })).toBe(true);
    expect(isLeadClosed({ outcome: "EXISTING_PATIENT" })).toBe(true);
    expect(isLeadClosed({ outcome: "CONVERTED" })).toBe(false);
    expect(hasPendingPatientMatch({ patientMatchStatus: "POSSIBLE" })).toBe(true);
    expect(hasPendingPatientMatch({ patientMatchStatus: "DISMISSED" })).toBe(false);
  });
});

describe("leadDisplayName", () => {
  it("sin nombre muestra el teléfono", () => {
    expect(leadDisplayName(makeLead({ fullName: null }))).toBe("8888-1234");
    expect(leadDisplayName(makeLead({ fullName: "  ", phone: null }))).toBe("+50588881234");
    expect(leadDisplayName(makeLead({ fullName: null, phone: null, phoneE164: null }))).toBe("carlos@correo.test");
    expect(leadDisplayName(makeLead({ fullName: null, phone: null, phoneE164: null, email: null }))).toBe(
      "Prospecto sin nombre",
    );
  });
});

describe("pipeline", () => {
  const pipeline: LeadPipeline = {
    stages: [
      { stage: "NEW", count: 4 },
      { stage: "CONTACTED", count: 2 },
      { stage: "QUALIFIED", count: 1 },
      { stage: "CONVERTED", count: 6 },
      { stage: "LOST", count: 3 },
    ],
    lostAsExistingPatient: 1,
    overdueFollowUps: 2,
    pendingPatientMatches: 1,
  };

  it("contador del menú = vencidos + coincidencias pendientes", () => {
    expect(pipelineAttentionCount(pipeline)).toBe(3);
    expect(pipelineAttentionCount(undefined)).toBe(0);
  });

  it("conteo por etapa", () => {
    expect(pipelineStageCount(pipeline, "CONVERTED")).toBe(6);
    expect(pipelineStageCount(undefined, "NEW")).toBe(0);
  });
});

describe("seguimientos", () => {
  it("solo un pendiente con fecha pasada está vencido", () => {
    const now = new Date("2026-10-08T12:00:00Z").getTime();
    expect(isFollowUpOverdue({ status: "PENDING", dueAt: "2026-10-07T12:00:00Z" }, now)).toBe(true);
    expect(isFollowUpOverdue({ status: "PENDING", dueAt: "2026-10-09T12:00:00Z" }, now)).toBe(false);
    expect(isFollowUpOverdue({ status: "DONE", dueAt: "2026-10-07T12:00:00Z" }, now)).toBe(false);
  });
});

describe("describeLeadActivity: tolerante con el payload", () => {
  it("cambio de etapa con from/to", () => {
    expect(describeLeadActivity({ type: "STAGE_CHANGED", payload: { from: "NEW", to: "QUALIFIED" } })).toEqual({
      title: "Cambio de etapa",
      detail: "Nuevo → Calificado",
    });
  });

  it("si falta una clave esperada muestra solo el título", () => {
    expect(describeLeadActivity({ type: "STAGE_CHANGED", payload: {} })).toEqual({ title: "Cambio de etapa" });
    expect(describeLeadActivity({ type: "NOTE_ADDED", payload: null })).toEqual({ title: "Nota", detail: undefined });
    expect(describeLeadActivity({ type: "CONVERTED", payload: { method: 42 } })).toEqual({
      title: "Convertido en paciente",
    });
  });

  it("nunca falla con un tipo o un payload desconocido", () => {
    expect(describeLeadActivity({ type: "ALGO_NUEVO", payload: { x: { y: 1 } } })).toEqual({ title: "Actividad" });
    expect(() =>
      describeLeadActivity({ type: "ASSIGNED", payload: "texto" as unknown as Record<string, unknown> }),
    ).not.toThrow();
  });

  it("nota, coincidencia y actor", () => {
    expect(describeLeadActivity({ type: "NOTE_ADDED", payload: { note: "Llamar mañana" } }).detail).toBe("Llamar mañana");
    expect(describeLeadActivity({ type: "PATIENT_MATCH_RESOLVED", payload: { decision: "DISMISS" } }).detail).toBe(
      "Se descartó: es otra persona",
    );
    expect(leadActorLabel({ actorType: "AI", actorName: null })).toBe("Recepcionista IA");
    expect(leadActorLabel({ actorType: "SYSTEM", actorName: null })).toBe("Sistema");
    expect(leadActorLabel({ actorType: "USER", actorName: "Recepción" })).toBe("Recepción");
  });
});

describe("formulario de alta", () => {
  it("exige al menos nombre, teléfono o correo", () => {
    const empty = leadFormSchema.safeParse(EMPTY_LEAD_FORM);
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(empty.error.issues[0].message).toBe("Indica al menos el nombre, el teléfono o el correo.");
    }
    expect(leadFormSchema.safeParse({ ...EMPTY_LEAD_FORM, phone: "8888-1234" }).success).toBe(true);
    expect(leadFormSchema.safeParse({ ...EMPTY_LEAD_FORM, email: "ana@correo.test" }).success).toBe(true);
  });

  it("rechaza < > y caracteres de control, y respeta los límites", () => {
    expect(leadFormSchema.safeParse({ ...EMPTY_LEAD_FORM, fullName: "Ana <b>" }).success).toBe(false);
    expect(leadFormSchema.safeParse({ ...EMPTY_LEAD_FORM, fullName: "Ana\u0007" }).success).toBe(false);
    expect(leadFormSchema.safeParse({ ...EMPTY_LEAD_FORM, fullName: "A".repeat(256) }).success).toBe(false);
    expect(leadFormSchema.safeParse({ ...EMPTY_LEAD_FORM, phone: "8".repeat(65) }).success).toBe(false);
    expect(leadFormSchema.safeParse({ ...EMPTY_LEAD_FORM, fullName: "Ana", note: "n".repeat(1001) }).success).toBe(false);
    expect(leadFormSchema.safeParse({ ...EMPTY_LEAD_FORM, fullName: "Ana", email: "no-es-correo" }).success).toBe(false);
  });

  it("el alta no envía clinicId y solo marca allowDuplicate cuando se pide", () => {
    const values = { ...EMPTY_LEAD_FORM, fullName: "Ana Prueba", phone: "8888-0000" };
    const request = buildCreateLeadRequest(values);
    expect(request).toMatchObject({ fullName: "Ana Prueba", phone: "8888-0000", source: "MANUAL" });
    expect(request).not.toHaveProperty("clinicId");
    expect(request).not.toHaveProperty("allowDuplicate");
    expect(buildCreateLeadRequest(values, true).allowDuplicate).toBe(true);
  });
});

describe("edición: PATCH con version, solo cambios y `clear`", () => {
  const lead = makeLead();

  it("sin cambios solo lleva la version", () => {
    const request = buildUpdateLeadRequest(lead, leadToFormValues(lead));
    expect(request).toEqual({ version: 3 });
    expect(isEmptyLeadUpdate(request)).toBe(true);
  });

  it("un campo omitido no cambia; uno vaciado va en `clear`", () => {
    const request = buildUpdateLeadRequest(lead, {
      ...leadToFormValues(lead),
      fullName: "Carlos Editado",
      email: "",
      temperature: "",
      interestServiceId: "",
    });
    expect(request).toEqual({
      version: 3,
      fullName: "Carlos Editado",
      clear: ["email", "temperature", "interest"],
    });
    expect(request).not.toHaveProperty("phone");
  });

  it("nunca envía source", () => {
    const request = buildUpdateLeadRequest(lead, { ...leadToFormValues(lead), source: "WHATSAPP" });
    expect(request).not.toHaveProperty("source");
  });
});

describe("cierre y reserva", () => {
  it("cerrar no admite EXISTING_PATIENT como motivo", () => {
    expect(leadLoseSchema.safeParse({ reason: "EXISTING_PATIENT", note: "" }).success).toBe(false);
    expect(leadLoseSchema.safeParse({ reason: "NO_RESPONSE", note: "" }).success).toBe(true);
  });

  const booking = {
    doctorId: "doctor-1",
    date: "2026-10-12",
    time: "10:00",
    duration: "",
    type: "consultation",
    notes: "",
    serviceIds: [],
    fullName: "",
    existingPatientId: "",
  };

  it("pide el nombre solo si el prospecto no lo tiene", () => {
    expect(leadBookingSchema({ requireName: false }).safeParse(booking).success).toBe(true);
    expect(leadBookingSchema({ requireName: true }).safeParse(booking).success).toBe(false);
    expect(leadBookingSchema({ requireName: true }).safeParse({ ...booking, fullName: "Carlos" }).success).toBe(true);
  });

  it("doctor, fecha YYYY-MM-DD y hora HH:mm son obligatorios", () => {
    const schema = leadBookingSchema({ requireName: false });
    expect(schema.safeParse({ ...booking, doctorId: "" }).success).toBe(false);
    expect(schema.safeParse({ ...booking, date: "12/10/2026" }).success).toBe(false);
    expect(schema.safeParse({ ...booking, time: "25:00" }).success).toBe(false);
  });
});
