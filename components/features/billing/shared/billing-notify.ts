import { notify } from "@/lib/utils/notify";
import { billingErrorMessage, isModuleDisabledError } from "@/lib/services/billing";

/**
 * Muestra el error de una operación de Finanzas con el `message` del backend tal cual.
 * El 403 de módulo apagado no se notifica: la app ya redirige a "Módulo no disponible".
 */
export function notifyBillingError(error: unknown, title = "No se pudo completar la operación") {
  if (isModuleDisabledError(error)) return;
  notify.error(title, { description: billingErrorMessage(error) });
}
