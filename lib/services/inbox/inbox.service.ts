import { serviceGet, servicePost, servicePut } from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  InboxConversationPage,
  InboxConversationDetail,
  InboxMessage,
  InboxSummary,
  InboxConversationQueryParams,
  InboxMessageQueryParams,
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
  const response = await servicePost<Record<string, never>, boolean>(
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

// ── SSE Ticket ─────────────────────────────────────────────────────────────

export async function createInboxSseTicket(): Promise<string> {
  const response = await servicePost<Record<string, never>, { ticket: string }>(
    `${BASE}/events/ticket`, {},
  );
  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    // Backend may wrap in { data: { ticket } } or return { ticket } directly
    const body = response.data as unknown as { data?: { ticket?: string }; ticket?: string };
    const ticket = body?.data?.ticket ?? body?.ticket;
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
