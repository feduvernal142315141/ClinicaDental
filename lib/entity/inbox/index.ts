/**
 * WhatsApp Inbox entities — aligned with backend JdbcInboxRepository records.
 */

// ── Enums ───────────────────────────────────────────────────────────────────

export type ConversationStatus = "OPEN" | "NEEDS_HUMAN" | "RESOLVED";
export type HandlingMode = "DALIA" | "HUMAN";
export type SenderType = "CONTACT" | "DALIA" | "STAFF" | "SYSTEM";
export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageDeliveryStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "N_A";

// ── Conversation (list row) ─────────────────────────────────────────────────

export interface InboxConversation {
  id: string;
  clinicId: string;
  whatsappAccountId: string;
  contactPhone: string;
  patientId: string | null;
  patientName: string | null;
  status: ConversationStatus;
  handlingMode: HandlingMode;
  assignedTo: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastInboundAt: string | null;
  lastMessagePreview: string | null;
}

export interface InboxConversationPage {
  rows: InboxConversation[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Conversation detail ─────────────────────────────────────────────────────

export interface InboxConversationDetail extends InboxConversation {
  patientPhone: string | null;
  patientEmail: string | null;
  nextAppointmentId: string | null;
  nextAppointmentDate: string | null;
  nextAppointmentTime: string | null;
  nextAppointmentDoctorName: string | null;
  windowOpen: boolean;
  windowExpiresAt: string | null;
}

// ── Message ─────────────────────────────────────────────────────────────────

export interface InboxMessage {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  senderType: SenderType;
  senderUserId: string | null;
  role: string | null;
  content: string;
  wamid: string | null;
  status: MessageDeliveryStatus;
  statusUpdatedAt: string | null;
  messageType: string;
  createdAt: string;
}

// ── Summary ─────────────────────────────────────────────────────────────────

export interface InboxSummary {
  totalUnread: number;
  needsHuman: number;
  openHuman: number;
  openDalia: number;
}

// ── Query params ────────────────────────────────────────────────────────────

export interface InboxConversationQueryParams {
  status?: ConversationStatus;
  handlingMode?: HandlingMode;
  unreadOnly?: boolean;
  assignedToMe?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface InboxMessageQueryParams {
  before?: string;
  beforeId?: string;
  limit?: number;
}

// ── Send message ────────────────────────────────────────────────────────────

export interface SendInboxMessageRequest {
  text: string;
}

export interface LinkPatientRequest {
  patientId: string;
}

// ── Filter presets ──────────────────────────────────────────────────────────

export type InboxFilterPreset =
  | "all"
  | "unread"
  | "needs_human"
  | "dalia"
  | "human"
  | "assigned_to_me"
  | "resolved";

export const INBOX_FILTER_PRESETS: {
  value: InboxFilterPreset;
  label: string;
  params: Partial<InboxConversationQueryParams>;
}[] = [
  { value: "all", label: "Todas", params: {} },
  { value: "unread", label: "No leídas", params: { unreadOnly: true } },
  { value: "needs_human", label: "Requiere atención", params: { status: "NEEDS_HUMAN" } },
  { value: "dalia", label: "Dalia", params: { handlingMode: "DALIA" } },
  { value: "human", label: "Humano", params: { handlingMode: "HUMAN" } },
  { value: "assigned_to_me", label: "Asignadas a mí", params: { assignedToMe: true } },
  { value: "resolved", label: "Resueltas", params: { status: "RESOLVED" } },
];

// ── Status labels ───────────────────────────────────────────────────────────

export const DELIVERY_STATUS_LABELS: Record<MessageDeliveryStatus, string> = {
  PENDING: "Enviando",
  SENT: "Enviado",
  DELIVERED: "Entregado",
  READ: "Leído",
  FAILED: "Fallido",
  N_A: "",
};

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  OPEN: "Abierta",
  NEEDS_HUMAN: "Requiere atención",
  RESOLVED: "Resuelta",
};

export const HANDLING_MODE_LABELS: Record<HandlingMode, string> = {
  DALIA: "Dalia",
  HUMAN: "Humano",
};
