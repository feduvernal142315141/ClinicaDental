import apiInstance from "@/lib/services/apiConfig";
import type {
  OdontogramDictationAvailability,
  OdontogramDictationPatchResponse,
  ResolveOdontogramInconsistenciesRequest,
  ResolveOdontogramInconsistenciesResponse,
  TranscribeResponse,
} from "@/lib/entity/speech";

export type { TranscribeResponse } from "@/lib/entity/speech";

function audioFilename(blob: Blob, prefix: string): string {
  if (blob.type.includes("ogg")) return `${prefix}.ogg`;
  if (blob.type.includes("mp4")) return `${prefix}.m4a`;
  if (blob.type.includes("wav")) return `${prefix}.wav`;
  return `${prefix}.webm`;
}

export const speechService = {
  /**
   * Envía el blob de audio a `/speech/transcribe`.
   *
   * @param audioBlob   - Audio capturado por MediaRecorder (webm).
   * @param useSoapStructuring - Cuando `true` pide a la IA que estructure en SOAP.
   *                             Por defecto `false` → solo transcripción cruda.
   */
  async transcribeAudio(
    audioBlob: Blob,
    useSoapStructuring = false,
  ): Promise<TranscribeResponse> {
    const formData = new FormData();
    // Groq/Whisper acepta webm, mp3, mp4, mpeg, mpga, m4a, wav
    formData.append("file", audioBlob, audioFilename(audioBlob, "recording"));
    if (useSoapStructuring) {
      formData.append("useSoapStructuring", "true");
    }

    const response = await apiInstance.post<TranscribeResponse>(
      "/speech/transcribe",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },

  /**
   * Transcribe el examen dental y devuelve un parche validado. El endpoint no
   * persiste: el módulo decide cuándo aplicar las operaciones al store actual.
   */
  async transcribeOdontogram(
    audioBlob: Blob,
    currentOdontogramContext?: Record<string, unknown>,
  ): Promise<OdontogramDictationPatchResponse> {
    const formData = new FormData();
    formData.append(
      "file",
      audioBlob,
      audioFilename(audioBlob, "odontogram-dictation"),
    );

    if (currentOdontogramContext) {
      formData.append(
        "currentOdontogramContext",
        JSON.stringify(currentOdontogramContext),
      );
    }

    const response = await apiInstance.post<OdontogramDictationPatchResponse>(
      "/speech/transcribe/odontogram",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  },

  /** Reinterpreta texto revisado por el usuario sin volver a subir el audio. */
  async reinterpretOdontogram(
    correctedTranscript: string,
    currentOdontogramContext: Record<string, unknown>,
  ): Promise<OdontogramDictationPatchResponse> {
    const formData = new FormData();
    formData.append("correctedTranscript", correctedTranscript);
    formData.append(
      "currentOdontogramContext",
      JSON.stringify(currentOdontogramContext),
    );

    const response = await apiInstance.post<OdontogramDictationPatchResponse>(
      "/speech/transcribe/odontogram",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    return response.data;
  },

  /**
   * Interruptor por clínica del dictado del odontograma. Se consulta con la
   * misma autoridad que el dictado; si responde `false` el control no se monta.
   */
  async getOdontogramDictationAvailability(): Promise<OdontogramDictationAvailability> {
    const response = await apiInstance.get<OdontogramDictationAvailability>(
      "/speech/transcribe/odontogram/availability",
    );

    return response.data;
  },

  /**
   * Registra las decisiones del doctor sobre TODAS las aclaraciones pendientes
   * del dictado: la opción elegida, o `null` cuando la descarta. El backend
   * solo aprende de las elegidas y devuelve un acuse breve e idempotente.
   */
  async resolveOdontogramInconsistencies(
    dictationId: string,
    request: ResolveOdontogramInconsistenciesRequest,
  ): Promise<ResolveOdontogramInconsistenciesResponse> {
    const response = await apiInstance.post<ResolveOdontogramInconsistenciesResponse>(
      `/speech/odontogram-dictations/${dictationId}/resolve-inconsistencies`,
      request,
    );

    return response.data;
  },
};
