"use client";

import { type OdontogramAdapter } from "@/lib/odontogram/store";

/**
 * Creates a read-only OdontogramAdapter that serves a pre-loaded historic snapshot.
 * Used to display past odontogram states tied to a specific visit.
 *
 * @param stateJson - JSON string of the odontogram snapshot (from OdontogramVisitSnapshot.state)
 */
export function createHistoricOdontogramAdapter(
  stateJson: string,
  context?: { visitId?: string; patientId: string; clinicId?: string },
): OdontogramAdapter {
  return {
    load: async () => {
      try {
        const snapshot = JSON.parse(stateJson);
        return context ? { ...snapshot, metadata: { ...snapshot.metadata, ...context } } : snapshot;
      } catch {
        return null;
      }
    },
    save: async () => {
      // no-op in historic mode
    },
  };
}
