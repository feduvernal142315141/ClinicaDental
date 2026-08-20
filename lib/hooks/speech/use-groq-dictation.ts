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
  /** Procesador alternativo para reutilizar la captura en otros flujos clínicos. */
  processAudio?: (audioBlob: Blob) => Promise<void>;
  processingErrorTitle?: string;
  processingErrorDescription?: string;
  /** Límite de seguridad de la grabación. Por defecto 90 segundos. */
  maxDurationSeconds?: number;
}

const RECORDER_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
] as const;

function preferredRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return RECORDER_MIME_TYPES.find((mimeType) =>
    MediaRecorder.isTypeSupported(mimeType),
  );
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
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  /**
   * Origen de la última transcripción completada con éxito.
   * `null` mientras no se haya realizado ningún dictado en esta sesión.
   */
  const [lastTranscriptSource, setLastTranscriptSource] =
    useState<TranscriptSource | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const maxDurationTimeoutRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
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
      if (maxDurationTimeoutRef.current !== null) {
        window.clearTimeout(maxDurationTimeoutRef.current);
      }
      if (durationIntervalRef.current !== null) {
        window.clearInterval(durationIntervalRef.current);
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.onstop = null;
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

  const clearRecordingTimers = useCallback(() => {
    if (maxDurationTimeoutRef.current !== null) {
      window.clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
    if (durationIntervalRef.current !== null) {
      window.clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const processRecordedAudio = useCallback(async (mimeType: string) => {
    clearRecordingTimers();
    setIsRecording(false);
    setIsProcessing(true);

    try {
      const audioBlob = new Blob(chunksRef.current, {
        type: mimeType || chunksRef.current[0]?.type || "audio/webm",
      });
      if (audioBlob.size <= 100) {
        notify.warning("No se detectó audio suficiente", {
          description: "Acércate al micrófono y vuelve a realizar el dictado.",
        });
        return;
      }

      if (optionsRef.current.processAudio) {
        await optionsRef.current.processAudio(audioBlob);
        return;
      }

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
    } catch (error) {
      console.error("[useGroqDictation] Groq transcription error:", error);
      notify.error(
        optionsRef.current.processingErrorTitle ??
          "No se pudo procesar el dictado por voz",
        {
          description:
            optionsRef.current.processingErrorDescription ??
            "Revisa tu conexión e inténtalo de nuevo; si el problema persiste, escribe la nota a mano.",
        },
      );
      if (optionsRef.current.onError && error instanceof Error) {
        optionsRef.current.onError(error);
      }
    } finally {
      setIsProcessing(false);
      setInterimText("");
      setRecordingSeconds(0);
      chunksRef.current = [];
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
    }
  }, [clearRecordingTimers]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      setInterimText("");
      setRecordingSeconds(0);

      // 1. Start MediaRecorder for Groq
      const mimeType = preferredRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        void processRecordedAudio(recorder.mimeType);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      // 2. Start SpeechRecognition for live preview
      startSpeechRecognition();

      setIsRecording(true);
      durationIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => current + 1);
      }, 1000);
      const maxDurationSeconds = Math.max(
        10,
        optionsRef.current.maxDurationSeconds ?? 90,
      );
      maxDurationTimeoutRef.current = window.setTimeout(() => {
        if (recorder.state !== "recording") return;
        notify.warning("Se alcanzó el límite del dictado", {
          description: `La grabación se detuvo automáticamente después de ${maxDurationSeconds} segundos.`,
        });
        recognitionRef.current?.abort();
        recognitionRef.current = null;
        recorder.stop();
      }, maxDurationSeconds * 1000);
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
  }, [options, processRecordedAudio, startSpeechRecognition]);

  const stopRecording = useCallback(() => {
    // Stop live preview
    recognitionRef.current?.abort();
    recognitionRef.current = null;

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      setIsRecording(false);
      return;
    }

    recorder.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    chunksRef.current = [];
    clearRecordingTimers();

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
    setRecordingSeconds(0);
  }, [clearRecordingTimers]);

  return {
    isSupported:
      typeof window !== "undefined" &&
      typeof window.MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia,
    isRecording,
    isProcessing,
    /** Texto provisional en vivo desde el SpeechRecognition del navegador (preview). */
    interimText,
    recordingSeconds,
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
