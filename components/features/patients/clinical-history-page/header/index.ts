/**
 * Cabecera del expediente del paciente (rediseño de /patients/[id]).
 *
 * - `PatientRecordHeader`: identidad + alertas + acciones, a todo el ancho.
 * - `VisitRibbon`: cinta de contexto de la visita, ENTRE la cabecera y las
 *   pestañas (nunca dentro de una pestaña).
 */
export { PatientRecordHeader } from "./PatientRecordHeader";
export type { PatientRecordHeaderProps } from "./PatientRecordHeader";

export { VisitRibbon } from "./VisitRibbon";
export type { VisitRibbonProps, VisitRibbonState } from "./VisitRibbon";
