import apiInstance from "@/lib/services/apiConfig";
import type {
  OdontogramDictationPatchResponse,
  ResolveOdontogramInconsistenciesRequest,
  ResolveOdontogramInconsistenciesResponse,
  TranscribeResponse,
} from "@/lib/entity/speech";

export type { TranscribeResponse } from "@/lib/entity/speech";

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
    formData.append("file", audioBlob, "recording.webm");
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
    formData.append("file", audioBlob, "odontogram-dictation.webm");

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

  /**
   * Registra la selección ya aplicada localmente. El backend solo aprende la
   * coincidencia para la clínica y devuelve un acuse breve e idempotente.
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
