import apiInstance from "@/lib/services/apiConfig";

export interface TranscribeResponse {
  /** Transcripción literal del audio (Groq Whisper). Siempre presente. */
  rawTranscript: string;
  /**
   * Transcripción estructurada en SOAP por IA (Gemini).
   * Solo se popula cuando el cliente envió `useSoapStructuring=true`.
   * Puede ser `null` si Gemini falló — nunca bloquea el guardado.
   */
  formattedTranscript: string | null;
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
};
