"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle, Mic, RotateCw, Square, X } from "lucide-react";
import { OdontogramButton } from "@/components/features/odontogram/ui/OdontogramButton";
import { OdontogramTextArea } from "@/components/features/odontogram/ui/OdontogramInput";
import { useOdontogramConfirm } from "@/components/features/odontogram/ui/OdontogramConfirm";
import { useGroqDictation } from "@/lib/hooks/speech/use-groq-dictation";
import {
  applyOdontogramDictationPatch,
  countOdontogramPatchOperations,
  createConfirmedOdontogramDictationPatch,
  createOdontogramDictationContext,
  odontogramPatchRequiresConfirmation,
  type OdontogramDictationAdapter,
  type OdontogramDictationSelection,
} from "@/lib/odontogram/application/dictation";
import { useOdontogramStore, useOdontogramStoreApi } from "@/lib/odontogram/store";
import { isRetryableError } from "@/lib/errors/normalize-error";
import { notify } from "@/lib/utils/notify";
import {
  extractApiErrorMessage,
  notifyApiError,
} from "@/lib/utils/notify-error";
import type {
  OdontogramDictationPatchResponse,
  ResolveOdontogramInconsistencyRequest,
} from "@/lib/entity/speech";
import {
  OdontogramDictationInconsistencies,
  type OdontogramDictationInconsistencyBatch,
} from "./odontogram-dictation-inconsistencies";

interface OdontogramDictationControlProps {
  adapter: OdontogramDictationAdapter;
  /**
   * Pieza/caras con foco en el modal del diente, publicada por el propio módulo
   * (HU-DICT-011). `null` cuando no hay modal abierto: sin foco NO se inventa
   * ninguno — el backend prefiere emitir `UNRESOLVED_PREVIOUS_SELECTION` antes
   * que adivinar una pieza en una historia clínica.
   */
  lastSelection?: OdontogramDictationSelection | null;
}

