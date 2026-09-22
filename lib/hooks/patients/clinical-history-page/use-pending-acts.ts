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
