import { useState, useRef, useCallback } from "react";
import { speechService } from "@/lib/services/speech/speech.service";
import { App } from "antd";

export interface UseGroqDictationOptions {
  onResult?: (text: string) => void;
  onError?: (error: Error) => void;
}

export function useGroqDictation(options: UseGroqDictationOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { message } = App.useApp();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          if (audioBlob.size > 0) {
            const text = await speechService.transcribeAudio(audioBlob);
            if (options.onResult && text.trim()) {
              options.onResult(text);
            }
          }
        } catch (error) {
          console.error("Transcription error:", error);
          message.error("No se pudo procesar el dictado por voz");
          if (options.onError && error instanceof Error) {
            options.onError(error);
          }
        } finally {
          setIsProcessing(false);
          audioChunksRef.current = [];
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access error:", error);
      message.error("No se pudo acceder al micrófono");
      if (options.onError && error instanceof Error) {
        options.onError(error);
      }
    }
  }, [options, message]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      // Clear chunks before stopping so it doesn't process
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
  }, []);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
