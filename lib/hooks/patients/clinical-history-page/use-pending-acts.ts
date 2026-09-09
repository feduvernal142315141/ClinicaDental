"use client";

import { useMemo } from "react";
import {
  usePatientClinicalEvents,
  type ClinicalEventLike,
} from "./use-patient-clinical-events";
import type { PendingAct } from "@/components/features/patients/clinical-history-page/continuity";

function actLabel(e: ClinicalEventLike): string | null {
  return e.serviceName?.trim() || e.procedureName?.trim() || null;
}

/**
 * FDI CRUDO de la pieza: IDENTIDAD, nunca texto.
 *
 * Este hook no conoce la nomenclatura de la clínica a propósito. La pieza se
 * formatea al PINTAR (`ContinuityStrip`) por dos razones:
 *  1. La clave de deduplicación de abajo se calcula con este número. En Palmer
 *     el dígito es la POSICIÓN (1-8), así que 16/26/36/46 con el mismo servicio
 *     colapsarían en la misma clave y tres actos pendientes desaparecerían en
 *     silencio de la vista de la doctora.
 *  2. El `useMemo` depende solo de `allEvents`: una etiqueta calculada aquí
 *     quedaría congelada en la notación del primer render (la notación de la
 *     clínica se resuelve después, por contexto).
 */
function toothFdiOf(e: ClinicalEventLike): number | undefined {
  const n = e.toothFdi ?? e.toothNumber;
  if (typeof n !== "number" || n < 11 || n > 85) return undefined;
  return n;
}

export function usePendingActs(patientId: string, enabled: boolean) {
  const { allEvents, loading, forbidden, error, reload } = usePatientClinicalEvents(
    patientId,
    enabled,
  );
  const pendingActs = useMemo<PendingAct[]>(() => {
    const out: PendingAct[] = [];
    const seen = new Set<string>();

    {
      for (const e of allEvents) {

        if (e.preexisting === true) continue;
        const isPlanned =
          e.type === "plan" || e.status === "plan" || e.status === "scheduled";
        const isDone = e.status === "done" || e.type === "performed";

        const isCancelled = e.status === "canceled";
        if (!isPlanned || isDone || isCancelled) continue;
        const label = actLabel(e);
        if (!label) continue;
        const toothFdi = toothFdiOf(e);
        // Clave con el FDI crudo: identidad, jamás la etiqueta pintada.
        const key = `${toothFdi ?? "-"}|${label.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        out.push({
          id: e.id,
          toothFdi,
          label,
          scheduled: e.status === "scheduled" || !!e.appointmentId,
        });
      }
    }
    return out;
  }, [allEvents]);
  return { pendingActs, loading, forbidden, error, reload };
}
