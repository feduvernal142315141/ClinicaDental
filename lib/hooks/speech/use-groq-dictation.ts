import { useState, useRef, useCallback, useEffect } from "react";
import { speechService } from "@/lib/services/speech/speech.service";
import { notify } from "@/lib/utils/notify";

/** Origen de la última transcripción insertada. */
export type TranscriptSource = "raw" | "ai";

export interface UseGroqDictationOptions {
  /** Llamado con el texto final a insertar (crudo o formateado por IA). */
  onResult?: (text: string) => void;
  onError?: (error: Error) => void;
  /**
   * Cuando `true`, pide al backend que estructure la transcripción en formato
   * SOAP usando IA. Por defecto `false` — solo transcripción cruda (rawTranscript).
   * Si la IA falla, el fallback es siempre la transcripción cruda.
   */
  useSoapStructuring?: boolean;
}

/**
 * Hybrid dictation hook — streaming preview + accurate final transcription.
 *
 * While recording:
 * - `MediaRecorder` captures audio for Groq Whisper (the source of truth).
 * - Browser `SpeechRecognition` provides live interim text for UX streaming feel.
 *
 * When the user stops:
 * - Full audio is sent to Groq → accurate text with dental vocabulary.
 * - `onResult` fires with the Groq text (the interim preview is discarded).
 */
export function useGroqDictation(options: UseGroqDictationOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimText, setInterimText] = useState("");
  /**
   * Origen de la última transcripción completada con éxito.
   * `null` mientras no se haya realizado ningún dictado en esta sesión.
   */
  const [lastTranscriptSource, setLastTranscriptSource] =
    useState<TranscriptSource | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<InstanceType<typeof window.SpeechRecognition> | null>(null);

  // Stable ref to avoid re-creating recorder on every render
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Check if SpeechRecognition is available in this browser
  const SpeechRecognitionAPI =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startSpeechRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalAccumulated = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalAccumulated += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      setInterimText(finalAccumulated + interim);
    };

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" are expected — ignore silently
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("[SpeechRecognition] error:", event.error);
      }
    };

    // Auto-restart if the browser stops listening (silence timeout)
    recognition.onend = () => {
      // Only restart if we're still recording
      if (mediaRecorderRef.current?.state === "recording") {
        try {
          recognition.start();
        } catch {
          // Already started or aborted — ignore
        }
      }
    };

    try {
      recognition.start();
    } catch {
      // Browser doesn't support it — that's OK, we still have Groq
    }

    recognitionRef.current = recognition;
  }, [SpeechRecognitionAPI]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      setInterimText("");

      // 1. Start MediaRecorder for Groq
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      // 2. Start SpeechRecognition for live preview
      startSpeechRecognition();

      setIsRecording(true);
    } catch (error) {
      console.error("[useGroqDictation] mic access error:", error);
      notify.error("No se pudo acceder al micrófono", {
        description:
          "Permite el uso del micrófono en tu navegador y vuelve a intentar el dictado.",
      });
      if (options.onError && error instanceof Error) {
        options.onError(error);
      }
    }
  }, [options, startSpeechRecognition]);

  const stopRecording = useCallback(() => {
    // Stop live preview
    recognitionRef.current?.abort();
    recognitionRef.current = null;

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      setIsRecording(false);
      return;
    }

    recorder.onstop = async () => {
      setIsRecording(false);
      setIsProcessing(true);

      try {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (audioBlob.size > 100) {
          const soapMode = optionsRef.current.useSoapStructuring ?? false;
          const result = await speechService.transcribeAudio(audioBlob, soapMode);

          let textToInsert: string;
          let source: TranscriptSource;

          if (soapMode && result.formattedTranscript) {
            textToInsert = result.formattedTranscript;
            source = "ai";
          } else {
            textToInsert = result.rawTranscript;
            source = "raw";
            // Si se pidió IA pero Gemini falló, el backend retorna null en
            // formattedTranscript. Avisamos sin bloquear el guardado.
            if (soapMode && !result.formattedTranscript) {
              notify.warning("Formateo IA no disponible", {
                description:
                  "Se insertó la transcripción cruda. El servicio de IA no respondió; puedes intentarlo de nuevo o estructurarlo manualmente.",
              });
            }
          }

          setLastTranscriptSource(source);
          if (textToInsert.trim() && optionsRef.current.onResult) {
            optionsRef.current.onResult(textToInsert);
          }
        }
      } catch (error) {
        console.error("[useGroqDictation] Groq transcription error:", error);
        notify.error("No se pudo procesar el dictado por voz", {
          description:
            "Revisa tu conexión e inténtalo de nuevo; si el problema persiste, escribe la nota a mano.",
        });
        if (optionsRef.current.onError && error instanceof Error) {
          optionsRef.current.onError(error);
        }
      } finally {
        setIsProcessing(false);
        setInterimText("");
        chunksRef.current = [];
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    recorder.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    chunksRef.current = [];

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.onstop = () => {
        /* discard */
      };
      recorder.stop();
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsRecording(false);
    setIsProcessing(false);
    setInterimText("");
  }, []);

  return {
    isRecording,
    isProcessing,
    /** Texto provisional en vivo desde el SpeechRecognition del navegador (preview). */
    interimText,
    /**
     * Origen de la última transcripción insertada con éxito.
     * - `"raw"` — transcripción literal (Groq Whisper).
     * - `"ai"`  — estructurada en SOAP por IA.
     * - `null`  — todavía no se ha realizado ningún dictado.
     */
    lastTranscriptSource,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
