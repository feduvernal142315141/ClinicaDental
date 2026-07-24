import apiInstance from "@/lib/services/apiConfig";
import { serviceGet, servicePatch } from "@/lib/services/baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  FeedbackTicket,
  FeedbackQueryParams,
  PaginatedFeedbackResponse,
  CreateFeedbackFields,
  CreateFeedbackResponse,
  AddFeedbackCommentRequest,
  FeedbackCommentCreated,
  UpdateFeedbackStatusRequest,
  UpdateFeedbackStatusResponse,
} from "@/lib/entity/feedback";

/**
 * FeedbackService
 *
 * Alineado al contrato real de backend-clinic (FeedbackController).
 * Base endpoint: /feedback
 * Auth: Bearer Token
 */
const endpoint = "/feedback";

function buildQueryString(params?: FeedbackQueryParams): string {
  if (!params) return "";

  const qp = new URLSearchParams();

  if (params.page !== undefined) qp.append("page", params.page.toString());
  if (params.pageSize !== undefined)
    qp.append("pageSize", params.pageSize.toString());

  // Filtros en dialecto standard: campo__op__valor
  if (params.filters && params.filters.length > 0) {
    params.filters.forEach((f) => qp.append("filters", f));
  }

  // Ordenamiento: campo__asc/desc
  if (params.orders && params.orders.length > 0) {
    params.orders.forEach((o) => qp.append("orders", o));
  }

  return qp.toString();
}

/**
 * Crear un ticket de feedback.
 * POST /feedback (multipart/form-data con campos planos)
 */
async function createTicket(
  data: CreateFeedbackFields,
  attachments: File[],
): Promise<CreateFeedbackResponse> {
  const form = new FormData();
  form.append("subject", data.subject);
  form.append("description", data.description);
  form.append("type", data.type);
  if (data.priority) form.append("priority", data.priority);
  if (data.metadata) form.append("metadata", data.metadata);
  attachments.forEach((file) => form.append("attachments", file));

  let response;
  try {
    response = await apiInstance.post<CreateFeedbackResponse>(endpoint, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } catch (err) {
    const axiosErr = err as { response?: { data?: unknown; status?: number } };
    handleServiceError(
      axiosErr?.response ?? null,
      "No se pudo crear el reporte",
    );
  }

  if (response?.status === 200 || response?.status === 201) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "No se pudo crear el reporte",
  );
}

/**
 * Listar mis tickets (paginado).
 * GET /feedback/my?page=&pageSize=&filters=&orders=
 */
async function getMyTickets(
  params?: FeedbackQueryParams,
): Promise<PaginatedFeedbackResponse> {
  const qs = buildQueryString(params);
  const url = `${endpoint}/my${qs ? `?${qs}` : ""}`;
  const response = await serviceGet<PaginatedFeedbackResponse>(url);

  if (response?.status === 200 && response?.data) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "No se pudieron cargar los reportes",
  );
}

/**
 * Obtener detalle de un ticket con comentarios y adjuntos.
 * GET /feedback/:id
 */
async function getTicketById(id: string): Promise<FeedbackTicket> {
  const response = await serviceGet<FeedbackTicket>(`${endpoint}/${id}`);

  if (response?.status === 200 && response?.data) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "No se pudo cargar el reporte",
  );
}

/**
 * Agregar un comentario a un ticket.
 * POST /feedback/:id/comments
 */
async function addComment(
  ticketId: string,
  data: AddFeedbackCommentRequest,
): Promise<FeedbackCommentCreated> {
  // Backend acepta `body` (contrato tipado) y algunos entornos usan `content`.
  const payload = {
    body: data.body,
    content: data.body,
  };

  let response;
  try {
    response = await apiInstance.post<FeedbackCommentCreated>(
      `${endpoint}/${ticketId}/comments`,
      payload,
    );
  } catch (err) {
    const axiosErr = err as { response?: { data?: unknown; status?: number } };
    handleServiceError(
      axiosErr?.response ?? null,
      "No se pudo enviar el comentario",
    );
  }

  if (response?.status === 200 || response?.status === 201) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "No se pudo enviar el comentario",
  );
}

/**
 * Actualizar estado y/o prioridad (solo admin/superadmin).
 * PATCH /feedback/:id/status
 */
async function updateStatus(
  ticketId: string,
  data: UpdateFeedbackStatusRequest,
): Promise<UpdateFeedbackStatusResponse> {
  const response = await servicePatch<
    UpdateFeedbackStatusRequest,
    UpdateFeedbackStatusResponse
  >(`${endpoint}/${ticketId}/status`, data);

  if (response?.status === 200 && response?.data) {
    return response.data;
  }
  handleServiceError(
    typeof response !== "undefined" ? response : null,
    "No se pudo actualizar el estado",
  );
}

export const feedbackService = {
  createTicket,
  getMyTickets,
  getTicketById,
  addComment,
  updateStatus,
};
