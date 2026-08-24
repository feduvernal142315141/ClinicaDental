"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useOdontogramConfirm } from "@/components/features/odontogram/ui/OdontogramConfirm";
import {
  useGroqDictation,
  type RetainedDictationAudio,
} from "@/lib/hooks/speech/use-groq-dictation";
import {
  applyOdontogramDictationPatch,
  countOdontogramPatchOperations,
  createConfirmedOdontogramDictationPatch,
  createOdontogramDictationContext,
  odontogramPatchRequiresConfirmation,
  type OdontogramDictationAdapter,
  type OdontogramDictationSelection,
} from "@/lib/odontogram/application/dictation";
import { useOdontogramStore, useOdontogramStoreApi } from "@/lib/odontogram/store";
import { isRetryableError } from "@/lib/errors/normalize-error";
import { notify } from "@/lib/utils/notify";
import {
  extractApiErrorMessage,
  notifyApiError,
} from "@/lib/utils/notify-error";
import type {
  OdontogramDictationPatchResponse,
  ResolveOdontogramInconsistencyRequest,
} from "@/lib/entity/speech";
import type { OdontogramDictationInconsistencyBatch } from "./odontogram-dictation-inconsistencies";

/** Aviso de que un dictado cambió el odontograma, para quien esté mirándolo. */
export interface OdontogramDictationAppliedSignal {
  /** Sube con cada aplicación: permite reaccionar UNA vez a cada una. */
  token: number;
  /** Piezas realmente modificadas. */
  teeth: number[];
}

export interface OdontogramDictationTranscriptionReview {
  patch: OdontogramDictationPatchResponse;
  transcript: string;
}

/**
 * Estado y acciones del dictado del odontograma, compartidos por TODAS las
 * superficies que lo ofrecen (la barra junto a las pestañas y el control
 * compacto del modal del diente).
 *
 * Es un único objeto porque solo puede haber un dictado: un micrófono, una
 * grabación retenida, una revisión de transcripción y un conjunto de
 * aclaraciones pendientes. Dos instancias del hook competirían por el
 * micrófono y partirían ese estado en dos.
 */
export interface OdontogramDictationSession {
  isRecording: boolean;
  isProcessing: boolean;
  isReinterpreting: boolean;
  /** Hay trabajo en curso: el botón de grabar no debe aceptar clics. */
  isBusy: boolean;
  /**
   * Hay algo VIVO que el doctor tiene que poder ver o terminar: una grabación
   * abierta, un envío en curso, audio retenido, una transcripción por revisar o
   * aclaraciones pendientes. Ninguna superficie puede esconderse por cambio de
   * pestaña mientras esto sea cierto: dejaría una grabación corriendo sin botón
   * de parar.
   */
  isEngaged: boolean;
  /** Histórico, visita finalizada o sin permiso: el dictado no puede escribir. */
  readOnly: boolean;
  interimText: string;
  recordingSeconds: number;
  toggleRecording: () => void;
  retainedAudio: RetainedDictationAudio | null;
  retryRetainedAudio: () => void;
  discardRetainedAudio: () => void;
  transcriptionReview: OdontogramDictationTranscriptionReview | null;
  updateTranscriptionReview: (transcript: string) => void;
  discardTranscriptionReview: () => void;
  reinterpret: () => void;
  pendingBatches: OdontogramDictationInconsistencyBatch[];
  resolveBatch: (
    batch: OdontogramDictationInconsistencyBatch,
    resolutions: ResolveOdontogramInconsistencyRequest[],
  ) => void;
  /** Última aplicación con cambios reales (ver `OdontogramDictationAppliedSignal`). */
  lastApplied: OdontogramDictationAppliedSignal | null;
}

const OdontogramDictationSessionContext =
  createContext<OdontogramDictationSession | null>(null);

/**
 * Contexto aparte, y a propósito: la sesión cambia CADA SEGUNDO mientras se
 * graba (el contador). Quien solo necesita saber si el dictado existe —el modal
 * del diente, para reservarle sitio en su cabecera— se suscribe a este booleano
 * y no se repinta con cada tic.
 */
const OdontogramDictationAvailableContext = createContext(false);

/** `true` si hay dictado disponible aquí, sin suscribirse a su estado. */
export function useOdontogramDictationAvailable(): boolean {
  return useContext(OdontogramDictationAvailableContext);
}

/**
 * Sesión de dictado activa, o `null` cuando la clínica lo tiene apagado, no
 * hay adapter o el navegador no puede grabar. Todo control de dictado debe
 * renderizar `null` en ese caso: nunca montar su propio hook.
 */
export function useOdontogramDictationSession(): OdontogramDictationSession | null {
  return useContext(OdontogramDictationSessionContext);
}

