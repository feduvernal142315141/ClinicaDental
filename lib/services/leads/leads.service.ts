import type {
  BookLeadRequest,
  ConvertLeadRequest,
  CreateLeadRequest,
  Lead,
  LeadActivityPage,
  LeadByConversation,
  LeadConsentStatus,
  LeadConversionResult,
  LeadDetail,
  LeadFilters,
  LeadFollowUp,
  LeadFromConversationRequest,
  LeadFromConversationResult,
  LeadListQuery,
  LeadMatches,
  LeadOpenStage,
  LeadPage,
  LeadPipeline,
  LoseLeadRequest,
  ResolvePatientMatchRequest,
  ScheduleFollowUpRequest,
  UpdateLeadRequest,
} from "@/lib/entity/leads";
import { leadPageParams, leadRequest, type LeadParams } from "./leads-http";

const BASE = "/leads";

function filterParams(filters: LeadFilters): LeadParams {
  return {
    q: filters.q?.trim().slice(0, 100),
    stage: filters.stage,
    temperature: filters.temperature,
    unclassified: filters.unclassified,
    source: filters.source,
    assignedToUserId: filters.assignedToUserId,
    unassigned: filters.unassigned,
    interestServiceId: filters.interestServiceId,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    lastActivityFrom: filters.lastActivityFrom,
    lastActivityTo: filters.lastActivityTo,
    overdueFollowUp: filters.overdueFollowUp,
    pendingPatientMatch: filters.pendingPatientMatch,
  };
}

/** Contrato `/leads` del backend. Única puerta HTTP del módulo. */
export const leadsService = {
  // ── Lecturas ───────────────────────────────────────────────────────
  list({ page, pageSize, ...filters }: LeadListQuery = {}, options: { silent?: boolean } = {}) {
    return leadRequest<LeadPage>("GET", BASE, {
      params: { ...filterParams(filters), ...leadPageParams(page, pageSize) },
      silent: options.silent,
    });
  },

  /** Mismos filtros que la lista, salvo `stage`. Solo conteos. */
  pipeline(filters: LeadFilters = {}, options: { silent?: boolean } = {}) {
    const params = { ...filterParams(filters), stage: undefined };
    return leadRequest<LeadPipeline>("GET", `${BASE}/pipeline`, { params, silent: options.silent });
  },

  get(id: string) {
    return leadRequest<LeadDetail>("GET", `${BASE}/${id}`, { expectedStatuses: [404] });
  },

  activity(id: string, page = 0, pageSize = 20) {
    return leadRequest<LeadActivityPage>("GET", `${BASE}/${id}/activity`, {
      params: leadPageParams(page, pageSize),
      silent: true,
    });
  },

  byConversation(conversationId: string) {
    return leadRequest<LeadByConversation>("GET", `${BASE}/by-conversation/${conversationId}`, { silent: true });
  },

  matches(query: { phone?: string; email?: string }) {
    return leadRequest<LeadMatches>("GET", `${BASE}/matches`, {
      params: { phone: query.phone?.trim(), email: query.email?.trim() },
      silent: true,
    });
  },

  // ── Escrituras ─────────────────────────────────────────────────────
  create(data: CreateLeadRequest) {
    return leadRequest<Lead>("POST", BASE, { data });
  },

  update(id: string, data: UpdateLeadRequest) {
    return leadRequest<Lead>("PATCH", `${BASE}/${id}`, { data });
  },

  changeStage(id: string, stage: LeadOpenStage) {
    return leadRequest<Lead>("POST", `${BASE}/${id}/stage`, { data: { stage } });
  },

  addNote(id: string, note: string) {
    return leadRequest<Lead>("POST", `${BASE}/${id}/notes`, { data: { note } });
  },

  setConsent(id: string, status: Exclude<LeadConsentStatus, "UNKNOWN">, note?: string) {
    return leadRequest<Lead>("POST", `${BASE}/${id}/consent`, { data: { status, note } });
  },

  scheduleFollowUp(id: string, data: ScheduleFollowUpRequest) {
    return leadRequest<LeadFollowUp>("POST", `${BASE}/${id}/follow-ups`, { data });
  },

  completeFollowUp(id: string, followUpId: string, note?: string) {
    return leadRequest<LeadFollowUp>("POST", `${BASE}/${id}/follow-ups/${followUpId}/complete`, {
      data: note ? { note } : undefined,
    });
  },

  cancelFollowUp(id: string, followUpId: string, note?: string) {
    return leadRequest<LeadFollowUp>("POST", `${BASE}/${id}/follow-ups/${followUpId}/cancel`, {
      data: note ? { note } : undefined,
    });
  },

  /** `userId: null` desasigna. */
  assign(id: string, userId: string | null) {
    return leadRequest<Lead>("POST", `${BASE}/${id}/assign`, { data: { userId } });
  },

  lose(id: string, data: LoseLeadRequest) {
    return leadRequest<Lead>("POST", `${BASE}/${id}/lose`, { data });
  },

  reopen(id: string) {
    return leadRequest<Lead>("POST", `${BASE}/${id}/reopen`);
  },

  archive(id: string) {
    return leadRequest<boolean>("DELETE", `${BASE}/${id}`);
  },

  fromConversation(data: LeadFromConversationRequest) {
    return leadRequest<LeadFromConversationResult>("POST", `${BASE}/from-conversation`, { data });
  },

  /**
   * Reserva la primera cita: el backend crea o enlaza el paciente, crea la cita y convierte el
   * prospecto en una sola operación. Es seguro reintentar (`replayed: true`). Un rechazo de la
   * agenda llega sin `errorCode` (400, 404 o 422) y no deja nada creado.
   */
  book(id: string, data: BookLeadRequest) {
    return leadRequest<LeadConversionResult>("POST", `${BASE}/${id}/book`, { data, expectedStatuses: [400, 404, 422] });
  },

  /** Convierte sin cita (`conversionMethod: "MANUAL"`). Requiere `leads_manage`. */
  convert(id: string, data?: ConvertLeadRequest) {
    return leadRequest<LeadConversionResult>("POST", `${BASE}/${id}/convert`, { data });
  },

  resolvePatientMatch(id: string, data: ResolvePatientMatchRequest) {
    return leadRequest<Lead>("POST", `${BASE}/${id}/patient-match`, { data });
  },
};

export type LeadsService = typeof leadsService;
