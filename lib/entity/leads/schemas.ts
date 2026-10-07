import { z } from "zod";
import { ISO_DATE, TIME_RE } from "@/lib/validation/fields";
import {
  LEAD_LOSE_REASONS,
  LEAD_SOURCES,
  LEAD_TEMPERATURES,
  type CreateLeadRequest,
  type Lead,
  type LeadClearableField,
  type UpdateLeadRequest,
} from "./index";

/**
 * Validación de los formularios de "Adquisición de pacientes". Replica los límites del
 * backend: no se admiten `<`, `>` ni caracteres de control; notas hasta 1000 caracteres;
 * nombre, correo y textos cortos hasta 255; teléfono hasta 64.
 */

export const LEAD_SHORT_TEXT_MAX = 255;
export const LEAD_NOTE_MAX = 1000;
export const LEAD_PHONE_MAX = 64;

// Construida desde string: los caracteres de control no pueden ir literales en el fuente.
const FORBIDDEN_CHARS = new RegExp("[<>\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]");
const FORBIDDEN_MESSAGE = "No se admiten los caracteres < ni >.";

export function isSafeLeadText(value: string): boolean {
  return !FORBIDDEN_CHARS.test(value);
}

/** Texto opcional: recorta, limita y rechaza `<`, `>` y caracteres de control. */
export function leadText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} admite como máximo ${max} caracteres.`)
    .refine(isSafeLeadText, FORBIDDEN_MESSAGE);
}

const optionalEmail = leadText(LEAD_SHORT_TEXT_MAX, "El correo").refine(
  (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  "El correo no tiene un formato válido.",
);

const optionalPhone = leadText(LEAD_PHONE_MAX, "El teléfono").refine(
  (value) => value === "" || /\d/.test(value),
  "El teléfono debe incluir números.",
);

const temperatureField = z.enum(["", ...LEAD_TEMPERATURES]);

// ─── Alta y edición ─────────────────────────────────────────────────

export const leadFormSchema = z
  .object({
    fullName: leadText(LEAD_SHORT_TEXT_MAX, "El nombre"),
    phone: optionalPhone,
    email: optionalEmail,
    source: z.enum(LEAD_SOURCES),
    sourceDetail: leadText(LEAD_SHORT_TEXT_MAX, "El detalle del origen"),
    interestServiceId: z.string(),
    interestNote: leadText(LEAD_NOTE_MAX, "La nota de interés"),
    temperature: temperatureField,
    assignedToUserId: z.string(),
    note: leadText(LEAD_NOTE_MAX, "La nota"),
  })
  .superRefine((values, ctx) => {
    // Regla del backend: hace falta al menos uno entre nombre, teléfono y correo.
    if (!values.fullName && !values.phone && !values.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fullName"],
        message: "Indica al menos el nombre, el teléfono o el correo.",
      });
    }
  });

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const EMPTY_LEAD_FORM: LeadFormValues = {
  fullName: "",
  phone: "",
  email: "",
  source: "MANUAL",
  sourceDetail: "",
  interestServiceId: "",
  interestNote: "",
  temperature: "",
  assignedToUserId: "",
  note: "",
};

export function leadToFormValues(lead: Lead): LeadFormValues {
  return {
    fullName: lead.fullName ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    source: lead.source,
    sourceDetail: lead.sourceDetail ?? "",
    interestServiceId: lead.interestServiceId ?? "",
    interestNote: lead.interestNote ?? "",
    temperature: lead.temperature ?? "",
    assignedToUserId: lead.assignedToUserId ?? "",
    note: "",
  };
}

const orUndefined = (value: string) => (value ? value : undefined);

export function buildCreateLeadRequest(values: LeadFormValues, allowDuplicate = false): CreateLeadRequest {
  return {
    fullName: orUndefined(values.fullName),
    phone: orUndefined(values.phone),
    email: orUndefined(values.email),
    source: values.source,
    sourceDetail: orUndefined(values.sourceDetail),
    interestServiceId: orUndefined(values.interestServiceId),
    interestNote: orUndefined(values.interestNote),
    temperature: values.temperature || undefined,
    assignedToUserId: orUndefined(values.assignedToUserId),
    note: orUndefined(values.note),
    ...(allowDuplicate ? { allowDuplicate: true } : {}),
  };
}

/**
 * Cuerpo de `PATCH /leads/{id}`: solo lo que cambió respecto al prospecto cargado. Un campo
 * omitido no cambia; uno que el usuario vació se nombra en `clear` (el servicio de interés se
 * vacía con `"interest"`). `source` no se edita nunca. Siempre viaja la `version` cargada.
 */
export function buildUpdateLeadRequest(lead: Lead, values: LeadFormValues): UpdateLeadRequest {
  const request: UpdateLeadRequest = { version: lead.version };
  const clear: LeadClearableField[] = [];

  const text = (
    key: "fullName" | "phone" | "email" | "interestNote" | "sourceDetail",
    next: string,
  ) => {
    const previous = lead[key] ?? "";
    if (next === previous) return;
    if (next) request[key] = next;
    else clear.push(key);
  };

  text("fullName", values.fullName);
  text("phone", values.phone);
  text("email", values.email);
  text("interestNote", values.interestNote);
  text("sourceDetail", values.sourceDetail);

  if (values.temperature !== (lead.temperature ?? "")) {
    if (values.temperature) request.temperature = values.temperature;
    else clear.push("temperature");
  }
  if (values.interestServiceId !== (lead.interestServiceId ?? "")) {
    if (values.interestServiceId) request.interestServiceId = values.interestServiceId;
    else clear.push("interest");
  }

  if (clear.length > 0) request.clear = clear;
  return request;
}

/** `true` si el PATCH no cambiaría nada (solo lleva `version`). */
export function isEmptyLeadUpdate(request: UpdateLeadRequest): boolean {
  return Object.keys(request).every((key) => key === "version");
}

// ─── Notas, seguimientos, cierre ────────────────────────────────────

export const leadNoteSchema = z.object({
  note: leadText(LEAD_NOTE_MAX, "La nota").refine((value) => value.length > 0, "Escribe la nota."),
});
export type LeadNoteValues = z.infer<typeof leadNoteSchema>;

export const leadFollowUpSchema = z.object({
  dueAt: z
    .string()
    .min(1, "Indica la fecha y la hora del seguimiento.")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "La fecha no es válida."),
  note: leadText(LEAD_NOTE_MAX, "La nota"),
  assignedToUserId: z.string(),
});
export type LeadFollowUpValues = z.infer<typeof leadFollowUpSchema>;

export const leadLoseSchema = z.object({
  reason: z.enum(LEAD_LOSE_REASONS, { message: "Selecciona el motivo." }),
  note: leadText(LEAD_NOTE_MAX, "La nota"),
});
export type LeadLoseValues = z.infer<typeof leadLoseSchema>;

export const leadFromConversationSchema = z.object({
  fullName: leadText(LEAD_SHORT_TEXT_MAX, "El nombre"),
  interestServiceId: z.string(),
  interestNote: leadText(LEAD_NOTE_MAX, "La nota"),
});
export type LeadFromConversationValues = z.infer<typeof leadFromConversationSchema>;

// ─── Reserva de la primera cita ─────────────────────────────────────

export const LEAD_APPOINTMENT_TYPES = ["consultation", "control", "emergency", "follow_up", "routine"] as const;

/** `requireName`: el prospecto todavía no tiene nombre y el backend lo necesita para el paciente. */
export function leadBookingSchema({ requireName }: { requireName: boolean }) {
  return z.object({
    doctorId: z.string().min(1, "Selecciona quién atenderá la cita."),
    date: z.string().min(1, "Selecciona la fecha.").regex(ISO_DATE, "La fecha no es válida."),
    time: z.string().min(1, "Selecciona la hora.").regex(TIME_RE, "La hora no es válida."),
    /** Vacío = duración estándar de la clínica (no se envía). */
    duration: z.string().refine((value) => value === "" || /^\d+$/.test(value), "La duración no es válida."),
    type: z.enum(LEAD_APPOINTMENT_TYPES),
    notes: leadText(LEAD_NOTE_MAX, "Las notas"),
    serviceIds: z.array(z.string()),
    fullName: requireName
      ? leadText(LEAD_SHORT_TEXT_MAX, "El nombre").refine(
          (value) => value.length > 0,
          "Indica el nombre para crear al paciente.",
        )
      : leadText(LEAD_SHORT_TEXT_MAX, "El nombre"),
    existingPatientId: z.string(),
  });
}
export type LeadBookingValues = z.infer<ReturnType<typeof leadBookingSchema>>;
