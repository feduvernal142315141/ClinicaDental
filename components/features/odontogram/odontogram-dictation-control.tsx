"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle, Mic, Square, X } from "lucide-react";
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
} from "@/lib/odontogram/application/dictation";
import { useOdontogramStore, useOdontogramStoreApi } from "@/lib/odontogram/store";
import { notify } from "@/lib/utils/notify";
import type { OdontogramDictationPatchResponse } from "@/lib/entity/speech";
import {
  OdontogramDictationInconsistencies,
  type OdontogramDictationInconsistencyBatch,
} from "./odontogram-dictation-inconsistencies";

interface OdontogramDictationControlProps {
  adapter: OdontogramDictationAdapter;
}

export function OdontogramDictationControl({
  adapter,
}: OdontogramDictationControlProps) {
  const storeApi = useOdontogramStoreApi();
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
      );
      const patch = await adapter.reinterpret(
        transcriptionReview.transcript.trim(),
        context,
      );
      setTranscriptionReview(null);
      processPatch(patch);
    } catch {
      notify.error("No se pudo reinterpretar la transcripción", {
        description:
          "Conservamos el texto corregido. Revisa tu conexión y vuelve a intentarlo.",
      });
    } finally {
      setIsReinterpreting(false);
    }
  }, [adapter, processPatch, storeApi, transcriptionReview]);

  const handleResolve = useCallback(
    (
      batch: OdontogramDictationInconsistencyBatch,
      resolutions: Parameters<
        OdontogramDictationAdapter["resolveInconsistencies"]
      >[1],
    ) => {
      if (learningInFlight.current.has(batch.dictationId)) return;
      learningInFlight.current.add(batch.dictationId);

      try {
        if (!batch.appliedLocally) {
          applyPatch(
            createConfirmedOdontogramDictationPatch(
              batch.dictationId,
              batch.inconsistencies,
              resolutions,
            ),
          );
        }
        setPendingBatches((current) =>
          current.filter((item) => item.dictationId !== batch.dictationId),
        );

        void adapter
          .resolveInconsistencies(batch.dictationId, resolutions)
          .then(() => {
            learningInFlight.current.delete(batch.dictationId);
          })
          .catch(() => {
            learningInFlight.current.delete(batch.dictationId);
            setPendingBatches((current) => [
              ...current.filter(
                (item) => item.dictationId !== batch.dictationId,
              ),
              { ...batch, appliedLocally: true },
            ]);
            notify.warning("El odontograma se actualizó", {
              description:
                "No se pudo guardar el aprendizaje. Puedes reintentarlo sin volver a marcar la pieza.",
            });
          });
      } catch {
        learningInFlight.current.delete(batch.dictationId);
        notify.error("No se pudo aplicar la aclaración", {
          description:
            "La opción seleccionada no contiene un cambio válido para el odontograma.",
        });
      }
    },
    [adapter, applyPatch],
  );

  const handleDismissInconsistency = useCallback(
    (dictationId: string, inconsistencyId: string) => {
      setPendingBatches((current) =>
        current.flatMap((batch) => {
          if (batch.dictationId !== dictationId) return [batch];

          const inconsistencies = batch.inconsistencies.filter(
            (inconsistency) => inconsistency.id !== inconsistencyId,
          );

          return inconsistencies.length > 0
            ? [{ ...batch, inconsistencies }]
            : [];
        }),
      );
    },
    [],
  );

  const {
    isSupported,
    isRecording,
    isProcessing,
    interimText,
    recordingSeconds,
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
        onDismiss={handleDismissInconsistency}
      />
    </div>
  );
}
