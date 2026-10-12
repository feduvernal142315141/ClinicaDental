import { serviceDelete, serviceGet, serviceGetSilent, servicePost, servicePostSilent, servicePut } from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  InboxConversationPage,
  InboxConversationDetail,
  InboxMessage,
  InboxSummary,
  InboxConversationQueryParams,
  InboxMessageQueryParams,
  DeleteConversationsResult,
} from "@/lib/entity/inbox";

const BASE = "/whatsapp/inbox";

// ── List conversations ──────────────────────────────────────────────────────

export async function getInboxConversations(
  params?: InboxConversationQueryParams,
): Promise<InboxConversationPage> {
  const qs = new URLSearchParams();
  if (params?.status) qs.append("status", params.status);
  if (params?.handlingMode) qs.append("handlingMode", params.handlingMode);
  if (params?.unreadOnly) qs.append("unreadOnly", "true");
  if (params?.assignedToMe) qs.append("assignedToMe", "true");
  if (params?.search) qs.append("search", params.search);
  if (params?.page !== undefined) qs.append("page", String(params.page));
  if (params?.pageSize !== undefined) qs.append("pageSize", String(params.pageSize));

  const query = qs.toString();
  const url = query ? `${BASE}/conversations?${query}` : `${BASE}/conversations`;
  const response = await serviceGet<InboxConversationPage>(url);
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as InboxConversationPage;
  }
  handleServiceError(response, "Error al cargar conversaciones");
}

// ── Conversation detail ─────────────────────────────────────────────────────

export async function getInboxConversationDetail(
  id: string,
): Promise<InboxConversationDetail> {
  const response = await serviceGet<InboxConversationDetail>(
    `${BASE}/conversations/${id}`,
  );
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as InboxConversationDetail;
  }
  handleServiceError(response, "Error al cargar la conversación");
}

// ── Messages (keyset pagination, newest first) ──────────────────────────────

export async function getInboxMessages(
  conversationId: string,
  params?: InboxMessageQueryParams,
): Promise<InboxMessage[]> {
  const qs = new URLSearchParams();
  if (params?.before) qs.append("before", params.before);
  if (params?.beforeId) qs.append("beforeId", params.beforeId);
  if (params?.limit) qs.append("limit", String(params.limit));

  const query = qs.toString();
  const url = query
    ? `${BASE}/conversations/${conversationId}/messages?${query}`
    : `${BASE}/conversations/${conversationId}/messages`;
  const response = await serviceGet<InboxMessage[]>(url);
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as InboxMessage[];
  }
  handleServiceError(response, "Error al cargar mensajes");
}

// ── Summary ─────────────────────────────────────────────────────────────────

export async function getInboxSummary(): Promise<InboxSummary> {
  const response = await serviceGet<InboxSummary>(`${BASE}/summary`);
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as InboxSummary;
  }
  handleServiceError(response, "Error al cargar resumen");
}

// ── Mutations ───────────────────────────────────────────────────────────────

export async function markConversationRead(id: string): Promise<void> {
  const response = await servicePostSilent<Record<string, never>, boolean>(
    `${BASE}/conversations/${id}/read`, {},
  );
  if (response?.status >= 200 && response?.status < 300) return;
  handleServiceError(response, "Error al marcar como leída");
}

export async function takeoverConversation(id: string): Promise<void> {
  const response = await servicePost<Record<string, never>, boolean>(
    `${BASE}/conversations/${id}/takeover`, {},
  );
  if (response?.status >= 200 && response?.status < 300) return;
  // 409 CONVERSATION_ALREADY_ASSIGNED handled by caller
  handleServiceError(response, "Error al tomar la conversación");
}

export async function releaseConversation(id: string): Promise<void> {
  const response = await servicePost<Record<string, never>, boolean>(
    `${BASE}/conversations/${id}/release`, {},
  );
  if (response?.status >= 200 && response?.status < 300) return;
  handleServiceError(response, "Error al devolver la conversación");
}

export async function resolveConversation(id: string): Promise<void> {
  const response = await servicePost<Record<string, never>, boolean>(
    `${BASE}/conversations/${id}/resolve`, {},
  );
  if (response?.status >= 200 && response?.status < 300) return;
  handleServiceError(response, "Error al resolver la conversación");
}

export async function reopenConversation(id: string): Promise<void> {
  const response = await servicePost<Record<string, never>, boolean>(
    `${BASE}/conversations/${id}/reopen`, {},
  );
  if (response?.status >= 200 && response?.status < 300) return;
  handleServiceError(response, "Error al reabrir la conversación");
}

// ── Delete ──────────────────────────────────────────────────────────────────

function toDeleteResult(data: unknown): DeleteConversationsResult | null {
  const body = data as Partial<DeleteConversationsResult> | null | undefined;
  if (!body || !Array.isArray(body.deletedIds)) return null;
  const deletedIds = body.deletedIds.filter((id): id is string => typeof id === "string");
  return { deleted: deletedIds.length, deletedIds };
}

