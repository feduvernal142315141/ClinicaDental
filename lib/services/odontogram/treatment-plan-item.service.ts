import {
  serviceGet,
  servicePost,
  servicePatch,
  serviceDelete,
} from "../baseService";
import { handleServiceError } from "@/lib/utils/error.utils";
import type {
  AddPlanItemsRequest,
  RegisterPlanItemSessionRequest,
  TreatmentPlanItemsResponse,
  UpdatePlanItemRequest,
} from "@/lib/entity/odontogram";

/**
 * TreatmentPlanItemService
 *
 * Líneas de un plan de tratamiento: la unidad que se presupuesta, se acepta y
 * se ejecuta. Base: /treatment-plans
 *
 * Autenticación: Bearer Token.
 *
 * Permisos (verificado en `TreatmentPlanController`):
 * - Líneas (`/{planId}/items` y `/items/**`) → `odontogram` O `service`.
 * - `registerSession` → SOLO `odontogram`: sella la autoría de un acto clínico.
 * - PERO la pantalla completa exige `odontogram` de todas formas: el
 *   get-or-create del borrador del paciente pasa por `POST /treatment-plans` y
 *   `GET /treatment-plans/patient/{patientId}`, y AMBOS piden `odontogram` a
 *   secas. Es decir, un rol con solo `service` recibe un 403 antes de llegar a
 *   ninguna línea. Consecuencia para la UI: se oculta la PESTAÑA ENTERA cuando
 *   falta `odontogram`, no solo la acción de sesión. Abrir el presupuesto a
 *   recepción sería un cambio de backend (ampliar esos dos endpoints a
 *   `ODONTOGRAM_OR_SERVICE_AUTHORITY`), no algo que el front pueda decidir.
 *
 * IMPORTANTE — los helpers de `baseService` devuelven la AxiosResponse COMPLETA
 * y NUNCA rechazan: un 403 o un 500 llegan como respuesta RESUELTA con `.data`
 * = cuerpo de error. Por eso cada método comprueba el status 2xx antes de
 * devolver `.data`; sin esa comprobación el panel se pintaría vacío (como si el
 * plan no tuviera líneas) tanto si no las hay como si el backend está caído.
 */
const endpoint = "/treatment-plans";

/** `true` cuando la respuesta existe y trae un status 2xx. */
function isOk(response: { status?: number } | null | undefined): boolean {
  return (
    !!response &&
    typeof response.status === "number" &&
    response.status >= 200 &&
    response.status < 300
  );
}

/**
 * Líneas del plan con sus totales ya calculados en el servidor.
 * GET /treatment-plans/{planId}/items
 */
async function getPlanItems(
  planId: string,
): Promise<TreatmentPlanItemsResponse> {
  const response = await serviceGet<TreatmentPlanItemsResponse>(
    `${endpoint}/${planId}/items`,
  );

  if (isOk(response) && response.data) {
    return response.data;
  }

  handleServiceError(
    response ?? null,
    "No se pudieron cargar las líneas del plan de tratamiento",
  );
}

/**
 * Añade líneas al plan. El servidor congela precio y moneda del catálogo.
 * POST /treatment-plans/{planId}/items → 201 con el nº de líneas creadas+revividas.
 *
 * @returns cuántas líneas quedaron en el plan tras la llamada (creadas o
 *   revividas por `syncKey`). Puede ser 0 si todas eran duplicados vivos.
 */
async function addPlanItems(
  planId: string,
  body: AddPlanItemsRequest,
): Promise<number> {
  const response = await servicePost<AddPlanItemsRequest, number>(
    `${endpoint}/${planId}/items`,
    body,
  );

  if (isOk(response)) {
    // El endpoint devuelve un Integer crudo, no un objeto. `Number(...)` cubre
    // que Axios lo entregue como string sin tragarse un NaN silencioso.
    const created = Number(response.data);
    return Number.isFinite(created) ? created : 0;
  }

  handleServiceError(
    response ?? null,
    "No se pudieron añadir las líneas al plan de tratamiento",
  );
}

/**
 * Actualiza la disposición comercial de una línea.
 * PATCH /treatment-plans/items/{itemId}
 *
 * PARCIAL: manda SOLO los campos que cambian; un campo ausente no se toca.
 */
async function updatePlanItem(
  itemId: string,
  body: UpdatePlanItemRequest,
): Promise<boolean> {
  const response = await servicePatch<UpdatePlanItemRequest, boolean>(
    `${endpoint}/items/${itemId}`,
    body,
  );

  if (isOk(response)) {
    return true;
  }

  handleServiceError(
    response ?? null,
    "No se pudo actualizar la línea del plan de tratamiento",
  );
}

/**
 * Registra UNA sesión ejecutada de la línea; el servidor la cierra sola al
 * completar las sesiones previstas.
 * PATCH /treatment-plans/items/{itemId}/session
 *
 * Exige el permiso clínico `odontogram`: afirma que un tratamiento se ejecutó.
 * La UI debe OCULTAR la acción cuando el rol no lo tiene.
 */
async function registerPlanItemSession(
  itemId: string,
  body?: RegisterPlanItemSessionRequest,
): Promise<boolean> {
  const response = await servicePatch<
    RegisterPlanItemSessionRequest,
    boolean
  >(`${endpoint}/items/${itemId}/session`, body ?? {});

  if (isOk(response)) {
    return true;
  }

  handleServiceError(response ?? null, "No se pudo registrar la sesión");
}

/**
 * Quita la línea del presupuesto (no borra el hallazgo del odontograma).
 * DELETE /treatment-plans/items/{itemId}
 */
async function removePlanItem(itemId: string): Promise<boolean> {
  const response = await serviceDelete<undefined, boolean>(
    `${endpoint}/items/${itemId}`,
  );

  if (isOk(response)) {
    return true;
  }

  handleServiceError(
    response ?? null,
    "No se pudo quitar la línea del plan de tratamiento",
  );
}

export const treatmentPlanItemService = {
  getPlanItems,
  addPlanItems,
  updatePlanItem,
  registerPlanItemSession,
  removePlanItem,
};
