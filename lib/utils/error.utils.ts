import { ServiceResponse } from "@/lib/models/response";

/**
 * Centraliza la extracción de mensajes de error de la API.
 * Busca iterativamente las propiedades `message` y `details` en la respuesta.
 * Lanza un Error estándar con el mensaje extraído y expone el código de estado HTTP.
 */
export function handleServiceError(
  response: ServiceResponse<unknown> | null | undefined,
  defaultMessage: string,
): never {
  const responseData = response?.data as
    | { message?: string; details?: string }
    | undefined;

  const errorMessage =
    responseData?.message || responseData?.details || defaultMessage;

  const error = new Error(errorMessage);

  // Inyectar el status code si existe para que interceptores o la UI reaccionen
  if (response?.status !== undefined) {
    (error as Error & { status?: number }).status = response.status;
  }

  throw error;
}