/** Texto de estado común a las dos superficies (lo lee `aria-live`). */
export function describeOdontogramDictationStatus(
  session: OdontogramDictationSession,
  idleText: string,
): string {
  if (session.isRecording) {
    return `${
      session.interimText.trim() || "Escuchando el examen dental…"
    } · ${session.recordingSeconds}s`;
  }
  if (session.isProcessing) return "Transcribiendo y preparando los cambios…";
  return idleText;
}

interface OdontogramDictationProviderProps {
  /**
   * Ausente cuando el interruptor por clínica está apagado, falta permiso o el
   * odontograma es histórico: el host decide (`useOdontogramDictationAvailability`)
   * y aquí simplemente no hay sesión.
   */
  adapter?: OdontogramDictationAdapter;
  /**
   * Pieza/caras con foco en el modal del diente, publicada por el propio módulo
   * (HU-DICT-011). `null` cuando no hay modal abierto: sin foco NO se inventa
   * ninguno — el backend prefiere emitir `UNRESOLVED_PREVIOUS_SELECTION` antes
   * que adivinar una pieza en una historia clínica.
   */
  lastSelection?: OdontogramDictationSelection | null;
  children: ReactNode;
}

/**
 * Monta el ÚNICO motor de dictado del odontograma y lo publica por contexto.
 *
 * Se monta siempre (con o sin `adapter`) para no reconstruir el árbol del
 * módulo cuando la consulta de disponibilidad responde: el adapter llega un
 * momento después del montaje y un provider condicional remontaría el
 * odontograma entero — perdiendo pestaña activa, modal abierto y selección.
 */
