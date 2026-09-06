import type { Appointment } from "@/lib/entity/appointment/appointments";

/**
 * Estado de editabilidad de la visita en contexto.
 *
 * `unknown` NO es un error: es "todavía no lo sé". Se trata como fail-open en
 * los dos consumidores para no flashear solo-lectura, porque `loadAppointments`
 * pone `appointmentsLoading = true` en CADA refetch y ahora se refresca al
 * iniciar una consulta.
 */
export type VisitEditability =
  | { kind: "no-visit" }
  | { kind: "unknown" }
  | { kind: "editable" }
  | { kind: "locked"; reason: "terminal" | "not-started" | "not-listed" };

export interface VisitEditabilityInput {
  /** Cita en contexto (query param o sesión restaurada). */
  appointmentId?: string;
  /** Lista de citas del paciente ya cargada. */
  appointments: Appointment[];
  /** La lista está en vuelo. */
  appointmentsLoading: boolean;
  /**
   * Status leído de `GET /appointments/{id}` en el efecto de restauración.
   * MANDA sobre la lista: la lista viene capada a 100 por el backend, ordenada
   * por `createAt` y sin las canceladas, así que "no está en la lista" no
   * significa "no existe".
   */
  verifiedStatus?: Appointment["status"];
}

/**
 * FUENTE ÚNICA de la editabilidad de una visita.
 *
 * Antes esta regla estaba escrita dos veces con resultados OPUESTOS: el hook de
 * la página trataba una cita ausente de la lista como no terminal (fail-open →
 * Workspace activo con cronómetro), y `PatientOdontogramPanel` la trataba como
 * no editable (fail-closed → overlay "visita finalizada"). Con una cita
 * cancelada, o más allá del tope de 100 del backend, la pantalla mostraba a la
 * vez un cronómetro corriendo y un odontograma bloqueado, sin explicación.
 *
 * Regla de negocio (D1): SOLO `in_progress` habilita la escritura. Una cita
 * `scheduled` no tiene fila `PatientVisitRecord` — la crea
 * `StartAppointmentCommandHandler` al iniciar—, así que el `PATCH` de notas
 * respondería 404 y el odontograma sellaría eventos con la fecha de un
 * encuentro que aún no ha ocurrido. Se documenta con `reason: "not-started"`
 * para que la UI ofrezca iniciarla en vez de dejar escribir en el vacío.
 */
export function getVisitEditability({
  appointmentId,
  appointments,
  appointmentsLoading,
  verifiedStatus,
}: VisitEditabilityInput): VisitEditability {
  if (!appointmentId) return { kind: "no-visit" };

  const fromStatus = (status: Appointment["status"]): VisitEditability => {
    if (status === "in_progress") return { kind: "editable" };
    if (status === "scheduled") return { kind: "locked", reason: "not-started" };
    return { kind: "locked", reason: "terminal" };
  };

  // El status verificado gana sobre la lista: se pidió por id, sin filtros ni tope.
  if (verifiedStatus) return fromStatus(verifiedStatus);

  if (appointmentsLoading) return { kind: "unknown" };

  const fromList = appointments.find((a) => a.id === appointmentId);
  if (fromList) return fromStatus(fromList.status);

  // Ni verificada ni en la lista. La lista excluye las canceladas
  // (`GetPatientAppointmentsQueryHandler`, `status NEQ cancelled`), así que el
  // caso más probable es precisamente una cita cancelada.
  return { kind: "locked", reason: "not-listed" };
}

/** ¿Hay una consulta en curso sobre la que se puede documentar? */
export function isEditableVisit(editability: VisitEditability): boolean {
  return editability.kind === "editable";
}

/**
 * ¿Debe bloquearse la escritura? `unknown` NO bloquea (fail-open mientras carga);
 * `no-visit` tampoco: el odontograma se puede llenar fuera de una consulta, para
 * volcar la ficha en papel de un paciente anterior al sistema.
 */
export function isLockedVisit(editability: VisitEditability): boolean {
  return editability.kind === "locked";
}