/** Saca una conversación de la bandeja de toda la clínica. 404 si ya no existía. */
export async function deleteConversation(id: string): Promise<DeleteConversationsResult> {
  const response = await serviceDelete<undefined, DeleteConversationsResult>(
    `${BASE}/conversations/${id}`,
  );
  if (response?.status >= 200 && response?.status < 300) {
    const result = toDeleteResult(response.data);
    if (result) return result;
  }
  handleServiceError(response, "Error al eliminar la conversación");
}

/**
 * Saca varias conversaciones de la bandeja (de 1 a 100). 404 si ninguna existía;
 * las que no existan se omiten: `deletedIds` dice cuáles salieron.
 */
export async function deleteConversations(ids: string[]): Promise<DeleteConversationsResult> {
  const response = await servicePost<{ ids: string[] }, DeleteConversationsResult>(
    `${BASE}/conversations/delete`, { ids },
  );
  if (response?.status >= 200 && response?.status < 300) {
    const result = toDeleteResult(response.data);
    if (result) return result;
  }
  handleServiceError(response, "Error al eliminar las conversaciones");
}

export async function sendInboxMessage(
  conversationId: string,
  text: string,
): Promise<void> {
  const response = await servicePost<{ text: string }, boolean>(
    `${BASE}/conversations/${conversationId}/messages`,
    { text },
  );
  if (response?.status >= 200 && response?.status < 300) return;
  // 422 WHATSAPP_CUSTOMER_SERVICE_WINDOW_CLOSED handled by caller
  handleServiceError(response, "Error al enviar el mensaje");
}

// ── Silent versions (no global loading bar — for polling/SSE refresh) ──────

export async function getInboxConversationsSilent(
  params?: InboxConversationQueryParams,
): Promise<InboxConversationPage> {
  const qs = new URLSearchParams();
  if (params?.status) qs.append("status", params.status);
  if (params?.handlingMode) qs.append("handlingMode", params.handlingMode);
  if (params?.unreadOnly) qs.append("unreadOnly", "true");
  if (params?.assignedToMe) qs.append("assignedToMe", "true");
  if (params?.search) qs.append("search", params.search);
  if (params?.page !== undefined) qs.append("page", String(params.page));
  if (params?.pageSize !== undefined) qs.append("pageSize", String(params.pageSize));
  const query = qs.toString();
  const url = query ? `${BASE}/conversations?${query}` : `${BASE}/conversations`;
  const response = await serviceGetSilent<InboxConversationPage>(url);
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as InboxConversationPage;
  }
  handleServiceError(response, "Error al cargar conversaciones");
}

export async function getInboxConversationDetailSilent(
  id: string,
): Promise<InboxConversationDetail> {
  const response = await serviceGetSilent<InboxConversationDetail>(`${BASE}/conversations/${id}`);
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as InboxConversationDetail;
  }
  handleServiceError(response, "Error al cargar la conversación");
}

export async function getInboxMessagesSilent(
  conversationId: string,
  params?: InboxMessageQueryParams,
): Promise<InboxMessage[]> {
  const qs = new URLSearchParams();
  if (params?.before) qs.append("before", params.before);
  if (params?.beforeId) qs.append("beforeId", params.beforeId);
  if (params?.limit) qs.append("limit", String(params.limit));
  const query = qs.toString();
  const url = query
    ? `${BASE}/conversations/${conversationId}/messages?${query}`
    : `${BASE}/conversations/${conversationId}/messages`;
  const response = await serviceGetSilent<InboxMessage[]>(url);
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as InboxMessage[];
  }
  handleServiceError(response, "Error al cargar mensajes");
}

export async function getInboxSummarySilent(): Promise<InboxSummary> {
  const response = await serviceGetSilent<InboxSummary>(`${BASE}/summary`);
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data as unknown as InboxSummary;
  }
  handleServiceError(response, "Error al cargar resumen");
}

// ── SSE Ticket ─────────────────────────────────────────────────────────────

export async function createInboxSseTicket(): Promise<string> {
  const response = await servicePostSilent<Record<string, never>, { ticketId: string }>(
    `${BASE}/events/ticket`, {},
  );
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    // El backend responde { ticketId }. Se aceptan también { ticket } y el
    // envoltorio { data: {...} } de versiones anteriores del contrato.
    type TicketBody = { ticketId?: string; ticket?: string };
    const body = response.data as unknown as TicketBody & { data?: TicketBody };
    const ticket =
      body?.ticketId ?? body?.ticket ?? body?.data?.ticketId ?? body?.data?.ticket;
    if (typeof ticket === "string" && ticket.length > 0) {
      return ticket;
    }
    throw new Error("Ticket response missing or empty");
  }
  handleServiceError(response, "Error al obtener ticket SSE");
}

// ── Link patient ───────────────────────────────────────────────────────────

export async function linkConversationPatient(
  conversationId: string,
  patientId: string,
): Promise<void> {
  const response = await servicePut<{ patientId: string }, boolean>(
    `${BASE}/conversations/${conversationId}/patient`,
    { patientId },
  );
  if (response?.status >= 200 && response?.status < 300) return;
  handleServiceError(response, "Error al vincular paciente");
}
