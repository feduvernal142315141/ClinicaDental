"use client";

import { useState, useCallback, useEffect } from "react";

import { clinicalHistoryService } from "@/lib/services/clinical-history";
import type {
  PatientVisitRecord,
  UpsertVisitRecordRequest,
  VisitDiagnosis,
  ExamFindings,
  ToothRef,
} from "@/lib/entity/clinical-history";
import { notify } from "@/lib/utils/notify";
import { useAutosaveStatus } from "@/lib/store/useAutosaveStatus";

function markHandled(err: unknown): void {
  if (err && typeof err === "object") {
    (err as { _interceptorHandled?: boolean })._interceptorHandled = true;
  }
}
export function useVisitRecord(patientId: string, appointmentId?: string) {
  const [record, setRecord] = useState<PatientVisitRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const load = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    try {
      const data = await clinicalHistoryService.getVisitRecord(
        patientId,
        appointmentId,
      );
      setRecord(data);
      setError(null);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 404) {
        setRecord(null);
        setError(null);
      } else {
        setError(err);
        notify.error(e?.message || "No se pudo cargar el registro de visita", {
          description:
            "No pudimos recuperar los datos de esta consulta. Revisa tu conexión y vuelve a intentarlo; si persiste, contacta a soporte.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [patientId, appointmentId]);
  useEffect(() => {
    if (appointmentId) {
      load();
    } else {
      setRecord(null);
      setError(null);
    }
  }, [appointmentId, load]);
  const save = useCallback(
    async (data: UpsertVisitRecordRequest, options?: { silent?: boolean }) => {
      if (!appointmentId) return;
      setSaving(true);
      useAutosaveStatus.getState().markSaving();
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
                toothRef: data.currentPain.toothRef ?? prev?.currentPain?.toothRef,
              }
            : undefined;
          if (prev) {
            return { ...prev, ...data, currentPain: cleanPain ?? prev.currentPain };
          }
          return { appointmentId: appointmentId!, patientId, ...data, currentPain: cleanPain };
        });
        useAutosaveStatus.getState().markSaved();
        if (!options?.silent) {
          notify.success("Registro de visita guardado", {
            description:
              "Los datos de esta consulta quedaron guardados en la historia clínica del paciente.",
          });
        }
      } catch (err: unknown) {
        const e = err as { message?: string };
        useAutosaveStatus.getState().markError();
        notify.error(e?.message || "No se pudo guardar el registro de visita", {
          description:
            "Los cambios de esta consulta no quedaron guardados. Revisa tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.",
        });
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [patientId, appointmentId],
  );
  const saveNotes = useCallback(
    async (html: string): Promise<{ updatedAt: string; updatedBy: string }> => {
      if (!appointmentId) throw new Error("No hay consulta activa");

      const isBlank = !html || html.replace(/<[^>]*>/g, "").trim() === "";
      const hadContent = !!record?.clinicalNotes?.replace(/<[^>]*>/g, "").trim();
      if (isBlank && hadContent) {
        useAutosaveStatus.getState().markError();
        notify.error("No se guardó: la nota quedaría vacía", {
          description:
            "El editor está vacío y esta consulta ya tiene evolución registrada: guardar así la borraría y no se podría recuperar. Lo ya guardado sigue intacto; vuelve a escribir la evolución antes de guardar.",
        });
        const rejection = new Error(
          "No se guardó: dejar la nota vacía borraría la evolución registrada y no se puede deshacer.",
        );
        markHandled(rejection);
        throw rejection;
      }
      if (isBlank && error) {
        useAutosaveStatus.getState().markError();
        notify.error("No se guardó: no se pudo leer la evolución de esta consulta", {
          description:
            "El editor está vacío y no pudimos comprobar si esta consulta ya tenía evolución registrada: guardarla así podría borrarla sin poder recuperarla. Vuelve a abrir la consulta cuando se restablezca la conexión y comprueba lo que hay guardado antes de escribir.",
        });
        const rejection = new Error(
          "No se guardó: no se pudo leer el registro de esta visita, así que no se escribe una nota vacía.",
        );
        markHandled(rejection);
        throw rejection;
      }
      setSaving(true);
      useAutosaveStatus.getState().markSaving();
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
        useAutosaveStatus.getState().markSaved();
        notify.success("Notas de visita guardadas", {
          description:
            "Las notas clínicas de esta consulta quedaron registradas en la historia del paciente.",
        });
        return result;
      } catch (err: unknown) {
        const e = err as { message?: string; status?: number };
        useAutosaveStatus.getState().markError();
        const description =
          e?.status === 404
            ? "Esta consulta no se ha iniciado, así que todavía no existe un registro de visita donde escribir. Inicia la consulta y vuelve a guardar; tu texto sigue aquí."
            : e?.status === 409
              ? "Esta consulta ya está cerrada y no admite más evolución. Tu texto sigue aquí: cópialo antes de salir."
              : "Las notas de esta consulta no quedaron guardadas. Revisa tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.";
        notify.error(e?.message || "No se pudieron guardar las notas clínicas", {
          description,
        });
        markHandled(err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [patientId, appointmentId, record?.clinicalNotes, error],
  );
  const saveDiagnoses = useCallback(
    async (diagnoses: VisitDiagnosis[]): Promise<void> => {
      await save({ diagnoses }, { silent: true });
    },
    [save],
  );

  const saveExamFindings = useCallback(
    async (findings: ExamFindings): Promise<void> => {
      await save({ examFindings: findings }, { silent: true });
    },
    [save],
  );
  const savePainAnatomy = useCallback(
    async (toothRef: ToothRef | null): Promise<void> => {
      await save(
        {
          currentPain: {
            location: record?.currentPain?.location,
            intensity: record?.currentPain?.intensity ?? null,
            type: record?.currentPain?.type,
            duration: record?.currentPain?.duration,
            toothRef: toothRef ?? undefined,
          },
        },
        { silent: true },
      );
    },
    [save, record?.currentPain],
  );
  const diagnoses: VisitDiagnosis[] = record?.diagnoses ?? [];
  const examFindings: ExamFindings | null = record?.examFindings ?? null;
  const painAnatomy: ToothRef | null = record?.currentPain?.toothRef ?? null;
  return {
    record,
    loading,
    saving,
    error,
    load,
    save,
    saveNotes,
    diagnoses,
    examFindings,
    painAnatomy,
    saveDiagnoses,
    saveExamFindings,
    savePainAnatomy,
  };
}
