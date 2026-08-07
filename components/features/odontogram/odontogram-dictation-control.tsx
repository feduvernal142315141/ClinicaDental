"use client";

import { useCallback, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { OdontogramButton } from "@/components/features/odontogram/ui/OdontogramButton";
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
  const learningInFlight = useRef(new Set<string>());

  const applyPatch = useCallback(
    (patch: Awaited<ReturnType<OdontogramDictationAdapter["transcribe"]>>) => {
      const result = applyOdontogramDictationPatch(storeApi, patch);

      if (result.appliedOperations > 0) {
        notify.success("Odontograma actualizado desde el dictado", {
          description: `${result.appliedOperations} cambio${
            result.appliedOperations === 1 ? "" : "s"
          } aplicado${result.appliedOperations === 1 ? "" : "s"} en las piezas ${
            result.affectedTeeth.join(", ")
          }.`,
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

  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      const context = createOdontogramDictationContext(
        storeApi.getState().getSnapshot(),
      );
      const patch = await adapter.transcribe(audioBlob, context);
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
              (operation) => operation.action === "REMOVE" || operation.action === "RESET",
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
    [adapter, applyPatch, confirm, rememberInconsistencies, storeApi],
  );

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
            ? interimText.trim() || "Escuchando el examen dental…"
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
          disabled={readOnly || isProcessing}
          aria-pressed={isRecording}
          onClick={handleToggle}
        >
          {isRecording ? "Terminar y aplicar" : "Dictar odontograma"}
        </OdontogramButton>
      </div>

      <OdontogramDictationInconsistencies
        batches={pendingBatches}
        readOnly={readOnly}
        onResolve={handleResolve}
        onDismiss={handleDismissInconsistency}
      />
    </div>
  );
}
