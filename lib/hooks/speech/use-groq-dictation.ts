import { useState, useRef, useCallback, useEffect } from "react";
import { speechService } from "@/lib/services/speech/speech.service";
import { isRetryableError } from "@/lib/errors/normalize-error";
import { notify } from "@/lib/utils/notify";
import { notifyApiError } from "@/lib/utils/notify-error";

/** Origen de la última transcripción insertada. */
export type TranscriptSource = "raw" | "ai";

/**
 * Metadatos de la grabación retenida tras un fallo TRANSITORIO (HU-DICT-013).
 *
 * Es a propósito lo único que sale del hook: el `Blob` con la voz del paciente
 * se queda dentro, en una ref. No se persiste en disco ni en `localStorage`, no
 * viaja a ningún destino nuevo y se libera al reintentar con éxito, al
 * descartar, al empezar otra grabación o al desmontar la pantalla.
 */
export interface RetainedDictationAudio {
  /** Duración de la grabación en segundos, para poder decirle al doctor qué se guardó. */
  seconds: number;
  sizeBytes: number;
}

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
  /** Título del toast cuando falla el procesado ("qué acción falló"). */
  processingErrorTitle?: string;
  /**
   * Descripción de RESPALDO del toast de fallo. Si el backend envió un mensaje
   * seguro (cupo agotado, dictado apagado…) se muestra ESE, no este texto.
   */
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
  /**
   * Se calcula TRAS el montaje: leer `window`/`navigator` durante el render
   * hace que el servidor y el cliente pinten cosas distintas (hidratación).
   */
  const [isSupported, setIsSupported] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const maxDurationTimeoutRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  /** Segundos grabados, en ref: al procesar ya se ha reseteado el estado visible. */
  const recordingSecondsRef = useRef(0);
  /** El audio retenido NUNCA sale del hook (ver `RetainedDictationAudio`). */
  const retainedAudioRef = useRef<Blob | null>(null);
  const [retainedAudio, setRetainedAudio] =
    useState<RetainedDictationAudio | null>(null);
  const recognitionRef = useRef<InstanceType<typeof window.SpeechRecognition> | null>(null);

  // Stable ref to avoid re-creating recorder on every render
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Check if SpeechRecognition is available in this browser
  const SpeechRecognitionAPI =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  useEffect(() => {
    setIsSupported(
      typeof window.MediaRecorder !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia,
    );
  }, []);

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
      // Salir de la pantalla descarta la voz retenida: vive en memoria y solo
      // mientras la pantalla siga abierta (HU-DICT-013).
      retainedAudioRef.current = null;
      chunksRef.current = [];
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

  const discardRetainedAudio = useCallback(() => {
    retainedAudioRef.current = null;
    setRetainedAudio(null);
  }, []);

  /** Envía el audio y deja que el error suba: quien llama decide si se retiene. */
  const sendAudioForProcessing = useCallback(async (audioBlob: Blob) => {
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
  }, []);

  /**
   * Procesa un audio (recién grabado o retenido) y decide qué pasa con él.
   *
   * Un fallo TRANSITORIO (red caída, timeout, 429, 5xx — `isRetryableError`)
   * conserva la grabación en memoria para que el doctor reintente sin repetir
   * 90 segundos de dictado. Un fallo PERMANENTE (contrato inválido, sin
   * permiso, función apagada) la descarta: repetir la misma petición volvería a
   * fallar y guardar voz de la consulta sin utilidad no es aceptable.
   */
  const runProcessing = useCallback(
    async (audioBlob: Blob, seconds: number) => {
      setIsProcessing(true);
      try {
        await sendAudioForProcessing(audioBlob);
        retainedAudioRef.current = null;
        setRetainedAudio(null);
      } catch (error) {
        console.error("[useGroqDictation] Groq transcription error:", error);

        const retryable = isRetryableError(error);
        if (retryable) {
          retainedAudioRef.current = audioBlob;
          setRetainedAudio({ seconds, sizeBytes: audioBlob.size });
        } else {
          retainedAudioRef.current = null;
          setRetainedAudio(null);
        }

        // El backend explica POR QUÉ falló en español (cupo agotado con los
        // segundos que faltan, dictado apagado para la clínica…). `notifyApiError`
        // lo pone como descripción; el texto propio del flujo queda SOLO como
        // respaldo para cuando no hay mensaje del servidor (red caída, timeout).
        notifyApiError(
          optionsRef.current.processingErrorTitle ??
            "No se pudo procesar el dictado por voz",
          error,
          optionsRef.current.processingErrorDescription ??
            (retryable
              ? "Guardamos la grabación: revisa tu conexión y reintenta el envío sin volver a dictar."
              : "Revisa tu conexión e inténtalo de nuevo; si el problema persiste, escribe la nota a mano."),
        );
        if (optionsRef.current.onError && error instanceof Error) {
          optionsRef.current.onError(error);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [sendAudioForProcessing],
  );

  const processRecordedAudio = useCallback(
    async (mimeType: string) => {
      clearRecordingTimers();
      setIsRecording(false);

      // El cierre de la captura se hace ANTES de la llamada de red: si se
      // dejara en un `finally`, un reintento posterior volvería a apagar un
      // micrófono ya apagado y, sobre todo, el audio se perdería aquí.
      const chunks = chunksRef.current;
      chunksRef.current = [];
      const seconds = recordingSecondsRef.current;
      recordingSecondsRef.current = 0;
      setInterimText("");
      setRecordingSeconds(0);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;

      const audioBlob = new Blob(chunks, {
        type: mimeType || chunks[0]?.type || "audio/webm",
      });
      if (audioBlob.size <= 100) {
        notify.warning("No se detectó audio suficiente", {
          description: "Acércate al micrófono y vuelve a realizar el dictado.",
        });
        return;
      }

      await runProcessing(audioBlob, seconds);
    },
    [clearRecordingTimers, runProcessing],
  );

  /** Reenvía la MISMA grabación retenida. No vuelve a pedir el micrófono. */
  const retryRetainedAudio = useCallback(async () => {
    const audioBlob = retainedAudioRef.current;
    if (!audioBlob) return;
    if (mediaRecorderRef.current?.state === "recording") return;
    await runProcessing(audioBlob, retainedAudio?.seconds ?? 0);
  }, [retainedAudio, runProcessing]);

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
      recordingSecondsRef.current = 0;
      // Una grabación nueva invalida la anterior: dejar un "reintentar" colgado
      // apuntando a un audio viejo llevaría a aplicar el dictado equivocado.
      discardRetainedAudio();

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
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
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
  }, [
    discardRetainedAudio,
    options,
    processRecordedAudio,
    startSpeechRecognition,
  ]);

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
    recordingSecondsRef.current = 0;
    // Cancelar es descartar: también se suelta el audio retenido de un intento
    // anterior, para no dejar un reintento vivo tras un gesto de abandono.
    discardRetainedAudio();
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
  }, [clearRecordingTimers, discardRetainedAudio]);

  return {
    isSupported,
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
    /**
     * Grabación conservada en memoria tras un fallo TRANSITORIO, lista para
     * reenviarse. `null` cuando no hay nada que reintentar. Solo metadatos: el
     * audio no sale del hook.
     */
    retainedAudio,
    /** Reenvía la misma grabación sin volver a dictar. */
    retryRetainedAudio,
    /** Suelta la grabación retenida (el doctor decide no reintentar). */
    discardRetainedAudio,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