export function OdontogramDictationProvider({
  adapter,
  lastSelection = null,
  children,
}: OdontogramDictationProviderProps) {
  const storeApi = useOdontogramStoreApi();
  // El contexto se arma al SOLTAR el botón, no al montar: se lee por ref para
  // que `processAudio` no quede capturado con un foco viejo.
  const lastSelectionRef = useRef(lastSelection);
  lastSelectionRef.current = lastSelection;
  const readOnly = useOdontogramStore((state) => state.readOnly);
  const confirm = useOdontogramConfirm();
  const [pendingBatches, setPendingBatches] = useState<
    OdontogramDictationInconsistencyBatch[]
  >([]);
  const [transcriptionReview, setTranscriptionReview] =
    useState<OdontogramDictationTranscriptionReview | null>(null);
  const [isReinterpreting, setIsReinterpreting] = useState(false);
  const [lastApplied, setLastApplied] =
    useState<OdontogramDictationAppliedSignal | null>(null);
  const learningInFlight = useRef(new Set<string>());

  const applyPatch = useCallback(
    (patch: OdontogramDictationPatchResponse) => {
      const result = applyOdontogramDictationPatch(storeApi, patch);

      if (result.appliedOperations > 0) {
        const defaultedIcdasCount = patch.toothChanges.reduce(
          (total, change) =>
            total +
            change.operations.filter(
              (operation) =>
                operation.diagnosis?.icdasSource === "dictation-default",
            ).length,
          0,
        );
        notify.success("Odontograma actualizado desde el dictado", {
          description: `${result.appliedOperations} cambio${
            result.appliedOperations === 1 ? "" : "s"
          } aplicado${result.appliedOperations === 1 ? "" : "s"} en las piezas ${
            result.affectedTeeth.join(", ")
          }.${
            defaultedIcdasCount > 0
              ? ` Se asignó ICDAS 1 automáticamente a ${defaultedIcdasCount} caries sin valor dictado.`
              : ""
          }`,
        });
        // Quien esté mirando una de esas piezas (el modal del diente) tiene que
        // enterarse: si no, el doctor sigue viendo los datos de antes del dictado.
        setLastApplied((current) => ({
          token: (current?.token ?? 0) + 1,
          teeth: result.affectedTeeth,
        }));
      }

      if (result.warnings.length > 0) {
        notify.warning("Hay indicaciones que requieren revisión", {
          description: result.warnings[0],
        });
      }

      return result;
    },
    [storeApi],
  );

  const rememberInconsistencies = useCallback(
    (patch: OdontogramDictationPatchResponse) => {
      const inconsistencies = patch.inconsistencies ?? [];
      if (!patch.dictationId || inconsistencies.length === 0) return;

      setPendingBatches((current) => [
        ...current.filter((batch) => batch.dictationId !== patch.dictationId),
        {
          dictationId: patch.dictationId!,
          inconsistencies,
        },
      ]);
    },
    [],
  );

  const processPatch = useCallback(
    (patch: OdontogramDictationPatchResponse) => {
      const operationCount = countOdontogramPatchOperations(patch);
      rememberInconsistencies(patch);

      if (operationCount === 0) {
        const inconsistencyCount = patch.inconsistencies?.length ?? 0;
        notify.warning("El dictado no produjo cambios seguros", {
          description:
            inconsistencyCount > 0
              ? "Hay aclaraciones pendientes junto al control de dictado."
              : "No se identificaron piezas ni afectaciones aplicables.",
        });
        return;
      }

      if (odontogramPatchRequiresConfirmation(patch)) {
        const destructiveCount = patch.toothChanges.reduce(
          (total, change) =>
            total +
            change.operations.filter(
              (operation) =>
                operation.action === "REMOVE" || operation.action === "RESET",
            ).length,
          0,
        );

        confirm({
          title: "Confirmar cambios del dictado",
          description: `La IA identificó ${operationCount} cambio${
            operationCount === 1 ? "" : "s"
          } en ${patch.toothChanges.length} pieza${
            patch.toothChanges.length === 1 ? "" : "s"
          }${
            destructiveCount > 0
              ? `, incluyendo ${destructiveCount} corrección${
                  destructiveCount === 1 ? "" : "es"
                } que desmarcará datos actuales`
              : ""
          }.`,
          okText: "Aplicar cambios",
          cancelText: "Descartar",
          danger: destructiveCount > 0,
          onOk: () => applyPatch(patch),
        });
        return;
      }

      applyPatch(patch);
    },
    [applyPatch, confirm, rememberInconsistencies],
  );

  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!adapter) return;

      const context = createOdontogramDictationContext(
        storeApi.getState().getSnapshot(),
        { lastSelection: lastSelectionRef.current },
      );
      const patch = await adapter.transcribe(audioBlob, context);
      if (patch.transcriptionQuality?.needsReview) {
        setTranscriptionReview({ patch, transcript: patch.rawTranscript });
        notify.warning("Revisa la transcripción antes de aplicar", {
          description:
            patch.transcriptionQuality.warnings[0]?.message ??
            "El audio contiene un fragmento de baja confianza.",
        });
        return;
      }

      processPatch(patch);
    },
    [adapter, processPatch, storeApi],
  );

  const handleReinterpret = useCallback(async () => {
    if (!adapter || !transcriptionReview?.transcript.trim()) return;
    setIsReinterpreting(true);
    try {
      const context = createOdontogramDictationContext(
        storeApi.getState().getSnapshot(),
        { lastSelection: lastSelectionRef.current },
      );
      const patch = await adapter.reinterpret(
        transcriptionReview.transcript.trim(),
        context,
      );
      setTranscriptionReview(null);
      processPatch(patch);
    } catch (error) {
      // Mismo endpoint que el dictado: puede responder 429 (cupo) o 503
      // (apagado). Ese motivo debe llegar al doctor, no un genérico de conexión.
      notifyApiError(
        "No se pudo reinterpretar la transcripción",
        error,
        "Conservamos el texto corregido. Revisa tu conexión y vuelve a intentarlo.",
      );
    } finally {
      setIsReinterpreting(false);
    }
  }, [adapter, processPatch, storeApi, transcriptionReview]);

  const handleResolve = useCallback(
    (
      batch: OdontogramDictationInconsistencyBatch,
      resolutions: ResolveOdontogramInconsistencyRequest[],
    ) => {
      if (!adapter) return;
      if (learningInFlight.current.has(batch.dictationId)) return;

      const dismissedCount = resolutions.filter(
        (resolution) => resolution.candidateId === null,
      ).length;
      const allDismissed =
        resolutions.length > 0 && dismissedCount === resolutions.length;
      // El cambio clínico se aplica UNA sola vez. En un reintento el lote ya
      // trae las decisiones enviadas y lo que se aplicó, así que solo falta
      // repetir el POST del aprendizaje.
      let appliedOperations = batch.pendingLearning?.appliedOperations ?? 0;

      if (!batch.pendingLearning) {
        if (allDismissed) {
          notify.info(
            dismissedCount === 1
              ? "Aclaración descartada"
              : `${dismissedCount} aclaraciones descartadas`,
            {
              description:
                "No cambian el odontograma y no se aprenderá de ellas.",
            },
          );
        } else {
          try {
            appliedOperations = applyPatch(
              createConfirmedOdontogramDictationPatch(
                batch.dictationId,
                batch.inconsistencies,
                resolutions,
              ),
            ).appliedOperations;
          } catch {
            notify.error("No se pudo aplicar la aclaración", {
              description:
                "La opción seleccionada no contiene un cambio válido para el odontograma.",
            });
            return;
          }
        }
      }

      learningInFlight.current.add(batch.dictationId);
      setPendingBatches((current) =>
        current.filter((item) => item.dictationId !== batch.dictationId),
      );

      void adapter
        .resolveInconsistencies(batch.dictationId, resolutions)
        .then(() => {
          learningInFlight.current.delete(batch.dictationId);
        })
        .catch((error: unknown) => {
          learningInFlight.current.delete(batch.dictationId);

          // Un rechazo PERMANENTE (4xx de contrato: el lote ya se cerró, la
          // aclaración no admite descarte…) no se arregla repitiendo la misma
          // petición. Devolver el lote dejaría un botón "Reintentar
          // aprendizaje" que no podría funcionar NUNCA: se informa con el
          // motivo real del backend y el lote se retira.
          if (!isRetryableError(error)) {
            notifyApiError(
              "No se pudo guardar el aprendizaje del dictado",
              error,
              "El servidor rechazó estas aclaraciones y no volverá a aceptarlas; no hace falta reintentar.",
            );
            return;
          }

          // Fallo TRANSITORIO (red, timeout, 429, 5xx): el lote vuelve CON las
          // decisiones tomadas, así el reintento manda el mismo conjunto
          // completo que el backend exige, sin volver a marcar la pieza ni
          // pedirle al doctor que decida otra vez.
          setPendingBatches((current) => [
            ...current.filter((item) => item.dictationId !== batch.dictationId),
            {
              ...batch,
              pendingLearning: { resolutions, appliedOperations },
            },
          ]);
          notify.warning(
            appliedOperations > 0
              ? "El odontograma se actualizó"
              : "Las aclaraciones quedaron decididas",
            {
              description: `${
                extractApiErrorMessage(error) ??
                "No se pudo guardar el aprendizaje."
              } Puedes reintentarlo sin volver a marcar la pieza.`,
            },
          );
        });
    },
    [adapter, applyPatch],
  );

  const {
    isSupported,
    isRecording,
    isProcessing,
    interimText,
    recordingSeconds,
    retainedAudio,
    retryRetainedAudio,
    discardRetainedAudio,
    startRecording,
    stopRecording,
  } = useGroqDictation({
    processAudio,
    processingErrorTitle: "No se pudo interpretar el odontograma",
    processingErrorDescription:
      "El audio no pudo convertirse en cambios clínicos. Revisa tu conexión y vuelve a intentarlo.",
  });

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
      return;
    }
    void startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const updateTranscriptionReview = useCallback((transcript: string) => {
    setTranscriptionReview((current) =>
      current ? { ...current, transcript } : current,
    );
  }, []);

  const discardTranscriptionReview = useCallback(() => {
    setTranscriptionReview(null);
  }, []);

  const retryRetained = useCallback(() => {
    void retryRetainedAudio();
  }, [retryRetainedAudio]);

  const reinterpret = useCallback(() => {
    void handleReinterpret();
  }, [handleReinterpret]);

  const session = useMemo<OdontogramDictationSession | null>(() => {
    // Sin adapter (dictado apagado para la clínica, histórico, sin permiso) o
    // sin soporte del navegador no hay sesión: ninguna superficie se pinta.
    if (!adapter || !isSupported) return null;

    return {
      isRecording,
      isProcessing,
      isReinterpreting,
      isBusy: isProcessing || isReinterpreting,
      isEngaged:
        isRecording ||
        isProcessing ||
        isReinterpreting ||
        retainedAudio !== null ||
        transcriptionReview !== null ||
        pendingBatches.length > 0,
      readOnly,
      interimText,
      recordingSeconds,
      toggleRecording,
      retainedAudio,
      retryRetainedAudio: retryRetained,
      discardRetainedAudio,
      transcriptionReview,
      updateTranscriptionReview,
      discardTranscriptionReview,
      reinterpret,
      pendingBatches,
      resolveBatch: handleResolve,
      lastApplied,
    };
  }, [
    adapter,
    discardRetainedAudio,
    discardTranscriptionReview,
    handleResolve,
    interimText,
    isProcessing,
    isRecording,
    isReinterpreting,
    isSupported,
    lastApplied,
    pendingBatches,
    readOnly,
    recordingSeconds,
    reinterpret,
    retainedAudio,
    retryRetained,
    toggleRecording,
    transcriptionReview,
    updateTranscriptionReview,
  ]);

  return (
    <OdontogramDictationAvailableContext.Provider value={session !== null}>
      <OdontogramDictationSessionContext.Provider value={session}>
        {children}
      </OdontogramDictationSessionContext.Provider>
    </OdontogramDictationAvailableContext.Provider>
  );
}
