import type { OdontogramDictationAdapter } from "@/lib/odontogram/application/dictation";
import { speechService } from "@/lib/services/speech/speech.service";

/** Mantiene el acceso HTTP fuera de la UI y del núcleo del store. */
export function createApiOdontogramDictationAdapter(): OdontogramDictationAdapter {
  return {
    transcribe: (audioBlob, currentContext) =>
      speechService.transcribeOdontogram(audioBlob, currentContext),
    reinterpret: (correctedTranscript, currentContext) =>
      speechService.reinterpretOdontogram(correctedTranscript, currentContext),
    resolveInconsistencies: (dictationId, resolutions) =>
      speechService.resolveOdontogramInconsistencies(dictationId, {
        resolutions,
      }),
  };
}
