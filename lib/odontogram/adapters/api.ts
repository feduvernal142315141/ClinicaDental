"use client";

import { odontogramService } from "@/lib/services/odontogram";
import {
  createEmptySnapshot,
  type OdontogramAdapter,
  type OdontogramSnapshot,
} from "@/lib/odontogram/store";

/** UUID v4 — formato exigido cuando el guardado sí va ligado a una visita. */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Options for the API adapter.
 * `authorId` and `clinicId` are provided by the host context (auth / patient).
 */
export interface ApiOdontogramAdapterOptions {
  /** UUID of the logged-in doctor. */
  authorId: string;
  /** UUID of the clinic (from the patient record). */
  clinicId: string;
  /** Optional visit/appointment UUID for the current session. */
  visitId?: string;
}

/**
 * Creates an `OdontogramAdapter` that persists to the backend REST API.
 *
 * The adapter:
 *  - **load**: `GET /odontograms/patient/{patientId}` → `JSON.parse(state)` → snapshot.
 *  - **save**: serialises `{ teeth, clinicalEvents }` → `PUT /odontograms`.
 *
 * Treatment-plan CRUD is managed separately via `useTreatmentPlans` / `treatmentPlanService`.
 */
export function createApiOdontogramAdapter(
  options: ApiOdontogramAdapterOptions,
): OdontogramAdapter {
  return {
    async load(patientId, clinicId) {
      const response = await odontogramService.getOdontogram(patientId);

      if (!response) {
        const emptySnapshot = createEmptySnapshot({
          patientId,
          clinicId: clinicId ?? options.clinicId,
        });

        return {
          ...emptySnapshot,
          metadata: {
            ...emptySnapshot.metadata,
            authorId: options.authorId,
            visitId: options.visitId,
          },
        };
      }

      // Parse the JSON string stored in `state`.
      const parsedState = JSON.parse(response.state) as {
        schemaVersion?: number;
        teeth: OdontogramSnapshot["teeth"];
        clinicalEvents: OdontogramSnapshot["clinicalEvents"];
      };

      const snapshot: OdontogramSnapshot = {
        schemaVersion: parsedState.schemaVersion ?? 1,
        teeth: parsedState.teeth,
        clinicalEvents: parsedState.clinicalEvents,
        treatmentPlans: [], // treatment plans live in their own API table
        metadata: {
          version: response.version,
          patientId: response.patientId,
          clinicId: clinicId ?? options.clinicId,
          authorId: options.authorId,
          visitId: options.visitId,
          updatedAt: response.updatedAt,
        },
      };

      return snapshot;
    },

    async save(patientId, snapshot, clinicId) {
      // Sin visita también se guarda: el odontograma se llena fuera de una consulta
      // al volcar fichas en papel de pacientes anteriores al sistema (el backend
      // actualiza el estado vivo y no escribe historial). Lo que sí se rechaza es
      // una visita con formato inválido: ligaría el snapshot a un id inventado.
      const visitId = snapshot.metadata.visitId ?? options.visitId ?? null;
      if (visitId && !UUID_V4.test(visitId)) {
        throw new Error("El identificador de la visita no es válido.");
      }

      const state = JSON.stringify({
        schemaVersion: snapshot.schemaVersion,
        teeth: snapshot.teeth,
        clinicalEvents: snapshot.clinicalEvents,
      });

      await odontogramService.saveOdontogram({
        patientId,
        visitId,
        authorId: snapshot.metadata.authorId ?? options.authorId,
        clinicId: clinicId ?? snapshot.metadata.clinicId ?? options.clinicId,
        version: (snapshot.metadata.version ?? 0) + 1,
        state,
      });
    },

    async reset(patientId, clinicId) {
      // Reset is a save with empty state (version 1)
      const empty = createEmptySnapshot({
        patientId,
        clinicId: clinicId ?? options.clinicId,
      });

      const state = JSON.stringify({
        schemaVersion: empty.schemaVersion,
        teeth: empty.teeth,
        clinicalEvents: empty.clinicalEvents,
      });

      await odontogramService.saveOdontogram({
        patientId,
        authorId: options.authorId,
        clinicId: clinicId ?? options.clinicId,
        version: 1,
        state,
      });
    },
  };
}
