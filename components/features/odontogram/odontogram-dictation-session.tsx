"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useGroqDictation,
  type RetainedDictationAudio,
} from "@/lib/hooks/speech/use-groq-dictation";
import {
  applyOdontogramDictationPatch,
  countOdontogramPatchOperations,
  createConfirmedOdontogramDictationPatch,
  createOdontogramDictationContext,
  describeOdontogramDictationPatch,
  findOdontogramDictationBlockers,
  type OdontogramDictationAdapter,
  type OdontogramDictationApplyOptions,
  type OdontogramDictationPatchDescription,
  type OdontogramDictationSelection,
} from "@/lib/odontogram/application/dictation";
import {
  useOdontogramStore,
  useOdontogramStoreApi,
  type OdontogramStoreApi,
} from "@/lib/odontogram/store";
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
 * Dictado interpretado que ESPERA la revisión del doctor (HU-DICT-032).
 *
 * Ningún dictado llega al odontograma sin pasar por aquí: el micrófono está
 * abierto en el box, la voz no se puede autenticar y una frase del paciente no
 * puede acabar en su historia clínica porque el modelo la entendió con mucha
 * confianza. Es también lo que exige el contrato del backend
 * (`ODONTOGRAM_DICTATION_API.md`, «Reglas para el frontend» 1, 2, 3 y 7).
 */
export interface OdontogramDictationPreviewState {
  /** Parche íntegro tal y como respondió el backend: es lo que se aplicará. */
  patch: OdontogramDictationPatchResponse;
  /** El mismo parche en castellano clínico, ordenado y agrupado por pieza. */
  description: OdontogramDictationPatchDescription;
  /**
   * `sequence` que el doctor deja marcados. Clave por parche: el validador del
   * backend garantiza que sea única y consecutiva desde 1 DENTRO del parche,
   * así que una selección nunca sobrevive a un dictado nuevo — y por eso el
   * estado entero se reemplaza con cada interpretación.
   *
   * Nacen marcadas TODAS menos dos clases: las bloqueadas (no son aplicables) y
   * las que la IA marca `requiresConfirmation` (regla 4 del contrato: la
   * confirmación tiene que ser un gesto sobre ESA instrucción, no un clic
   * global que las arrastre).
   */
  selected: ReadonlySet<number>;
  /**
   * `sequence` → por qué no se puede aplicar sobre el odontograma de AHORA
   * (preflight de la regla 11).
   *
   * Se mantiene VIVO mientras el panel está abierto: el modal del diente sigue
   * operativo debajo, así que el doctor puede borrar a mano justo el hallazgo
   * que una instrucción `REMOVE` iba a quitar. Una instrucción bloqueada no se
   * puede marcar; si ya estaba marcada cuando se bloqueó, se queda a la vista
   * con su motivo y se puede DESmarcar para aplicar el resto.
   */
  blockers: ReadonlyMap<number, string>;
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
  /**
   * Hay trabajo en curso: el botón de grabar no debe aceptar clics. Incluye la
   * previsualización pendiente — grabar otra vez la reemplazaría, y perder en
   * silencio un lote que el doctor aún no ha decidido es exactamente lo que
   * este panel viene a impedir.
   */
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
  /**
   * Dictado interpretado esperando revisión, o `null`. Mientras exista, el
   * odontograma NO ha cambiado: solo `applyPreview` escribe.
   */
  preview: OdontogramDictationPreviewState | null;
  /** Marca o desmarca una instrucción suelta de la previsualización. */
  togglePreviewOperation: (sequence: number, selected: boolean) => void;
  /**
   * Marca o desmarca en bloque las instrucciones de una pieza. Marcar solo
   * alcanza a lo aprobable en bloque: lo bloqueado no es aplicable y lo que la
   * IA no da por seguro exige un gesto propio. Desmarcar alcanza a todo.
   */
  togglePreviewTooth: (toothNumber: number, selected: boolean) => void;
  /**
   * Quita de la selección lo que se bloqueó mientras el panel estaba abierto.
   * Es el atajo del caso real: el doctor corrigió la pieza a mano y quiere
   * aplicar lo que sigue siendo válido sin repasar fila por fila.
   */
  unselectBlockedPreviewOperations: () => void;
  /** Escribe en el odontograma SOLO lo que quedó marcado. */
  applyPreview: () => void;
  /** Cierra la previsualización sin tocar nada. */
  discardPreview: () => void;
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
  // Dice por qué el micrófono está apagado: hay un lote esperando decisión.
  if (session.preview)
    return "Revisa los cambios del dictado antes de aplicarlos";
  return idleText;
}

