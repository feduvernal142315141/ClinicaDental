"use client";

import { Mic, Square } from "lucide-react";
import { OdontogramButton } from "@/components/features/odontogram/ui/OdontogramButton";
import { OdontogramDictationFeedback } from "./odontogram-dictation-feedback";
import {
  describeOdontogramDictationStatus,
  useOdontogramDictationSession,
} from "./odontogram-dictation-session";

interface OdontogramDictationControlProps {
  /**
   * La vista actual no es la del odontograma. Se oculta… salvo que haya algo
   * vivo (`isEngaged`): esconder una grabación en curso por cambiar de pestaña
   * dejaría al doctor grabando sin botón para terminar.
   */
  hidden?: boolean;
}

/**
 * Control de dictado del odontograma para la vista de piezas (junto a las
 * pestañas). Es una SUPERFICIE de `OdontogramDictationProvider`: no monta el
 * hook de grabación ni guarda estado propio, así que abrir el modal del diente
 * —donde vive el control compacto— no interrumpe nada.
 *
 * Quien lo renderiza debe ocultarlo mientras el modal del diente esté abierto
 * (ver `odontogram-module.tsx`): con la pieza abierta manda el control compacto,
 * y dos botones de dictar a la vez no tienen sentido para el doctor.
 */
export function OdontogramDictationControl({
  hidden = false,
}: OdontogramDictationControlProps) {
  const session = useOdontogramDictationSession();

  // Sin sesión el dictado no existe aquí: clínica sin la función, modo
  // histórico, sin permiso o navegador sin captura de audio.
  if (!session) return null;
  if (hidden && !session.isEngaged) return null;

  const { isRecording, isProcessing, isBusy, readOnly } = session;

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 shrink-0 items-center justify-end gap-3 rounded-lg border border-hairline bg-surface px-3 py-2">
        <p
          role="status"
          aria-live="polite"
          className="min-w-0 flex-1 truncate text-right text-xs text-subtle"
        >
          {describeOdontogramDictationStatus(
            session,
            "Describe piezas, caras, diagnósticos o correcciones",
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
          onClick={session.toggleRecording}
        >
          {isRecording ? "Terminar y aplicar" : "Dictar odontograma"}
        </OdontogramButton>
      </div>

      <OdontogramDictationFeedback session={session} idPrefix="odontogram" />
    </div>
  );
}
