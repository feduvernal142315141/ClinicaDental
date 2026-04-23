"use client";

import { useState, useCallback, useEffect } from "react";
import { App } from "antd";
import { clinicalHistoryService } from "@/lib/services/clinical-history";
import type {
  PatientVisitRecord,
  UpsertVisitRecordRequest,
} from "@/lib/entity/clinical-history";

export function useVisitRecord(patientId: string, appointmentId?: string) {
  const { message } = App.useApp();
  const [record, setRecord] = useState<PatientVisitRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    try {
      const data = await clinicalHistoryService.getVisitRecord(
        patientId,
        appointmentId,
      );
      setRecord(data);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 404) {
        // No visit record yet — graceful empty state
        setRecord(null);
      } else {
        message.error(e?.message || "Error al cargar registro de visita");
      }
    } finally {
      setLoading(false);
    }
  }, [patientId, appointmentId, message]);

  // Auto-load when appointmentId is present
  useEffect(() => {
    if (appointmentId) {
      load();
    } else {
      setRecord(null);
    }
  }, [appointmentId, load]);

  const save = useCallback(
    async (data: UpsertVisitRecordRequest) => {
      if (!appointmentId) return;
      setSaving(true);
      try {
        await clinicalHistoryService.upsertVisitRecord(
          patientId,
          appointmentId,
          data,
        );
        setRecord((prev) => {
          const cleanPain = data.currentPain
            ? {
                location: data.currentPain.location,
                intensity: data.currentPain.intensity ?? undefined,
                type: data.currentPain.type,
                duration: data.currentPain.duration,
              }
            : undefined;
          if (prev) {
            return { ...prev, ...data, currentPain: cleanPain ?? prev.currentPain };
          }
          return { appointmentId: appointmentId!, patientId, ...data, currentPain: cleanPain };
        });
        message.success("Registro de visita guardado");
      } catch (err: unknown) {
        const e = err as { message?: string };
        message.error(e?.message || "Error al guardar registro de visita");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [patientId, appointmentId, message],
  );

  const saveNotes = useCallback(
    async (html: string): Promise<{ updatedAt: string; updatedBy: string }> => {
      if (!appointmentId) throw new Error("No hay consulta activa");
      setSaving(true);
      try {
        const result = await clinicalHistoryService.saveVisitNotes(
          patientId,
          appointmentId,
          html,
        );
        setRecord((prev) =>
          prev
            ? {
                ...prev,
                clinicalNotes: html,
                clinicalNotesUpdatedAt: result.updatedAt,
                clinicalNotesUpdatedBy: result.updatedBy,
              }
            : {
                appointmentId,
                patientId,
                clinicalNotes: html,
                clinicalNotesUpdatedAt: result.updatedAt,
                clinicalNotesUpdatedBy: result.updatedBy,
              },
        );
        return result;
      } catch (err: unknown) {
        const e = err as { message?: string };
        message.error(e?.message || "Error al guardar notas de visita");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [patientId, appointmentId, message],
  );

  return {
    record,
    loading,
    saving,
    load,
    save,
    saveNotes,
  };
}
