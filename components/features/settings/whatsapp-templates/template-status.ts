import type { TranslationKey } from "@/lib/i18n/translations";
import type { RepublishReason } from "@/lib/entity/settings";

type Translate = (key: TranslationKey) => string;

export interface TemplateStatusConfig {
  label: string;
  className: string;
  /** Explicación breve del estado, cuando no se entiende solo. */
  hint?: string;
}

/** Etiqueta y estilo del estado de una plantilla en Meta; `null` si no tiene. */
export function getTemplateStatusConfig(
  status: string | undefined,
  t: Translate,
): TemplateStatusConfig | null {
  switch (status) {
    case "APPROVED":
      return { label: t("settings.notifications.templates.status.approved"), className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
    case "PENDING":
      return { label: t("settings.notifications.templates.status.pending"), className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    case "REJECTED":
      return { label: t("settings.notifications.templates.status.rejected"), className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" };
    case "NOT_IN_ACCOUNT":
      // Advertencia, no rechazo: Meta no la ha rechazado, es que no está en esta cuenta.
      return {
        label: t("settings.notifications.templates.status.notInAccount"),
        className: "border border-dashed border-orange-400 bg-orange-50 text-orange-800 dark:border-orange-500/60 dark:bg-orange-950/40 dark:text-orange-300",
        hint: t("settings.notifications.templates.status.notInAccountHint"),
      };
    default:
      return null;
  }
}

const REASON_KEYS: Record<RepublishReason, TranslationKey> = {
  CREATED_OUTSIDE_PANEL: "settings.notifications.republish.reason.createdOutsidePanel",
  EMPTY_BODY: "settings.notifications.republish.reason.emptyBody",
  META_REJECTED: "settings.notifications.republish.reason.metaRejected",
};

/** Motivo de republicación en lenguaje claro y qué hacer; nunca el código crudo. */
export function republishReasonText(reason: string, t: Translate): string {
  const key = REASON_KEYS[reason as RepublishReason];
  return t(key ?? "settings.notifications.republish.reason.unknown");
}
