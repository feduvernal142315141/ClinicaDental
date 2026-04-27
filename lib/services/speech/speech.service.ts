import { apiInstance } from "@/lib/services/apiConfig";

export interface TranscribeResponse {
  text: string;
}

export const speechService = {
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    // Groq/Whisper accepts webm, mp3, mp4, mpeg, mpga, m4a, wav
    formData.append("file", audioBlob, "recording.webm");

    const response = await apiInstance.post<TranscribeResponse>(
      "/speech/transcribe",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data.text;
  },
};
