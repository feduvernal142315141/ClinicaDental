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
  const { allEvents, loading, forbidden, error, reload } = usePatientClinicalEvents(
    patientId,
    enabled,
  );

  const pendingActs = useMemo<PendingAct[]>(() => {
    const out: PendingAct[] = [];
    const seen = new Set<string>();

    // Sobre TODOS los eventos, no sobre los agrupados por visita: el odontograma
    // se puede editar fuera de una consulta y esos eventos no tienen `visitId`.
    // Recorrer solo `byVisit` los perdía, y un plan lleno de actos planificados
    // se anunciaba como "sin pendientes" — lo contrario de la verdad, en la
    // superficie cuyo único trabajo es responder qué queda por hacer.
    {
      for (const e of allEvents) {
        // GUARD CLÍNICO: `preexisting` es trabajo hecho en OTRA clínica que solo
        // se documentó aquí. No está pendiente de nada — ya está hecho, y ni
        // siquiera por nosotros. Contarlo mandaría a la doctora a "terminar" un
        // tratamiento ajeno.
        if (e.preexisting === true) continue;

        // Pendiente = planificado y todavía sin ejecutar. `scheduled` cuenta:
        // está planificado y además ya tiene hueco en la agenda, que es justo el
        // desglose "agendados / sin agendar" que muestra la franja.
        const isPlanned =
          e.type === "plan" || e.status === "plan" || e.status === "scheduled";
        const isDone = e.status === "done" || e.type === "performed";
        // Un acto ANULADO no está pendiente: se decidió no hacerlo. El comentario
        // lo daba por descontado y el código no lo comprobaba, así que un plan
        // anulado seguía reclamando trabajo. OJO: el enum escribe `canceled` con
        // una sola L (clinical-event.types.ts:32); con dos nunca casa.
        const isCancelled = e.status === "canceled";
        if (!isPlanned || isDone || isCancelled) continue;

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
          scheduled: e.status === "scheduled" || !!e.appointmentId,
        });
      }
    }

    return out;
  }, [allEvents]);

  return { pendingActs, loading, forbidden, error, reload };
}
