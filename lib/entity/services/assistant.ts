/**
 * Lo que el asistente de WhatsApp puede decir de un servicio.
 *
 * Se guarda SOLO con `PUT /services/{id}/assistant-profile`: `POST` y `PUT /services`
 * no reciben estos campos ni los modifican.
 */

/** Cuerpo de `PUT /services/{id}/assistant-profile`. Reemplaza los dos valores juntos. */
export interface SetServiceAssistantProfileRequest {
  assistantVisible: boolean;
  /** `null` o en blanco la borra. Una sola línea, hasta 300 caracteres. */
  assistantDescription: string | null;
}

export const SERVICE_ASSISTANT_DESCRIPTION_MAX = 300;

const ASSISTANT_OFFERED_TYPES: readonly string[] = ["TREATMENT", "PROCEDURE"];

/** Solo tratamientos y procedimientos pueden mostrarse al asistente; productos y anticipos no. */
export function canOfferToAssistant(type: string | null | undefined): boolean {
  return !!type && ASSISTANT_OFFERED_TYPES.includes(type);
}

export type AssistantToggleBlock = "type" | "inactive";

/** Por qué el interruptor está deshabilitado, o `null` si se puede cambiar. */
export function assistantToggleBlock(service: {
  type?: string | null;
  active?: boolean;
}): AssistantToggleBlock | null {
  if (!canOfferToAssistant(service.type)) return "type";
  // Un servicio inactivo nunca se menciona.
  if (service.active === false) return "inactive";
  return null;
}

export type AssistantMissingInfo = "duration" | "price" | "both";

/** Datos que el asistente dirá "a confirmar por la clínica" en un servicio visible. */
export function assistantMissingInfo(service: {
  assistantVisible?: boolean;
  duration?: number | null;
  cost?: number | null;
}): AssistantMissingInfo | null {
  if (!service.assistantVisible) return null;
  const noDuration = !service.duration || service.duration <= 0;
  const noPrice = !service.cost || service.cost <= 0;
  if (noDuration && noPrice) return "both";
  if (noDuration) return "duration";
  return noPrice ? "price" : null;
}

/** Control ASCII y C1 más los separadores de línea Unicode: lo que el backend rechaza en la descripción. */
function isControlCharacter(character: string): boolean {
  const code = character.charCodeAt(0);
  return code <= 31 || (code >= 127 && code <= 159) || code === 8232 || code === 8233;
}

/** `true` si el texto trae saltos de línea, tabulaciones u otro carácter de control. */
export function hasAssistantControlCharacters(text: string): boolean {
  return Array.from(text).some(isControlCharacter);
}

/** Deja el texto en una sola línea (lo pegado con saltos o tabulaciones pasa a espacios). */
export function toSingleLine(text: string): string {
  return Array.from(text, (character) => (isControlCharacter(character) ? " " : character)).join("");
}

/** Valor que viaja al backend: recortado, o `null` si queda vacío. */
export function assistantDescriptionPayload(text: string | null | undefined): string | null {
  const trimmed = (text ?? "").trim();
  return trimmed ? trimmed : null;
}

export function buildAssistantProfile(
  assistantVisible: boolean,
  assistantDescription: string | null | undefined,
): SetServiceAssistantProfileRequest {
  return { assistantVisible, assistantDescription: assistantDescriptionPayload(assistantDescription) };
}

/** `true` si lo que hay en el formulario difiere de lo guardado. */
export function isAssistantProfileChanged(
  saved: { assistantVisible?: boolean; assistantDescription?: string | null },
  next: { assistantVisible: boolean; assistantDescription?: string | null },
): boolean {
  return (
    !!saved.assistantVisible !== next.assistantVisible ||
    assistantDescriptionPayload(saved.assistantDescription) !== assistantDescriptionPayload(next.assistantDescription)
  );
}
