"use client";

import { useCallback, useState } from "react";

import { appointmentsService } from "@/lib/services/appointments";
import { treatmentPlanService } from "@/lib/services/odontogram";
import {
  useOdontogramStoreApi,
  type OdontogramAdapter,
} from "@/lib/odontogram/store";
import type { TreatmentPlanResponse } from "@/lib/entity/odontogram";
import type {
  AppointmentServiceSnapshot,
  CreateAppointmentRequest,
} from "@/lib/entity/appointment";
import { notify } from "@/lib/utils/notify";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRealServiceId(id: string | undefined | null): id is string {
  return !!id && UUID_V4.test(id);
}

export interface FollowUpAppointmentInput {
  doctorId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number; // minutos
  notes?: string;
}

export interface FinalizeAppointmentInput {
  /** Planes de tratamiento actuales del paciente (del hook useTreatmentPlans). */
  treatmentPlans: TreatmentPlanResponse[];
  /** Si se envía, se crea una cita de seguimiento con los servicios pendientes. */
  followUp?: FollowUpAppointmentInput;
  /** Servicios pendientes a asignar al seguimiento (clínicos events tipo "plan" no completados). */
  pendingServices?: AppointmentServiceSnapshot[];
}

export interface UseFinalizeAppointmentOptions {
  visitId: string | undefined;
  patientId: string;
  clinicId: string;
  adapter: OdontogramAdapter;
}

export interface UseFinalizeAppointmentReturn {
  finalize: (
    input: FinalizeAppointmentInput,
  ) => Promise<{ followUpId?: string }>;
  loading: boolean;
  error: string | null;
}

function parseEventIds(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Hook orquestador de finalización de cita.
 *
 * Flujo (FRONT-APPT-03 / HU-APPT-004):
 *  1. Persiste snapshot actual del odontograma (adapter.save inmediato, sin debounce).
 *  2. Marca como `completed` los planes cuyos eventIds estén todos con
 *     `status === 'done'` en los clinicalEvents del snapshot.
 *  3. `PATCH /appointments/{visitId}/complete` para cerrar la cita actual.
 *  4. (Opcional) `POST /appointments` con los servicios pendientes como seguimiento.
 *  5. Resuelve con `{ followUpId? }`; errores se reportan vía `error` y `message`.
 */
export function useFinalizeAppointment({
  visitId,
  patientId,
  clinicId,
  adapter,
}: UseFinalizeAppointmentOptions): UseFinalizeAppointmentReturn {
  const storeApi = useOdontogramStoreApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalize = useCallback(
    async ({
      treatmentPlans,
      followUp,
      pendingServices,
    }: FinalizeAppointmentInput): Promise<{ followUpId?: string }> => {
      if (!visitId || !UUID_V4.test(visitId)) {
        const msg = "No hay una cita válida para finalizar.";
        setError(msg);
        notify.error(msg);
        throw new Error(msg);
      }
      if (!patientId) {
        const msg = "Falta el identificador de paciente.";
        setError(msg);
        notify.error(msg);
        throw new Error(msg);
      }

      setLoading(true);
      setError(null);

      try {
        const snapshot = storeApi.getState().getSnapshot();

        // ── 1. Persistir odontograma (inmediato) ────────────────────────
        try {
          await adapter.save(patientId, snapshot, clinicId);
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : "Error al guardar el odontograma antes de finalizar.";
          setError(msg);
          notify.error(msg);
          throw err;
        }

        // ── 2. Cerrar planes de tratamiento completados ─────────────────
        const doneEventIds = new Set(
          snapshot.clinicalEvents
            .filter((ev) => ev.status === "done")
            .map((ev) => ev.id),
        );

        for (const plan of treatmentPlans) {
          if (plan.status === "completed") continue;

          const planEventIds = parseEventIds(plan.eventIds);
          if (planEventIds.length === 0) continue;

          const allDone = planEventIds.every((id) => doneEventIds.has(id));
          if (!allDone) continue;

          try {
            await treatmentPlanService.updateTreatmentPlan({
              id: plan.id,
              name: plan.name,
              description: plan.description ?? "",
              totalPrice: plan.totalPrice,
              status: "completed",
              eventIds: plan.eventIds,
            });
          } catch (err) {
            console.warn(
              `[useFinalizeAppointment] No se pudo completar el plan ${plan.id}`,
              err,
            );
          }
        }

        // ── 3. Completar la cita actual ────────────────────────────────
        try {
          await appointmentsService.completeAppointment(visitId);
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : "Error al marcar la cita como realizada.";
          setError(msg);
          notify.error(msg);
          throw err;
        }

        // ── 4. Seguimiento opcional ─────────────────────────────────────
        let followUpId: string | undefined;
        if (followUp && pendingServices && pendingServices.length > 0) {
          const realServices = pendingServices.filter((s) =>
            isRealServiceId(s.serviceId),
          );

          if (realServices.length > 0) {
            const primary = [...realServices].sort(
              (a, b) => (b.serviceCost ?? 0) - (a.serviceCost ?? 0),
            )[0];

            const payload: CreateAppointmentRequest = {
              patientId,
              doctorId: followUp.doctorId,
              date: followUp.date,
              time: followUp.time,
              duration: followUp.duration,
              type: "follow_up",
              status: "scheduled",
              serviceId: primary.serviceId,
              serviceIds: realServices.map((s) => s.serviceId),
              notes:
                followUp.notes ??
                `Seguimiento automático con ${realServices.length} servicio(s) pendiente(s).`,
            };

            try {
              followUpId = await appointmentsService.createAppointment(payload);
              notify.success(
                "Cita marcada como realizada y seguimiento programado.",
              );
            } catch (err) {
              console.warn(
                "[useFinalizeAppointment] Cita completada pero falló el seguimiento",
                err,
              );
              notify.warning(
                "Cita marcada como realizada, pero no se pudo crear el seguimiento. Créalo manualmente.",
              );
            }
          } else {
            notify.success("Cita marcada como realizada.");
          }
        } else {
          notify.success("Cita marcada como realizada.");
        }

        return { followUpId };
      } finally {
        setLoading(false);
      }
    },
    [visitId, patientId, clinicId, adapter, storeApi],
  );

  return { finalize, loading, error };
}
