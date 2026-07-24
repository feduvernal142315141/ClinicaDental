/**
 * Feedback Entity Types
 *
 * Tipos alineados al contrato real de backend-clinic (FeedbackController).
 * Base path: /feedback — ver docs/development/feedback-backend-spec.md
 */

// ── Enums / Unions ─────────────────────────────────────────────

export type FeedbackType = "bug" | "improvement" | "question" | "other";

export type FeedbackStatus =
  | "pending"
  | "in_review"
  | "in_progress"
  | "resolved"
  | "closed";

export type FeedbackPriority = "low" | "medium" | "high";

// ── Metadata capturada automáticamente ─────────────────────────

export interface FeedbackMetadata {
  currentUrl?: string;
  currentRoute?: string;
  browser?: string;
  screenSize?: string;
  theme?: string;
  appVersion?: string;
  activePatientId?: string;
  activeAppointmentId?: string;
  /** Backend acepta cualquier JSON; estos campos son convención del frontend */
  [key: string]: string | undefined;
}

// ── Attachment (detalle) ───────────────────────────────────────

export interface FeedbackAttachment {
  id: string;
  publicId?: string;
  /** URL pública Cloudinary (contrato principal). */
  secureUrl: string;
  /** Alias plano por si el backend serializa solo `url`. */
  url?: string;
  resourceType?: string;
  originalFileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  position?: number;
  width?: number;
  height?: number;
}

// ── Comentarios ────────────────────────────────────────────────

export interface FeedbackComment {
  id: string;
  authorName: string;
  /** Texto del comentario (contrato frontend). */
  body?: string;
  /** Alias que algunos payloads del backend pueden devolver. */
  content?: string;
  createdAt: string;
}

/** Response al crear un comentario */
export interface FeedbackCommentCreated {
  commentId: string;
  ticketId: string;
  authorName: string;
  createdAt: string;
}

// ── Ticket completo (GET /feedback/:id) ────────────────────────

export interface FeedbackTicket {
  id: string;
  clinicId: string;
  subject: string;
  description: string;
  submittedByName: string;
  submittedByEmail: string;
  type: FeedbackType;
  priority: FeedbackPriority | null;
  status: FeedbackStatus;
  metadata: FeedbackMetadata | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
  closedAt: string | null;
  closedByName: string | null;
  comments: FeedbackComment[];
  attachments: FeedbackAttachment[];
}

// ── Resumen para listado (GET /feedback/my) ────────────────────

export interface FeedbackTicketSummary {
  id: string;
  subject: string;
  type: FeedbackType;
  priority: FeedbackPriority | null;
  status: FeedbackStatus;
  createdAt: string;
  /** Solo presente en GET /feedback/admin */
  submittedByName?: string;
}

// ── Request payloads ───────────────────────────────────────────

/** Campos enviados como form fields en POST /feedback (multipart) */
export interface CreateFeedbackFields {
  subject: string;
  description: string;
  type: FeedbackType;
  priority?: FeedbackPriority;
  /** JSON serializado de FeedbackMetadata */
  metadata?: string;
}

/** Response de POST /feedback */
export interface CreateFeedbackResponse {
  ticketId: string;
  status: FeedbackStatus;
  priority: FeedbackPriority | null;
}

export interface AddFeedbackCommentRequest {
  body: string;
}

export interface UpdateFeedbackStatusRequest {
  status: FeedbackStatus;
  /** `null` limpia la prioridad asignada. */
  priority?: FeedbackPriority | null;
}

/** Response de PATCH /feedback/{id}/status */
export interface UpdateFeedbackStatusResponse {
  id: string;
  status: FeedbackStatus;
  priority: FeedbackPriority | null;
  updatedAt: string;
}

// ── Query params ───────────────────────────────────────────────

export interface FeedbackQueryParams {
  page?: number;
  pageSize?: number;
  /** Filtros en dialecto standard: campo__op__valor */
  filters?: string[];
  /** Ordenamiento: campo__asc/desc */
  orders?: string[];
}

// ── Response paginada ──────────────────────────────────────────

export interface PaginatedFeedbackResponse {
  entities: FeedbackTicketSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

// ── Constantes UI ──────────────────────────────────────────────

export const FEEDBACK_TYPE_OPTIONS: {
  value: FeedbackType;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: "bug",
    label: "Error",
    icon: "Bug",
    description: "Algo no funciona como debería",
  },
  {
    value: "improvement",
    label: "Mejora",
    icon: "Lightbulb",
    description: "Sugerencia para mejorar la app",
  },
  {
    value: "question",
    label: "Pregunta",
    icon: "HelpCircle",
    description: "Necesito ayuda con algo",
  },
  {
    value: "other",
    label: "Otro",
    icon: "MoreHorizontal",
    description: "Otro tipo de reporte",
  },
];

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  in_progress: "En progreso",
  resolved: "Resuelto",
  closed: "Cerrado",
};

export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
  in_review: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25",
  in_progress: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25",
  resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  closed: "bg-surface text-subtle border-hairline",
};

export const FEEDBACK_TYPE_COLORS: Record<FeedbackType, string> = {
  bug: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25",
  improvement: "bg-brand/10 text-brand border-brand/25",
  question: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/25",
  other: "bg-surface text-subtle border-hairline",
};
