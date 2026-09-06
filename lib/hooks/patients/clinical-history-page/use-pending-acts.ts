"use client";

import { useMemo } from "react";
import {
  usePatientClinicalEvents,
  type ClinicalEventLike,
} from "./use-patient-clinical-events";
import type { PendingAct } from "@/components/features/patients/clinical-history-page/continuity";

/**
 * Actos planificados que siguen sin ejecutarse, derivados del odontograma vivo.
 *
 * Responde la mitad de la pregunta que una cronología no contesta nunca: no
 * "qué hice la última vez" sino "qué queda pendiente". Cuesta CERO peticiones
 * extra — reutiliza el índice que `usePatientClinicalEvents` ya construyó de una
 * sola lectura del odontograma del paciente.
 */

/** Nombre legible del acto. Si no hay ninguno, no se inventa: se omite el acto. */
function actLabel(e: ClinicalEventLike): string | null {
  return e.serviceName?.trim() || e.procedureName?.trim() || null;
}

/**
 * Pieza en notación FDI. El índice la expone como número (36) y la UI la muestra
 * con punto de cuadrante (3.6), que es como la lee un odontólogo.
 */
function toothLabel(e: ClinicalEventLike): string | undefined {
  const n = e.toothFdi ?? e.toothNumber;
  if (typeof n !== "number" || n < 11 || n > 85) return undefined;
  return `${Math.floor(n / 10)}.${n % 10}`;
}

export function usePendingActs(patientId: string, enabled: boolean) {
  const { byVisit, loading, forbidden, error } = usePatientClinicalEvents(
    patientId,
    enabled,
  );

  const pendingActs = useMemo<PendingAct[]>(() => {
    const out: PendingAct[] = [];
    const seen = new Set<string>();

    for (const events of byVisit.values()) {
      for (const e of events) {
        // GUARD CLÍNICO: `preexisting` es trabajo hecho en OTRA clínica que solo
        // se documentó aquí. No está pendiente de nada — ya está hecho, y ni
        // siquiera por nosotros. Contarlo mandaría a la doctora a "terminar" un
        // tratamiento ajeno.
        if (e.preexisting === true) continue;

        // Solo lo PLANIFICADO y todavía sin ejecutar. Un evento ya realizado
        // (`performed` / `done`) no es pendiente, y uno cancelado tampoco.
        const isPlanned = e.type === "plan" || e.status === "plan";
        const isDone = e.status === "done" || e.type === "performed";
        if (!isPlanned || isDone) continue;

        const label = actLabel(e);
        if (!label) continue;

        // Deduplicado por pieza+acto: replanificar la misma pieza en dos visitas
        // no son dos pendientes, es el mismo acto arrastrado.
        const tooth = toothLabel(e);
        const key = `${tooth ?? "-"}|${label.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        out.push({
          id: e.id,
          toothFdi: tooth,
          label,
          // `appointmentId` en un evento de plan es la cita FUTURA agendada para
          // ejecutarlo, no la visita donde se registró: por eso sirve para saber
          // si el acto ya tiene hueco en la agenda.
          scheduled: !!e.appointmentId,
        });
      }
    }

    return out;
  }, [byVisit]);

  return { pendingActs, loading, forbidden, error };
}
