import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react";
import type { Lead, LeadConversionResult } from "@/lib/entity/leads";
import { LeadApiError } from "@/lib/services/leads/leads-errors";

/** Prospecto ficticio del contrato (solo datos de prueba). */
export function makeLead(overrides: Partial<Lead> = {}): Lead {
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
    interestServiceId: null,
    interestServiceName: "Implante dental",
    interestNote: "Quiere un implante",
    assignedToUserId: null,
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

export function makeConversion(overrides: Partial<LeadConversionResult> = {}): LeadConversionResult {
  return {
    lead: makeLead({ stage: "CONVERTED", outcome: "CONVERTED", conversionMethod: "BOOKING", patientId: "patient-9" }),
    patientId: "patient-9",
    patientCreated: true,
    appointment: { id: "appointment-7", doctorId: "doctor-1", date: "2026-10-12", time: "10:00", duration: 30 },
    replayed: false,
    ...overrides,
  };
}

/** Error del backend tal como lo lanza el cliente HTTP del módulo. */
export function leadError(status: number, errorCode: string | undefined, message = "Mensaje del backend") {
  const kind =
    status === 403 ? (errorCode === "MODULE_NOT_ENABLED" ? "module-disabled" : "forbidden")
    : status === 404 ? "not-found"
    : status === 409 ? "conflict"
    : "bad-request";
  return new LeadApiError(kind, message, status, undefined, errorCode);
}

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
}

export function renderWithQuery(ui: React.ReactElement) {
  const client = createClient();
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

export function renderHookWithQuery<T>(hook: () => T) {
  const client = createClient();
  return {
    client,
    ...renderHook(hook, {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    }),
  };
}
