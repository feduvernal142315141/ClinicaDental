/**
 * Estado de la plantilla en Meta. `NOT_IN_ACCOUNT`: la plantilla es de la
 * clínica pero no existe en su cuenta ACTUAL de WhatsApp Business (cambió de
 * número a otra cuenta); Meta rechaza los envíos hasta que se republique.
 */
export type MetaTemplateStatus = "PENDING" | "APPROVED" | "REJECTED" | "NOT_IN_ACCOUNT";

/** Por qué una plantilla no se puede elegir para un recordatorio o una campaña. */
export type TemplateUnusableReason = Extract<MetaTemplateStatus, "PENDING" | "NOT_IN_ACCOUNT">;

/**
 * `null` si la plantilla se puede usar (o si su estado la excluye sin más, como
 * `REJECTED`). Devuelve el motivo solo para los estados que conviene MOSTRAR
 * deshabilitados: el usuario espera verlas y necesita saber por qué no puede.
 */
export function templateUnusableReason(
  template: Pick<ClinicTemplate, "metaTemplateStatus">,
): TemplateUnusableReason | null {
  const status = template.metaTemplateStatus;
  return status === "PENDING" || status === "NOT_IN_ACCOUNT" ? status : null;
}

export interface ClinicTemplate {
  id: string;
  clinicId?: string;
  name: string;
  body?: string;
  type?: string;
  /** Meta template category: "MARKETING" | "UTILITY" | "AUTHENTICATION" */
  category?: string;
  provider?: "META" | "TWILIO";
  metaTemplateName?: string;
  metaTemplateStatus?: MetaTemplateStatus;
  metaTemplateId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReminderConfigResponse {
  id: string;
  clinicId: string;
  reminderMinutesBefore: number;
  templateId: string;
  enabled: boolean;
  template?: ClinicTemplate;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReminderConfigRequest {
  reminderMinutesBefore: number;
  templateId: string;
}

export interface UpdateReminderConfigRequest {
  reminderMinutesBefore?: number;
  templateId?: string;
  enabled?: boolean;
}

export interface MetaTemplateSyncResult {
  imported: number;
  updated: number;
  total: number;
  message: string;
  /** Plantillas de la clínica que no están en la cuenta actual y quedaron marcadas. */
  unavailable?: number;
}

/** Motivo por el que republicar dejó fuera una plantilla. */
export type RepublishReason = "CREATED_OUTSIDE_PANEL" | "EMPTY_BODY" | "META_REJECTED";

export interface MetaTemplateRepublishItem {
  id: string;
  name: string;
  /** El backend puede añadir motivos: se tolera cualquier texto. */
  reason: RepublishReason | (string & {});
}

/** POST /clinic-template/republish-meta. No es todo o nada. */
export interface MetaTemplateRepublishResult {
  /** Creadas de nuevo en Meta; quedan "Pendiente" hasta que Meta las apruebe. */
  republished: number;
  /** Ya existían en la cuenta con ese nombre; solo se actualizó su estado. */
  alreadyInAccount: number;
  skipped: MetaTemplateRepublishItem[];
  failed: MetaTemplateRepublishItem[];
}

// ── Eliminar plantillas ────────────────────────────────────────────────────

/** Máximo de plantillas que el backend acepta eliminar en una petición. */
export const TEMPLATE_DELETE_MAX = 100;

/** Motivo por el que una plantilla no se eliminó. */
export type TemplateDeleteReason =
  | "IN_USE_BY_REMINDER"
  | "IN_USE_BY_CAMPAIGN"
  | "META_DELETE_FAILED";

export interface TemplateDeleteItem {
  id: string;
  name: string;
  /** El backend puede añadir motivos: se tolera cualquier texto. */
  reason: TemplateDeleteReason | (string & {});
}

/**
 * DELETE /clinic-template/{id} y POST /clinic-template/delete. No es todo o
 * nada, tampoco al eliminar una sola: puede responder 200 con `deleted = 0` y
 * la plantilla en `blocked` o `failed`. `deletedIds` dice cuáles salieron.
 */
export interface TemplateDeleteResult {
  deleted: number;
  deletedIds: string[];
  /** En uso por un recordatorio o una campaña: no se eliminan. */
  blocked: TemplateDeleteItem[];
  /** Meta no confirmó el borrado: se puede reintentar. */
  failed: TemplateDeleteItem[];
}

/**
 * Plantillas que ya no sirven para enviar y solo ocupan la lista: las que Meta
 * rechazó y las que no están en la cuenta actual de WhatsApp.
 */
export function isTemplateBeyondUse(
  template: Pick<ClinicTemplate, "metaTemplateStatus">,
): boolean {
  return (
    template.metaTemplateStatus === "REJECTED" ||
    template.metaTemplateStatus === "NOT_IN_ACCOUNT"
  );
}
