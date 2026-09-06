"use client";

import { useCallback, useMemo, useState } from "react";

import type { Appointment } from "@/lib/entity/appointment/appointments";
import { parseLocalValue } from "@/lib/datetime";
import { formatVisitDate } from "@/lib/utils/visit-eligibility";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";

/**
 * Estado del compositor de evolución. Es una unión EXHAUSTIVA a propósito: el
 * componente hace `switch` sobre `kind`, así que añadir un caso obliga a
 * pintarlo en lugar de degradar en silencio al camino "se puede guardar".
 *
 * - `ready`              — hay una consulta `in_progress`: el `PATCH
 *                          /clinical-history/patients/{id}/visits/{appointmentId}/notes`
 *                          tiene fila contra la que escribir.
 * - `needs-consultation` — no la hay: el backend responde 404 porque la fila
 *                          `PatientVisitRecord` la CREA `StartAppointmentCommandHandler`.
 *                          Se puede redactar, pero guardar implica abrir consulta.
 * - `read-only`          — el rol no puede escribir en la historia clínica.
 * - `loading`            — todavía no se sabe; no se ofrece ninguna acción.
 */
export type ComposerMode =
  | { kind: "ready"; appointmentId: string }
  | { kind: "needs-consultation" }
  | { kind: "read-only" }
  | { kind: "loading" };

export interface UseEvolutionComposerParams {
  /** Citas del paciente ya cargadas por el host. El hook NO hace fetch. */
  appointments: Appointment[];
  /** El host sigue pidiendo citas: aún no se puede afirmar que no hay consulta. */
  loading?: boolean;
  /**
   * Consulta activa que el host ya resolvió (query `?appointmentId=`). Solo se
   * acepta si esa cita sigue `in_progress`: un id de una visita ya finalizada
   * llevaría al 409 de `completed/cancelled`.
   */
  activeAppointmentId?: string | null;
  /**
   * Sobrescribe el gate de permiso cuando el host ya lo calculó. Sin esto el
   * hook lo deriva por su cuenta de `usePermission` (contexto, no red).
   */
  canWriteClinicalHistory?: boolean;
}

export interface UseEvolutionComposerResult {
  mode: ComposerMode;
  /** Borrador en TEXTO PLANO. Sobrevive al cambio de modo (ver `setValue`). */
  value: string;
  setValue: (value: string) => void;
  /** Vacía el borrador. El host la llama DESPUÉS de un guardado con éxito. */
  clearDraft: () => void;
  soapEnabled: boolean;
  setSoapEnabled: (enabled: boolean) => void;
  /** Contra qué se va a escribir, en una línea. Nunca vacío salvo en `read-only`. */
  contextLabel: string;
  /** Atajo de `mode.kind !== "read-only" && mode.kind !== "loading"`. */
  canWrite: boolean;
}

/**
 * Texto plano del compositor → el HTML que espera `clinicalNotes`.
 *
 * `clinical_notes` es una columna TEXT que se RENDERIZA como HTML, así que un
 * `<` tecleado por el clínico (p. ej. "dolor < 2 días") se comería el resto de
 * la frase al pintarla. Se escapa primero y se envuelve cada línea no vacía en
 * `<p>` para que los saltos de línea sobrevivan al viaje.
 *
 * Solo vale para el BORRADOR de este compositor, que siempre nace vacío y es
 * texto plano. No pasar por aquí HTML ya formado: quedaría escapado dos veces.
 */
export function draftToHtml(draft: string): string {
  const escaped = draft
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

/**
 * Estado del compositor "Escribir evolución de hoy…".
 *
 * Su única responsabilidad es decir CONTRA QUÉ se va a escribir. El backend no
 * admite una nota de visita sin cita iniciada, y el plan B tentador —
 * `PATCH /clinical-history/patients/{id}/notes` — es OTRO registro, sin fecha y
 * de reemplazo total: usarlo destruiría dato clínico en silencio. Por eso la
 * ausencia de consulta es un MODO explícito y no un error de guardado.
 */
export function useEvolutionComposer({
  appointments,
  loading = false,
  activeAppointmentId,
  canWriteClinicalHistory,
}: UseEvolutionComposerParams): UseEvolutionComposerResult {
  // El borrador vive aquí y NO se limpia al cambiar de modo: el flujo normal es
  // teclear sin consulta abierta, pulsar "Guardar e iniciar consulta" y volver
  // con `mode.kind === "ready"`. Si el texto colgara del modo, ese viaje lo
  // borraría justo cuando ya está redactado.
  const [value, setValue] = useState("");

  // OFF por defecto: solo afecta al DICTADO (pide a la IA que estructure el
  // audio). El backend no guarda bloques S/O/A/P — `clinicalNotes` es un único
  // string — así que activarlo no cambia lo que queda registrado.
  const [soapEnabled, setSoapEnabled] = useState(false);

  const { isAdmin, can } = usePermission();

  const canWriteDerived =
    canWriteClinicalHistory ??
    (isAdmin ||
      can("clinical_history", PermissionAction.EDIT) ||
      can("clinical_history", PermissionAction.CREATE));

  const mode = useMemo<ComposerMode>(() => {
    // El permiso se resuelve contra el contexto de sesión, sin red: se decide
    // ANTES que `loading` para no enseñar un esqueleto de editor a un rol que
    // nunca va a poder escribir.
    if (!canWriteDerived) return { kind: "read-only" };
    if (loading) return { kind: "loading" };

    // Solo `in_progress` es una consulta en curso. Una `scheduled` todavía no
    // tiene fila `PatientVisitRecord` (404) y una `completed`/`cancelled` está
    // cerrada (409).
    const preferred = activeAppointmentId
      ? appointments.find(
          (appointment) =>
            appointment.id === activeAppointmentId &&
            appointment.status === "in_progress",
        )
      : undefined;

    const running =
      preferred ??
      appointments.find((appointment) => appointment.status === "in_progress");

    if (running) return { kind: "ready", appointmentId: running.id };
    return { kind: "needs-consultation" };
  }, [appointments, activeAppointmentId, canWriteDerived, loading]);

  const contextLabel = useMemo(() => {
    switch (mode.kind) {
      case "ready": {
        const visit = appointments.find(
          (appointment) => appointment.id === mode.appointmentId,
        );
        // `parseLocalValue`, no `new Date(date)`: un 'YYYY-MM-DD' pelado se
        // interpreta como UTC y en America/La_Paz sale el día anterior.
        const date = parseLocalValue(visit?.date);
        // Sin fecha usable NO se inventa una: la frase se queda sin el "del
        // {fecha}" antes que afirmar un día que no consta en el registro.
        if (!date) return "Se guardará en la consulta en curso";
        return `Se guardará en la consulta del ${formatVisitDate(date)}`;
      }
      case "needs-consultation":
        return "No hay consulta en curso · se abrirá una para registrar esta evolución";
      case "loading":
        return "Comprobando si hay una consulta en curso…";
      case "read-only":
        return "";
      default: {
        const never: never = mode;
        return never;
      }
    }
  }, [mode, appointments]);

  const clearDraft = useCallback(() => setValue(""), []);

  return {
    mode,
    value,
    setValue,
    clearDraft,
    soapEnabled,
    setSoapEnabled,
    contextLabel,
    canWrite: mode.kind === "ready" || mode.kind === "needs-consultation",
  };
}

export default useEvolutionComposer;
