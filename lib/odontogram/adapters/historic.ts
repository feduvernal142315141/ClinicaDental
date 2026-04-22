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
): OdontogramAdapter {
  return {
    load: async () => {
      try {
        return JSON.parse(stateJson);
      } catch {
        return null;
      }
    },
    save: async () => {
      // no-op in historic mode
    },
  };
}
