import { notify } from "@/lib/utils/notify";
import { isLeadModuleDisabledError, leadErrorMessage } from "@/lib/services/leads";

/**
 * Muestra el error de una operación con el `message` del backend tal cual.
 * El 403 de módulo apagado no se repite aquí: la app ya avisa y refresca las capacidades.
 */
export function notifyLeadError(error: unknown, title = "No se pudo completar la operación") {
  if (isLeadModuleDisabledError(error)) return;
  notify.error(title, { description: leadErrorMessage(error) });
}
