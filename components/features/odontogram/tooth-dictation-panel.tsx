"use client";

import { useEffect, useMemo, useRef } from "react";
import { Mic, Square } from "lucide-react";
import { OdontogramButton } from "@/components/features/odontogram/ui/OdontogramButton";
import { ToothTypeService } from "@/lib/odontogram/domain/odontogram/services";
import type { ToothSurface } from "@/lib/odontogram/domain/odontogram/types";
import { OdontogramDictationFeedback } from "./odontogram-dictation-feedback";
import {
  describeOdontogramDictationStatus,
  useOdontogramDictationSession,
} from "./odontogram-dictation-session";

interface ToothDictationPanelProps {
  toothNumber: number;
  /** Caras seleccionadas en el modal: son las que resuelven "esa misma"/"ahí". */
  surfaces: ToothSurface[];
  /**
   * Un dictado acaba de cambiar ESTA pieza. El modal tiene que recargar lo que
   * enseña: dictar con la pieza abierta y quedarse mirando los datos de antes
   * es peor que no poder dictar.
   */
  onApplied?: (teeth: number[]) => void;
}

/** Cuántas abreviaturas de cara caben en la barra sin volverla ilegible. */
const MAX_SURFACE_LABELS = 4;

/**
 * Control de dictado COMPACTO dentro del modal del diente (HU-DICT-029).
 *
 * Con guantes y las manos en la boca del paciente, cerrar la pieza para poder
 * dictar es justo la fricción que hace que nadie use la función. Es una
 * SUPERFICIE más de `OdontogramDictationProvider`: comparte micrófono, audio
 * retenido, revisión de transcripción y aclaraciones con el control de la vista
 * de piezas, así que abrir o cerrar el diente no interrumpe ni duplica nada.
 */
export function ToothDictationPanel({
  toothNumber,
  surfaces,
  onApplied,
}: ToothDictationPanelProps) {
  const session = useOdontogramDictationSession();

  const surfaceLabels = useMemo(() => {
    if (surfaces.length === 0) return "";
    const shown = surfaces
      .slice(0, MAX_SURFACE_LABELS)
      .map(
        (surface) => ToothTypeService.getSurfaceLabel(toothNumber, surface).short,
      )
      .join(", ");
    return surfaces.length > MAX_SURFACE_LABELS ? `${shown}…` : shown;
  }, [surfaces, toothNumber]);

  const onAppliedRef = useRef(onApplied);
  onAppliedRef.current = onApplied;
  const lastApplied = session?.lastApplied ?? null;
  // El token de la aplicación anterior al montaje NO se reprocesa: al abrirse,
  // el modal ya se inicializa con lo que hay en el store.
  const seenTokenRef = useRef(lastApplied?.token ?? 0);

  useEffect(() => {
    if (!lastApplied || lastApplied.token === seenTokenRef.current) return;
    seenTokenRef.current = lastApplied.token;
    if (!lastApplied.teeth.includes(toothNumber)) return;
    onAppliedRef.current?.(lastApplied.teeth);
  }, [lastApplied, toothNumber]);

  if (!session) return null;

  const { isRecording, isProcessing, isBusy, readOnly } = session;

  return (
    <div className="space-y-2">
      <section className="flex min-h-10 items-center gap-3 rounded-lg border border-hairline bg-surface px-3 py-1.5">
        <p
          role="status"
          aria-live="polite"
          className="min-w-0 flex-1 truncate text-xs text-subtle"
        >
          {describeOdontogramDictationStatus(
            session,
            surfaceLabels
              ? `Dicta sobre la pieza ${toothNumber} · caras ${surfaceLabels}`
              : `Dicta sobre la pieza ${toothNumber}`,
          )}
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
          disabled={readOnly || isBusy}
          aria-pressed={isRecording}
          aria-label={
            isRecording
              ? "Terminar el dictado y aplicar los cambios"
              : `Dictar sobre la pieza ${toothNumber}`
          }
          onClick={session.toggleRecording}
        >
          {isRecording ? "Terminar y aplicar" : "Dictar"}
        </OdontogramButton>
      </section>

      {/* `compact`: dentro del diálogo del diente esto vive en una cabecera
          pegajosa sobre un cuerpo con scroll. Una lista sin tope se comería la
          pantalla y taparía justo lo que el doctor está mirando. */}
      <OdontogramDictationFeedback
        session={session}
        idPrefix="tooth-modal"
        compact
      />
    </div>
  );
}
