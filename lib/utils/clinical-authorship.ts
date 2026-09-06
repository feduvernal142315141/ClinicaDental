/**
 * Autoría de una nota clínica — normalización única para toda la ficha.
 *
 * El backend sobreescribe la nota y sólo conserva el ÚLTIMO editor. Cuando ese
 * campo no identifica a nadie (`null`, vacío o el literal "anonymous" que emite
 * el contexto de seguridad sin usuario) NO hay constancia de autoría, y no se
 * puede sustituir por `doctorName`: el doctor de la cita es una asignación de
 * agenda, no prueba de quién escribió la nota.
 *
 * Vive aquí y no en un componente porque lo consumen tres superficies distintas
 * —la tarjeta del feed, el drawer de historial y el editor— y una sola de ellas
 * imprimiendo "anonymous" ya convierte el documento en algo que afirma un autor
 * falso.
 */

/** Texto que se muestra cuando el registro no identifica a nadie. */
export const NO_AUTHORSHIP_LABEL = "Sin registro de autoría";

/**
 * Devuelve el autor legible, o `null` si el registro no identifica a nadie.
 * Quien lo consuma debe conservar el resto del sello (la fecha) también en el
 * caso `null`: perder la marca de tiempo por no haber autor sería borrar un dato
 * que sí existe.
 */
export function resolveAuthorship(
  updatedBy: string | undefined | null,
): string | null {
  const value = updatedBy?.trim();
  if (!value || value.toLowerCase() === "anonymous") return null;
  return value;
}