/**
 * Preflight del parche entero contra el odontograma de AHORA, en el formato que
 * consume el panel. `findOdontogramDictationBlockers` es puro y no muta nada:
 * se puede llamar tantas veces como haga falta.
 */
function collectBlockers(
  storeApi: OdontogramStoreApi,
  patch: OdontogramDictationPatchResponse,
): ReadonlyMap<number, string> {
  return new Map(
    findOdontogramDictationBlockers(storeApi, patch).map((blocker) => [
      blocker.sequence,
      blocker.warning,
    ]),
  );
}

/** Evita repintar el panel cuando el recálculo llega al mismo resultado. */
function sameBlockers(
  left: ReadonlyMap<number, string>,
  right: ReadonlyMap<number, string>,
): boolean {
  if (left.size !== right.size) return false;
  for (const [sequence, warning] of left) {
    if (right.get(sequence) !== warning) return false;
  }
  return true;
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
  const [pendingBatches, setPendingBatches] = useState<
    OdontogramDictationInconsistencyBatch[]
  >([]);
  const [preview, setPreview] =
    useState<OdontogramDictationPreviewState | null>(null);
  const [transcriptionReview, setTranscriptionReview] =
    useState<OdontogramDictationTranscriptionReview | null>(null);
  const [isReinterpreting, setIsReinterpreting] = useState(false);
  const [lastApplied, setLastApplied] =
    useState<OdontogramDictationAppliedSignal | null>(null);
  const learningInFlight = useRef(new Set<string>());

  const applyPatch = useCallback(
    (
      patch: OdontogramDictationPatchResponse,
      options?: OdontogramDictationApplyOptions,
      /**
       * Quien sepa contar mejor lo que pasó apaga el aviso genérico y lo cuenta
       * él: un «requiere revisión» encima de un «no se aplicó nada» son dos
       * toasts para un solo hecho.
       */
      feedback?: { notifyWarnings?: boolean },
    ) => {
      const result = applyOdontogramDictationPatch(storeApi, patch, options);
      const selected =
        options?.selectedSequences == null
          ? null
          : new Set(options.selectedSequences);

      if (result.appliedOperations > 0) {
        const defaultedIcdasCount = patch.toothChanges.reduce(
          (total, change) =>
            total +
            change.operations.filter(
              (operation) =>
                operation.diagnosis?.icdasSource === "dictation-default" &&
                // Solo cuenta lo que de verdad se escribió: avisar de un ICDAS
                // por defecto que el doctor descartó sería mentira.
                (!selected || selected.has(operation.sequence)),
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

      if (feedback?.notifyWarnings !== false && result.warnings.length > 0) {
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

  /**
   * Abre la PREVISUALIZACIÓN. No escribe nada.
   *
   * Antes de HU-DICT-032 este camino aplicaba el parche directo cuando ninguna
   * operación pedía confirmación, y solo levantaba un diálogo genérico —sin
   * detalle de lo que iba a pasar— cuando alguna la pedía. Ese diálogo se
   * retiró: el panel ES la confirmación, con la operación a la vista y la frase
   * que la originó, y no tiene sentido apilar dos.
   */
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

      const description = describeOdontogramDictationPatch(patch);
      // Preflight contra el odontograma de AHORA: lo inaplicable se enseña con
      // su motivo, pero nace desmarcado — marcarlo tumbaría el lote entero.
      const blockers = collectBlockers(storeApi, patch);

      setPreview({
        patch,
        description,
        // Lo que la IA no da por seguro (`requiresConfirmation`, regla 4) nace
        // DESMARCADO: confirmarlo tiene que ser un gesto sobre esa instrucción.
        // Nacer marcado convertía el botón «Aplicar» en la única confirmación,
        // y ese clic dice «acepto el lote», no «doy por bueno justo esto».
        selected: new Set(
          description.operations
            .filter(
              (operation) =>
                !blockers.has(operation.sequence) &&
                !operation.requiresConfirmation,
            )
            .map((operation) => operation.sequence),
        ),
        blockers,
      });

      if (blockers.size === description.totalOperations) {
        notify.warning("Ningún cambio del dictado se puede aplicar", {
          description:
            blockers.values().next().value ??
            "Revisa el detalle junto al control de dictado.",
        });
      }
    },
    [rememberInconsistencies, storeApi],
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
          let result;
          try {
            result = applyPatch(
              createConfirmedOdontogramDictationPatch(
                batch.dictationId,
                batch.inconsistencies,
                resolutions,
              ),
              undefined,
              { notifyWarnings: false },
            );
          } catch {
            notify.error("No se pudo aplicar la aclaración", {
              description:
                "La opción seleccionada no contiene un cambio válido para el odontograma.",
            });
            return;
          }

          // El preflight pudo rechazar el cambio clínico (la pieza ya no está
          // como cuando se dictó, el `match` ya no coincide…). Si NADA se
          // escribió, retirar el lote y mandar el aprendizaje sería enseñar
          // como aprendida una decisión que el odontograma no aceptó: el lote
          // se conserva tal cual, sin POST, y se dice el motivo real.
          if (result.appliedOperations === 0) {
            notify.warning("La aclaración no se aplicó al odontograma", {
              description: `${
                result.warnings[0] ??
                "El odontograma actual no admite ese cambio."
              } Se conservan las aclaraciones: corrige la pieza y vuelve a confirmar, o descártalas.`,
            });
            return;
          }

          if (result.warnings.length > 0) {
            notify.warning("Hay indicaciones que requieren revisión", {
              description: result.warnings[0],
            });
          }
          appliedOperations = result.appliedOperations;
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

  const togglePreviewOperation = useCallback(
    (sequence: number, isSelected: boolean) => {
      setPreview((current) => {
        if (!current) return current;
        // Lo inaplicable no se puede aprobar (ver `blockers`).
        if (isSelected && current.blockers.has(sequence)) return current;
        const next = new Set(current.selected);
        if (isSelected) next.add(sequence);
        else next.delete(sequence);
        return { ...current, selected: next };
      });
    },
    [],
  );

  const togglePreviewTooth = useCallback(
    (toothNumber: number, isSelected: boolean) => {
      setPreview((current) => {
        if (!current) return current;
        const group = current.description.groups.find(
          (item) => item.toothNumber === toothNumber,
        );
        if (!group) return current;

        const next = new Set(current.selected);
        group.operations.forEach((operation) => {
          if (isSelected) {
            // Marcar en bloque no puede arrastrar ni lo inaplicable ni lo que
            // la IA no da por seguro: eso último exige su propio gesto.
            if (
              !current.blockers.has(operation.sequence) &&
              !operation.requiresConfirmation
            ) {
              next.add(operation.sequence);
            }
            return;
          }
          next.delete(operation.sequence);
        });
        return { ...current, selected: next };
      });
    },
    [],
  );

  const unselectBlockedPreviewOperations = useCallback(() => {
    setPreview((current) => {
      if (!current) return current;
      const next = new Set(current.selected);
      let changed = false;
      current.blockers.forEach((_warning, sequence) => {
        if (next.delete(sequence)) changed = true;
      });
      return changed ? { ...current, selected: next } : current;
    });
  }, []);

  const previewPatch = preview?.patch ?? null;
  /**
   * Mientras el propio panel escribe, el store emite un cambio por operación.
   * Recalcular con la escritura a medias solo produciría estados intermedios
   * que nadie llega a ver (un `REMOVE` ya aplicado aparece como bloqueado): el
   * recálculo que importa lo hace `applyPreview` cuando termina.
   */
  const isApplyingRef = useRef(false);

  /**
   * Mantiene VIVO el preflight mientras el panel está abierto.
   *
   * Hace falta porque el panel vive en la cabecera pegajosa del modal del
   * diente y el modal sigue siendo operativo debajo: el doctor puede borrar a
   * mano el hallazgo que una instrucción `REMOVE` iba a quitar y dejar el lote
   * inaplicable sin que el panel se entere.
   *
   * La suscripción es a TODO el store —zustand vanilla no ofrece selectores en
   * `subscribe`—, así que el listener corre con cada cambio (autosave, pestaña,
   * moneda…). Por eso lo primero que hace es comparar por REFERENCIA las dos
   * únicas colecciones que mira el preflight: si `teeth` y `clinicalEvents` son
   * las mismas, no hay nada que recalcular y el coste es una comparación. El
   * recorrido de las operaciones solo ocurre cuando los datos clínicos cambian
   * de verdad, y el estado solo se reemplaza si el resultado es distinto.
   */
  useEffect(() => {
    if (!previewPatch) return;

    return storeApi.subscribe((state, previous) => {
      if (isApplyingRef.current) return;
      if (
        state.teeth === previous.teeth &&
        state.clinicalEvents === previous.clinicalEvents
      ) {
        return;
      }

      const blockers = collectBlockers(storeApi, previewPatch);
      setPreview((current) => {
        // Un dictado nuevo mientras tanto: estos bloqueos ya no son de nadie.
        if (!current || current.patch !== previewPatch) return current;
        return sameBlockers(current.blockers, blockers)
          ? current
          : { ...current, blockers };
      });
    });
  }, [previewPatch, storeApi]);

  /**
   * ÚNICO camino por el que un dictado escribe en el odontograma. Manda lo
   * marcado, no el parche entero: el preflight de la regla 11 sigue siendo
   * todo-o-nada, pero «el lote» pasa a ser lo que el doctor aprobó.
   *
   * Cierra el panel SOLO cuando algo se escribió. Si no se escribió nada, la
   * revisión se conserva con los motivos ya actualizados: cerrarla obligaría a
   * volver a dictar por un lote que quizá solo necesitaba desmarcar una fila.
   */
  const applyPreview = useCallback(() => {
    if (!preview || preview.selected.size === 0) return;

    // Recálculo en el momento de aplicar, aunque la suscripción lo mantenga al
    // día: es la única comprobación que ocurre con el store que se va a
    // escribir, y es barata frente al coste de perder el lote.
    const blockers = collectBlockers(storeApi, preview.patch);
    const blockedSelected = Array.from(preview.selected).filter((sequence) =>
      blockers.has(sequence),
    );

    if (blockedSelected.length > 0) {
      setPreview((current) =>
        current && current.patch === preview.patch
          ? { ...current, blockers }
          : current,
      );
      notify.warning(
        blockedSelected.length === 1
          ? "1 cambio marcado ya no se puede aplicar"
          : `${blockedSelected.length} cambios marcados ya no se pueden aplicar`,
        {
          description: `${
            blockers.get(blockedSelected[0]) ??
            "El odontograma cambió mientras revisabas."
          } Se conserva la revisión: desmárcalo y aplica el resto.`,
        },
      );
      return;
    }

    isApplyingRef.current = true;
    let result;
    try {
      result = applyPatch(
        preview.patch,
        { selectedSequences: preview.selected },
        { notifyWarnings: false },
      );
    } finally {
      isApplyingRef.current = false;
    }

    if (result.appliedOperations === 0) {
      setPreview((current) =>
        current && current.patch === preview.patch
          ? { ...current, blockers: collectBlockers(storeApi, preview.patch) }
          : current,
      );
      notify.warning("No se aplicó ningún cambio del dictado", {
        description: `${
          result.warnings[0] ?? "El odontograma actual no admite estos cambios."
        } Se conserva la revisión para que desmarques lo que no se pueda aplicar.`,
      });
      return;
    }

    if (result.warnings.length > 0) {
      notify.warning("Hay indicaciones que requieren revisión", {
        description: result.warnings[0],
      });
    }
    setPreview(null);
  }, [applyPatch, preview, storeApi]);

  const discardPreview = useCallback(() => {
    setPreview(null);
    notify.info("Dictado descartado", {
      description: "No se cambió nada en el odontograma.",
    });
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
      isBusy: isProcessing || isReinterpreting || preview !== null,
      isEngaged:
        isRecording ||
        isProcessing ||
        isReinterpreting ||
        retainedAudio !== null ||
        transcriptionReview !== null ||
        preview !== null ||
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
      preview,
      togglePreviewOperation,
      togglePreviewTooth,
      unselectBlockedPreviewOperations,
      applyPreview,
      discardPreview,
      pendingBatches,
      resolveBatch: handleResolve,
      lastApplied,
    };
  }, [
    adapter,
    applyPreview,
    discardPreview,
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
    preview,
    readOnly,
    recordingSeconds,
    reinterpret,
    retainedAudio,
    retryRetained,
    togglePreviewOperation,
    togglePreviewTooth,
    toggleRecording,
    transcriptionReview,
    unselectBlockedPreviewOperations,
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
