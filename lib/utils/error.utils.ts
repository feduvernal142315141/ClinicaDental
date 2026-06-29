import { safeUserMessage } from "@/lib/errors/normalize-error";

/**
 * Centraliza la extracción de mensajes de error de la API.
 * Busca iterativamente las propiedades `message` y `details` en la respuesta.
 * Lanza un Error estándar con el mensaje extraído y expone el código de estado HTTP.
 *
 * El mensaje es SANITIZADO a través de `safeUserMessage`: si el backend filtró
 * información técnica (nombres de clase, archivo, línea), se reemplaza por el
 * mensaje del mapa de status correspondiente. Nunca se expone información interna.
 */
export function handleServiceError(
  response: { data?: unknown; status?: number } | null | undefined,
  defaultMessage: string,
): never {
  const responseData = response?.data as
    | { message?: string; details?: string }
    | undefined;

  const rawMessage = responseData?.message || responseData?.details;
  const status = response?.status;

  // safeUserMessage valida el mensaje contra patrones de fuga y cae al mapa
  // por status si es inseguro. Si no hay mensaje crudo, usa el defaultMessage.
  const errorMessage = rawMessage
    ? safeUserMessage(rawMessage, status)
    : defaultMessage;

  const error = new Error(errorMessage);

  // Inyectar el status code si existe para que interceptores o la UI reaccionen
  if (status !== undefined) {
    (error as Error & { status?: number }).status = status;
  }

  throw error;
}
