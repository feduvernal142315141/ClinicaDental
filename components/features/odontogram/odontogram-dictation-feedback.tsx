"use client";

import { AlertTriangle, RotateCw, X } from "lucide-react";
import { OdontogramButton } from "@/components/features/odontogram/ui/OdontogramButton";
import { OdontogramTextArea } from "@/components/features/odontogram/ui/OdontogramInput";
import { OdontogramDictationInconsistencies } from "./odontogram-dictation-inconsistencies";
import { OdontogramDictationPreviewPanel } from "./odontogram-dictation-preview";
import type { OdontogramDictationSession } from "./odontogram-dictation-session";

interface OdontogramDictationFeedbackProps {
  session: OdontogramDictationSession;
  /**
   * Sufijo del `id` del bloque de fragmentos dudosos y de las casillas de la
   * previsualización. Las dos superficies del dictado (barra de pestañas y
   * modal del diente) nunca están montadas a la vez, pero el id se mantiene
   * distinto para que un solapamiento momentáneo no duplique un `id` en el
   * documento.
   */
  idPrefix: string;
  /**
   * Superficie con poco alto (el modal del diente): la previsualización acorta
   * su lista y recorta los fragmentos. Mismo contenido, menos sitio.
   */
  compact?: boolean;
}

/**
 * Lo que el dictado tiene que CONTAR después de grabar: la previsualización
 * obligatoria de los cambios (HU-DICT-032), la grabación retenida tras un fallo
 * transitorio (HU-DICT-013), la transcripción que exige revisión y las
 * aclaraciones pendientes.
 *
 * Vive en un componente propio porque acompaña al dictado esté donde esté el
 * botón: junto a las pestañas del odontograma o dentro del modal del diente.
 * El estado es el mismo (`OdontogramDictationSession`), así que nada se pierde
 * al abrir o cerrar la pieza en mitad de un reintento —ni en mitad de una
 * revisión: la previsualización sigue viva y con las mismas casillas marcadas.
 */
export function OdontogramDictationFeedback({
  session,
  idPrefix,
  compact = false,
}: OdontogramDictationFeedbackProps) {
  const {
    isRecording,
    isProcessing,
    isReinterpreting,
    readOnly,
    retainedAudio,
    retryRetainedAudio,
    discardRetainedAudio,
    transcriptionReview,
    updateTranscriptionReview,
    discardTranscriptionReview,
    reinterpret,
    preview,
    togglePreviewOperation,
    togglePreviewTooth,
    unselectBlockedPreviewOperations,
    applyPreview,
    discardPreview,
    pendingBatches,
    resolveBatch,
  } = session;

  const qualityId = `${idPrefix}-transcription-quality`;

  return (
    <>
      {/* Primero de todo: es lo único que espera una decisión para escribir en
          la historia clínica. */}
      {preview && (
        <OdontogramDictationPreviewPanel
          preview={preview}
          idPrefix={idPrefix}
          compact={compact}
          readOnly={readOnly}
          onToggleOperation={togglePreviewOperation}
          onToggleTooth={togglePreviewTooth}
          onUnselectBlocked={unselectBlockedPreviewOperations}
          onApply={applyPreview}
          onDiscard={discardPreview}
        />
      )}

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
            onClick={retryRetainedAudio}
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
              <h3 className="text-sm font-semibold">
                Revisión obligatoria del dictado
              </h3>
              <p className="mt-1 text-xs">
                Corrige piezas, superficies o valores ICDAS dudosos. El
                odontograma no cambiará hasta reinterpretar este texto.
              </p>
            </div>
            <OdontogramButton
              variant="ghost"
              size="sm"
              aria-label="Descartar transcripción"
              icon={<X aria-hidden className="h-4 w-4" />}
              onClick={discardTranscriptionReview}
            />
          </div>

          <OdontogramTextArea
            value={transcriptionReview.transcript}
            rows={3}
            className="mt-3 bg-surface text-ink"
            disabled={isReinterpreting}
            aria-describedby={qualityId}
            onChange={(event) => updateTranscriptionReview(event.target.value)}
          />

          <div id={qualityId} className="mt-2 space-y-1 text-xs">
            {transcriptionReview.patch.transcriptionQuality?.segments
              .filter((segment) => segment.needsReview)
              .map((segment, index) => (
                <p
                  key={`${segment.startSeconds ?? index}-${segment.endSeconds ?? index}`}
                >
                  Fragmento dudoso
                  {segment.startSeconds !== undefined
                    ? ` (${segment.startSeconds.toFixed(1)}–${
                        segment.endSeconds?.toFixed(1) ?? "?"
                      } s)`
                    : ""}
                  : “{segment.text.trim()}”
                </p>
              ))}
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <OdontogramButton
              variant="outline"
              size="sm"
              disabled={isReinterpreting}
              onClick={discardTranscriptionReview}
            >
              Descartar
            </OdontogramButton>
            <OdontogramButton
              variant="primary"
              size="sm"
              loading={isReinterpreting}
              disabled={!transcriptionReview.transcript.trim()}
              onClick={reinterpret}
            >
              Reinterpretar texto revisado
            </OdontogramButton>
          </div>
        </section>
      )}

      <OdontogramDictationInconsistencies
        batches={pendingBatches}
        readOnly={readOnly}
        onResolve={resolveBatch}
      />
    </>
  );
}