export function OdontogramDictationControl({
  adapter,
  lastSelection = null,
}: OdontogramDictationControlProps) {
  const storeApi = useOdontogramStoreApi();
  // El contexto se arma al SOLTAR el botón, no al montar: se lee por ref para
  // que `processAudio` no quede capturado con un foco viejo.
  const lastSelectionRef = useRef(lastSelection);
  lastSelectionRef.current = lastSelection;
  const readOnly = useOdontogramStore((state) => state.readOnly);
  const confirm = useOdontogramConfirm();
  const [pendingBatches, setPendingBatches] = useState<
    OdontogramDictationInconsistencyBatch[]
  >([]);
  const [transcriptionReview, setTranscriptionReview] = useState<{
    patch: OdontogramDictationPatchResponse;
    transcript: string;
  } | null>(null);
  const [isReinterpreting, setIsReinterpreting] = useState(false);
  const learningInFlight = useRef(new Set<string>());

  const applyPatch = useCallback(
    (patch: Awaited<ReturnType<OdontogramDictationAdapter["transcribe"]>>) => {
      const result = applyOdontogramDictationPatch(storeApi, patch);

      if (result.appliedOperations > 0) {
        const defaultedIcdasCount = patch.toothChanges.reduce(
          (total, change) =>
            total +
            change.operations.filter(
              (operation) =>
                operation.diagnosis?.icdasSource === "dictation-default",
            ).length,
          0,
        );
        notify.success("Odontograma actualizado desde el dictado", {
          description: `${result.appliedOperations} cambio${
            result.appliedOperations === 1 ? "" : "s"
          } aplicado${result.appliedOperations === 1 ? "" : "s"} en las piezas ${
            result.affectedTeeth.join(", ")
          }.${
            defaultedIcdasCount > 0
              ? ` Se asignó ICDAS 1 automáticamente a ${defaultedIcdasCount} caries sin valor dictado.`
              : ""
          }`,
        });
      }

      if (result.warnings.length > 0) {
        notify.warning("Hay indicaciones que requieren revisión", {
          description: result.warnings[0],
        });
      }

      return result;
    },
    [storeApi],
  );

  const rememberInconsistencies = useCallback(
    (patch: Awaited<ReturnType<OdontogramDictationAdapter["transcribe"]>>) => {
      const inconsistencies = patch.inconsistencies ?? [];
      if (!patch.dictationId || inconsistencies.length === 0) return;

      setPendingBatches((current) => [
        ...current.filter((batch) => batch.dictationId !== patch.dictationId),
        {
          dictationId: patch.dictationId!,
          inconsistencies,
        },
      ]);
    },
    [],
  );

  const processPatch = useCallback(
    (patch: OdontogramDictationPatchResponse) => {
      const operationCount = countOdontogramPatchOperations(patch);
      rememberInconsistencies(patch);

      if (operationCount === 0) {
        const inconsistencyCount = patch.inconsistencies?.length ?? 0;
        notify.warning("El dictado no produjo cambios seguros", {
          description:
            inconsistencyCount > 0
              ? "Hay aclaraciones pendientes debajo del control de dictado."
              : "No se identificaron piezas ni afectaciones aplicables.",
        });
        return;
      }

      if (odontogramPatchRequiresConfirmation(patch)) {
        const destructiveCount = patch.toothChanges.reduce(
          (total, change) =>
            total +
            change.operations.filter(
              (operation) =>
                operation.action === "REMOVE" || operation.action === "RESET",
            ).length,
          0,
        );

        confirm({
          title: "Confirmar cambios del dictado",
          description: `La IA identificó ${operationCount} cambio${
            operationCount === 1 ? "" : "s"
          } en ${patch.toothChanges.length} pieza${
            patch.toothChanges.length === 1 ? "" : "s"
          }${
            destructiveCount > 0
              ? `, incluyendo ${destructiveCount} corrección${
                  destructiveCount === 1 ? "" : "es"
                } que desmarcará datos actuales`
              : ""
          }.`,
          okText: "Aplicar cambios",
          cancelText: "Descartar",
          danger: destructiveCount > 0,
          onOk: () => applyPatch(patch),
        });
        return;
      }

      applyPatch(patch);
    },
    [applyPatch, confirm, rememberInconsistencies],
  );

  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      const context = createOdontogramDictationContext(
        storeApi.getState().getSnapshot(),
        { lastSelection: lastSelectionRef.current },
      );
      const patch = await adapter.transcribe(audioBlob, context);
      if (patch.transcriptionQuality?.needsReview) {
        setTranscriptionReview({ patch, transcript: patch.rawTranscript });
        notify.warning("Revisa la transcripción antes de aplicar", {
          description:
            patch.transcriptionQuality.warnings[0]?.message ??
            "El audio contiene un fragmento de baja confianza.",
        });
        return;
      }

      processPatch(patch);
    },
    [adapter, processPatch, storeApi],
  );

  const handleReinterpret = useCallback(async () => {
    if (!transcriptionReview?.transcript.trim()) return;
    setIsReinterpreting(true);
    try {
      const context = createOdontogramDictationContext(
        storeApi.getState().getSnapshot(),
        { lastSelection: lastSelectionRef.current },
      );
      const patch = await adapter.reinterpret(
        transcriptionReview.transcript.trim(),
        context,
      );
      setTranscriptionReview(null);
      processPatch(patch);
    } catch (error) {
      // Mismo endpoint que el dictado: puede responder 429 (cupo) o 503
      // (apagado). Ese motivo debe llegar al doctor, no un genérico de conexión.
      notifyApiError(
        "No se pudo reinterpretar la transcripción",
        error,
        "Conservamos el texto corregido. Revisa tu conexión y vuelve a intentarlo.",
      );
    } finally {
      setIsReinterpreting(false);
    }
  }, [adapter, processPatch, storeApi, transcriptionReview]);

  const handleResolve = useCallback(
    (
      batch: OdontogramDictationInconsistencyBatch,
      resolutions: ResolveOdontogramInconsistencyRequest[],
    ) => {
      if (learningInFlight.current.has(batch.dictationId)) return;

      const dismissedCount = resolutions.filter(
        (resolution) => resolution.candidateId === null,
      ).length;
      const allDismissed =
        resolutions.length > 0 && dismissedCount === resolutions.length;
      // El cambio clínico se aplica UNA sola vez. En un reintento el lote ya
      // trae las decisiones enviadas y lo que se aplicó, así que solo falta
      // repetir el POST del aprendizaje.
      let appliedOperations = batch.pendingLearning?.appliedOperations ?? 0;

      if (!batch.pendingLearning) {
        if (allDismissed) {
          notify.info(
            dismissedCount === 1
              ? "Aclaración descartada"
              : `${dismissedCount} aclaraciones descartadas`,
            {
              description:
                "No cambian el odontograma y no se aprenderá de ellas.",
            },
          );
        } else {
          try {
            appliedOperations = applyPatch(
              createConfirmedOdontogramDictationPatch(
                batch.dictationId,
                batch.inconsistencies,
                resolutions,
              ),
            ).appliedOperations;
          } catch {
            notify.error("No se pudo aplicar la aclaración", {
              description:
                "La opción seleccionada no contiene un cambio válido para el odontograma.",
            });
            return;
          }
        }
      }

      learningInFlight.current.add(batch.dictationId);
      setPendingBatches((current) =>
        current.filter((item) => item.dictationId !== batch.dictationId),
      );

      void adapter
        .resolveInconsistencies(batch.dictationId, resolutions)
        .then(() => {
          learningInFlight.current.delete(batch.dictationId);
        })
        .catch((error: unknown) => {
          learningInFlight.current.delete(batch.dictationId);

          // Un rechazo PERMANENTE (4xx de contrato: el lote ya se cerró, la
          // aclaración no admite descarte…) no se arregla repitiendo la misma
          // petición. Devolver el lote dejaría un botón "Reintentar
          // aprendizaje" que no podría funcionar NUNCA: se informa con el
          // motivo real del backend y el lote se retira.
          if (!isRetryableError(error)) {
            notifyApiError(
              "No se pudo guardar el aprendizaje del dictado",
              error,
              "El servidor rechazó estas aclaraciones y no volverá a aceptarlas; no hace falta reintentar.",
            );
            return;
          }

          // Fallo TRANSITORIO (red, timeout, 429, 5xx): el lote vuelve CON las
          // decisiones tomadas, así el reintento manda el mismo conjunto
          // completo que el backend exige, sin volver a marcar la pieza ni
          // pedirle al doctor que decida otra vez.
          setPendingBatches((current) => [
            ...current.filter((item) => item.dictationId !== batch.dictationId),
            {
              ...batch,
              pendingLearning: { resolutions, appliedOperations },
            },
          ]);
          notify.warning(
            appliedOperations > 0
              ? "El odontograma se actualizó"
              : "Las aclaraciones quedaron decididas",
            {
              description: `${
                extractApiErrorMessage(error) ??
                "No se pudo guardar el aprendizaje."
              } Puedes reintentarlo sin volver a marcar la pieza.`,
            },
          );
        });
    },
    [adapter, applyPatch],
  );

  const {
    isSupported,
    isRecording,
    isProcessing,
    interimText,
    recordingSeconds,
    retainedAudio,
    retryRetainedAudio,
    discardRetainedAudio,
    startRecording,
    stopRecording,
  } = useGroqDictation({
    processAudio,
    processingErrorTitle: "No se pudo interpretar el odontograma",
    processingErrorDescription:
      "El audio no pudo convertirse en cambios clínicos. Revisa tu conexión y vuelve a intentarlo.",
  });

  const handleToggle = () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    void startRecording();
  };

  if (!isSupported) return null;

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 shrink-0 items-center justify-end gap-3 rounded-lg border border-hairline bg-surface px-3 py-2">
        <p
          role="status"
          aria-live="polite"
          className="min-w-0 flex-1 truncate text-right text-xs text-subtle"
        >
          {isRecording
            ? `${interimText.trim() || "Escuchando el examen dental…"} · ${recordingSeconds}s`
            : isProcessing
              ? "Transcribiendo y preparando los cambios…"
              : "Describe piezas, caras, diagnósticos o correcciones"}
        </p>
        <OdontogramButton
          size="sm"
          variant={isRecording ? "destructive" : "primary"}
          icon={
            isRecording ? (
              <Square aria-hidden className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Mic aria-hidden className="h-4 w-4" />
            )
          }
          loading={isProcessing}
          disabled={readOnly || isProcessing || isReinterpreting}
          aria-pressed={isRecording}
          onClick={handleToggle}
        >
          {isRecording ? "Terminar y aplicar" : "Dictar odontograma"}
        </OdontogramButton>
      </div>

      {retainedAudio && !isRecording && (
        <section
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50/70 px-3 py-2 text-amber-950 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-100"
        >
          <p className="min-w-0 flex-1 text-xs">
            Guardamos tu grabación de {retainedAudio.seconds} s. Puedes
            reintentar el envío sin volver a dictar; se descartará al aplicar
            los cambios o al salir de la pantalla.
          </p>
          <OdontogramButton
            size="sm"
            variant="outline"
            icon={<RotateCw aria-hidden className="h-3.5 w-3.5" />}
            loading={isProcessing}
            disabled={readOnly || isProcessing || isReinterpreting}
            onClick={() => void retryRetainedAudio()}
          >
            Reintentar envío
          </OdontogramButton>
          <OdontogramButton
            size="sm"
            variant="ghost"
            aria-label="Descartar la grabación guardada"
            icon={<X aria-hidden className="h-4 w-4" />}
            disabled={isProcessing}
            onClick={discardRetainedAudio}
          />
        </section>
      )}

      {transcriptionReview && (
        <section className="rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="flex items-start gap-2">
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">Revisión obligatoria del dictado</h3>
              <p className="mt-1 text-xs">
                Corrige piezas, superficies o valores ICDAS dudosos. El odontograma
                no cambiará hasta reinterpretar este texto.
              </p>
            </div>
            <OdontogramButton
              variant="ghost"
              size="sm"
              aria-label="Descartar transcripción"
              icon={<X aria-hidden className="h-4 w-4" />}
              onClick={() => setTranscriptionReview(null)}
            />
          </div>

          <OdontogramTextArea
            value={transcriptionReview.transcript}
            rows={3}
            className="mt-3 bg-surface text-ink"
            disabled={isReinterpreting}
            aria-describedby="odontogram-transcription-quality"
            onChange={(event) =>
              setTranscriptionReview((current) =>
                current ? { ...current, transcript: event.target.value } : current,
              )
            }
          />

          <div id="odontogram-transcription-quality" className="mt-2 space-y-1 text-xs">
            {transcriptionReview.patch.transcriptionQuality?.segments
              .filter((segment) => segment.needsReview)
              .map((segment, index) => (
                <p key={`${segment.startSeconds ?? index}-${segment.endSeconds ?? index}`}>
                  Fragmento dudoso{segment.startSeconds !== undefined
                    ? ` (${segment.startSeconds.toFixed(1)}–${segment.endSeconds?.toFixed(1) ?? "?"} s)`
                    : ""}: “{segment.text.trim()}”
                </p>
              ))}
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <OdontogramButton
              variant="outline"
              size="sm"
              disabled={isReinterpreting}
              onClick={() => setTranscriptionReview(null)}
            >
              Descartar
            </OdontogramButton>
            <OdontogramButton
              variant="primary"
              size="sm"
              loading={isReinterpreting}
              disabled={!transcriptionReview.transcript.trim()}
              onClick={() => void handleReinterpret()}
            >
              Reinterpretar texto revisado
            </OdontogramButton>
          </div>
        </section>
      )}

      <OdontogramDictationInconsistencies
        batches={pendingBatches}
        readOnly={readOnly}
        onResolve={handleResolve}
      />
    </div>
  );
}
