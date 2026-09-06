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

/**
 * Marca un rechazo como YA notificado. `GlobalErrorListeners` sólo se calla si
 * la razón trae este flag; sin él, encima del toast con el motivo real aparece
 * "Error inesperado · Ocurrió un problema en segundo plano. Recarga la página",
 * que además de contradecir al bueno invita a recargar — y el texto sin guardar
 * vive sólo en memoria. Convención ya usada en `useAppointments`.
 */
function markHandled(err: unknown): void {
  if (err && typeof err === "object") {
    (err as { _interceptorHandled?: boolean })._interceptorHandled = true;
  }
}

export function useVisitRecord(patientId: string, appointmentId?: string) {
  const [record, setRecord] = useState<PatientVisitRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  /**
   * Fallo de LECTURA del registro, que NO es lo mismo que `record === null`:
   * un 404 afirma "esta visita no tiene registro" y es un dato; un 5xx o un
   * corte de red significa "no sabemos qué tiene" y es ausencia de dato.
   * Quien pinte el registro debe distinguirlos (ADR-61) y el guard destructivo
   * de `saveNotes` lo necesita para no dar por vacío lo que no ha podido leer.
   */
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
        // No visit record yet — graceful empty state
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

  // Auto-load when appointmentId is present
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
                // Preserve toothRef from the new data; if absent keep previous
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

      // GUARD DESTRUCTIVO. `PATCH .../visits/{id}/notes` SOBREESCRIBE, y el
      // handler del backend interpreta un valor vacío como borrado
      // (`record.setClinicalNotes(sanitized)` con `sanitized = null`). No existe
      // historial de versiones —ni Envers ni tabla de asientos—, así que una nota
      // pisada por un guardado en blanco es irrecuperable. Ninguna de las normas
      // de historia clínica revisadas admite borrar un asiento.
      //
      // El caso real no es alguien que quiera borrar: es un autoguardado que se
      // dispara con el editor todavía vacío mientras el registro ya cargado sí
      // tenía contenido.
      const isBlank = !html || html.replace(/<[^>]*>/g, "").trim() === "";
      const hadContent = !!record?.clinicalNotes?.replace(/<[^>]*>/g, "").trim();
      if (isBlank && hadContent) {
        // El rechazo se DECLARA aquí, no en el `catch` de más abajo: este `throw`
        // vive FUERA del `try`, así que no ejecutaba `markError()` ni ningún
        // aviso. La promesa subía sin capturar hasta `unhandledrejection` y el
        // usuario leía "Error inesperado · Ocurrió un problema en segundo plano"
        // en lugar del motivo real, mientras la cinta de autoguardado seguía
        // diciendo "Guardado".
        //
        // Y el guard NO se mete dentro del `try`: este `Error` no lleva `status`,
        // así que el ternario de mensajes caería en "Revisa tu conexión e
        // inténtalo de nuevo" — una instrucción falsa ante un rechazo
        // determinista, que fallaría igual en cada reintento.
        useAutosaveStatus.getState().markError();
        notify.error("No se guardó: la nota quedaría vacía", {
          description:
            "El editor está vacío y esta consulta ya tiene evolución registrada: guardar así la borraría y no se podría recuperar. Lo ya guardado sigue intacto; vuelve a escribir la evolución antes de guardar.",
        });
        // Se CONSERVA el `throw`: es lo que impide que el editor descarte el
        // borrador y que el feed dé por bueno un guardado que no ocurrió.
        const rejection = new Error(
          "No se guardó: dejar la nota vacía borraría la evolución registrada y no se puede deshacer.",
        );
        // Nadie captura esta promesa (el editor llama `onSave` desde un onClick),
        // así que sin la marca llega a `unhandledrejection` y el clínico ve DOS
        // toasts a la vez: el motivo real y "Error inesperado · … Recarga la
        // página", que es justo lo que no debe hacer.
        markHandled(rejection);
        throw rejection;
      }

      // El mismo borrado por la otra puerta: si la LECTURA del registro falló,
      // `record` es null sin que eso signifique "esta visita no tenía nota".
      // `hadContent` sale false y el guard de arriba dejaría pasar el PATCH en
      // blanco que sí borraría la evolución guardada en el servidor. Mientras no
      // se sepa qué hay, no se escribe vacío.
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
        // El backend tiene dos rechazos con causa CONOCIDA que no son de red:
        // 404 = la cita nunca se inició, así que no hay fila de visita donde
        // escribir; 409 = la cita ya está finalizada o cancelada. Decirle
        // "revisa tu conexión" a quien acaba de dictar 90 segundos es una
        // instrucción falsa que además le hace perder el texto reintentando.
        const description =
          e?.status === 404
            ? "Esta consulta no se ha iniciado, así que todavía no existe un registro de visita donde escribir. Inicia la consulta y vuelve a guardar; tu texto sigue aquí."
            : e?.status === 409
              ? "Esta consulta ya está cerrada y no admite más evolución. Tu texto sigue aquí: cópialo antes de salir."
              : "Las notas de esta consulta no quedaron guardadas. Revisa tu conexión e inténtalo de nuevo; si persiste, contacta a soporte.";
        notify.error(e?.message || "No se pudieron guardar las notas clínicas", {
          description,
        });
        // El motivo real ya está en pantalla. Sin la marca se le suma el genérico
        // "Recarga la página": en el 409 el usuario acaba de leer "cópialo antes
        // de salir" y recargar destruiría el borrador, que sólo vive en memoria.
        markHandled(err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    // `record.clinicalNotes` entra en las deps: sin él el guard destructivo
    // leería un closure obsoleto y dejaría pasar justo el borrado que evita.
    // `error` entra por lo mismo: es lo que distingue "no había nota" de "no se
    // pudo leer si la había".
    [patientId, appointmentId, record?.clinicalNotes, error],
  );

  // ---------------------------------------------------------------------------
  // Fase A — helpers para diagnósticos, hallazgos y dolor anatómico
  // ---------------------------------------------------------------------------

  /**
   * Guarda la lista completa de diagnósticos CIE-10 de la visita.
   * Usa autosave silencioso (sin toast) para integración con flujos de edición
   * en tiempo real desde el odontograma o el formulario de diagnóstico.
   */
  const saveDiagnoses = useCallback(
    async (diagnoses: VisitDiagnosis[]): Promise<void> => {
      await save({ diagnoses }, { silent: true });
    },
    [save],
  );

  /**
   * Guarda los hallazgos del examen clínico (extraoral e intraoral).
   * Usa autosave silencioso para integración con flujo de edición progresiva.
   */
  const saveExamFindings = useCallback(
    async (findings: ExamFindings): Promise<void> => {
      await save({ examFindings: findings }, { silent: true });
    },
    [save],
  );

  /**
   * Actualiza la referencia anatómica del dolor en el diente FDI.
   * Fusiona con los demás campos de currentPain para no sobrescribirlos.
   */
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
    // record.currentPain se incluye como dep para no crear stale closure al fusionar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [save, record?.currentPain],
  );

  // Getters derivados del record para comodidad del consumidor
  const diagnoses: VisitDiagnosis[] = record?.diagnoses ?? [];
  const examFindings: ExamFindings | null = record?.examFindings ?? null;
  const painAnatomy: ToothRef | null = record?.currentPain?.toothRef ?? null;

  return {
    record,
    loading,
    saving,
    // `error` no es "record vacío": ver el comentario del estado. Quien lo pinte
    // debe darle una rama propia distinta de "sin registro" (ADR-61).
    error,
    load,
    save,
    saveNotes,
    // Fase A — odontogram enrichment
    diagnoses,
    examFindings,
    painAnatomy,
    saveDiagnoses,
    saveExamFindings,
    savePainAnatomy,
  };
}
