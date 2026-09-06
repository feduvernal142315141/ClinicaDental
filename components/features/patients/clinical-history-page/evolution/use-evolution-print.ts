"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clinicalHistoryService } from "@/lib/services/clinical-history";
import type { VisitRecordState } from "@/lib/hooks/patients/clinical-history-page/use-visit-records-batch";
import type { Appointment } from "@/lib/entity/appointment/appointments";

/**
 * Preparación e impresión de la evolución clínica completa de un paciente.
 *
 * ── POR QUÉ ESTE HOOK NO REUTILIZA `useVisitRecordsBatch` ───────────────────
 * Ese hook vive DENTRO de `EvolutionColumn` y carga de forma perezosa: al pulsar
 * "Imprimir" la mayoría de los registros ni siquiera se han pedido, porque el
 * usuario nunca llegó a hacer scroll hasta ellos. Un documento clínico-legal no
 * puede salir de la impresora con los asientos que el usuario alcanzó a ver: o
 * están TODOS resueltos, o el documento miente por omisión.
 *
 * Por eso este hook mantiene su propia caché completa y su propio pool, y sólo
 * llama a `window.print()` cuando está resuelta cada cita DEL ALCANCE QUE SE LE
 * PIDIÓ — que no es forzosamente lo que el documento acaba pintando: de ahí la
 * precondición de `print()`, más abajo. Los `empty` y los `failed` también se
 * imprimen, con su texto: "sin registro" y "no se pudo cargar" son hechos del
 * expediente, no huecos que se puedan dejar en blanco.
 *
 * La carga respeta el mismo pool de concurrencia 4 que el feed: no hay endpoint
 * de listado (1 visita = 1 GET) y disparar 100 peticiones a la vez tumbaría al
 * backend justo cuando el paciente está esperando su copia en mostrador.
 *
 * ── LO QUE LA CACHÉ NO PUEDE CONSERVAR ─────────────────────────────────────
 * La caché sobrevive a la impresión, así que hay dos formas de que una segunda
 * copia salga diciendo algo falso, y las dos se cortan aquí:
 *   · Se imprimió ANTES de iniciar la consulta (404 → `empty`), se atendió y se
 *     escribió la nota. `invalidateToken` tira esa clave y la reimpresión la
 *     vuelve a pedir; sin eso el folio diría "Sin registro de visita" para una
 *     consulta que ya tiene nota (ADR-61, sobre papel que sale de la clínica).
 *     Ese corte SÓLO existe si el host cablea la pareja: sin `invalidateToken`
 *     el descarte no se dispara nunca y la caché queda congelada de por vida.
 *   · Un fallo técnico (`failed`) NO es terminal: volver a pulsar Imprimir es
 *     la única forma que tiene el usuario de reintentarlo. Un `empty` sí lo es:
 *     un 404 es la respuesta correcta, no un fallo.
 */

/** Peticiones simultáneas máximas. Mismo techo que el feed en pantalla. */
const MAX_CONCURRENT = 4;

/**
 * El documento imprimible, hijo directo de `<body>` por portal. El CSS de
 * impresión sólo apaga el resto de la aplicación cuando este nodo lleva la
 * marca de abajo: sin ella, un Ctrl+P del usuario imprime la pantalla como en
 * cualquier otra vista, y no este documento con los asientos a medio cargar.
 */
const PRINT_ROOT_SELECTOR = "body > .evolution-print";
const PRINT_ACTIVE_ATTR = "data-print-active";

const GENERIC_FAILURE = "No se pudo cargar el registro de esta visita";
const FORBIDDEN_FAILURE = "No tiene permisos para ver el registro de esta visita";

function statusOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const raw = (error as { status?: unknown }).status;
    return typeof raw === "number" ? raw : undefined;
  }
  return undefined;
}

/**
 * Estados de los que no tiene sentido volver a pedir nada al pulsar Imprimir.
 * `failed` NO está aquí a propósito: es un fallo técnico y el usuario no tiene
 * otro botón para reintentarlo. `empty` sí: un 404 significa "esta visita no
 * tiene registro" y reintentarlo no lo cambiaría (ADR-61).
 */
function isResolved(state: VisitRecordState | undefined): boolean {
  return state?.status === "ready" || state?.status === "empty";
}

/**
 * Orden canónico de la evolución. Es EL MISMO criterio que aplica
 * `EvolutionColumn` en pantalla —consulta en curso primero, luego por fecha y
 * hora descendente, sin canceladas— para que el papel y la pantalla no puedan
 * divergir. Se exporta para que el documento no vuelva a inventarlo.
 *
 * Nota: ordena por fecha+hora AGENDADA porque el DTO del listado no trae la
 * hora real de atención; el documento lo rotula así en cada asiento.
 */
export function orderEvolutionAppointments(
  appointments: Appointment[],
): Appointment[] {
  const visible = appointments.filter(
    (appointment) => appointment.status !== "cancelled",
  );
  return [...visible].sort((a, b) => {
    const aRunning = a.status === "in_progress" ? 1 : 0;
    const bRunning = b.status === "in_progress" ? 1 : 0;
    if (aRunning !== bRunning) return bRunning - aRunning;
    const aKey = `${a.date ?? ""}T${a.time ?? ""}`;
    const bKey = `${b.date ?? ""}T${b.time ?? ""}`;
    return bKey.localeCompare(aKey);
  });
}

export interface EvolutionPrintProgress {
  /** Citas del documento ya resueltas (incluye las vacías y las fallidas). */
  loaded: number;
  /** Citas que componen el documento. */
  total: number;
}

export interface UseEvolutionPrintParams {
  patientId: string;
  /**
   * Listado COMPLETO de citas del paciente, tal como llega del backend. El
   * documento ignora deliberadamente cualquier filtro que el usuario tenga
   * aplicado en pantalla, así que aquí no se pasa nada ya filtrado.
   */
  appointments: Appointment[];
  /**
   * Cita cuya nota se acaba de guardar por otra vía (el editor de la consulta o
   * el compositor). Misma pareja de props que consume `EvolutionColumn`.
   *
   * Es el id de la visita ESCRITA, no el de la consulta que el host resuelve
   * como activa: los dos escritores comparten el token y cualquiera de ellos
   * puede haber guardado en una consulta que se abrió desde otro dispositivo,
   * que es justo el caso en el que el id activo del host no coincide.
   */
  invalidateAppointmentId?: string;
  /** Cambia en cada guardado: es lo que dispara el descarte de esa clave. */
  invalidateToken?: number;
  /**
   * Se llama al cerrarse el diálogo de impresión que ESTE hook abrió. El host lo
   * usa para devolver el alcance a "todo": si no, tras un "Imprimir selección"
   * el documento se queda enclavado en el extracto y la siguiente copia sale
   * recortada sin que nadie lo haya pedido.
   */
  onAfterPrint?: () => void;
}

export interface UseEvolutionPrintResult {
  /**
   * Prepara el documento (carga lo que falte) y abre el diálogo de impresión.
   * Con `scopeAppointmentIds` la carga se limita a esas citas: un "Imprimir
   * selección (2)" no puede arrastrar las 100 peticiones del expediente entero.
   *
   * PRECONDICIÓN: esos ids han de ser una FOTO congelada en el mismo gesto que
   * dispara la impresión, y el documento debe pintarse desde ESA misma foto.
   * Pasarle una selección viva —la que el filtro del feed reemite en cada
   * tecla— hace que lo que entre en la selección durante los segundos de
   * preparación no se pida jamás y llegue al papel en `idle`: un fallo técnico
   * impreso en un documento clínico-legal. Si no se puede congelar, llámalo SIN
   * argumentos: cargar el expediente entero es lento, no falso.
   */
  print: (scopeAppointmentIds?: string[] | null) => void;
  /** `true` mientras se completan los registros que faltaban. */
  preparing: boolean;
  /** Avance de esa preparación, para rotular el botón que la disparó. */
  progress: EvolutionPrintProgress;
  /**
   * Estado por `appointmentId`, para que `EvolutionPrintDocument` pinte cada
   * asiento. Una clave ausente equivale a `{ status: "idle" }`.
   */
  records: Record<string, VisitRecordState>;
}

export function useEvolutionPrint({
  patientId,
  appointments,
  invalidateAppointmentId,
  invalidateToken,
  onAfterPrint,
}: UseEvolutionPrintParams): UseEvolutionPrintResult {
  const [records, setRecords] = useState<Record<string, VisitRecordState>>({});
  const [preparing, setPreparing] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [printPending, setPrintPending] = useState(false);
  /** Citas del ÚLTIMO alcance impreso; `null` hasta la primera pulsación. */
  const [scopeTotal, setScopeTotal] = useState<number | null>(null);

  /** Espejo síncrono: el pool decide sin esperar al re-render. */
  const cacheRef = useRef<Record<string, VisitRecordState>>({});
  /** Cambia con el paciente y al desmontar: invalida respuestas en vuelo. */
  const generationRef = useRef(0);
  const patientRef = useRef(patientId);
  const mountedRef = useRef(true);
  const runningRef = useRef(false);
  /** `true` sólo entre `window.print()` y su `afterprint`. */
  const printGuardRef = useRef(false);
  const afterPrintRef = useRef(onAfterPrint);
  afterPrintRef.current = onAfterPrint;

  const ordered = useMemo(
    () => orderEvolutionAppointments(appointments),
    [appointments],
  );
  const orderedRef = useRef(ordered);
  orderedRef.current = ordered;

  // Reset al cambiar de paciente, en RENDER y no en un efecto: un documento a
  // medio preparar del paciente anterior jamás debe acabar en la impresora con
  // la cabecera del nuevo.
  const [trackedPatientId, setTrackedPatientId] = useState(patientId);
  if (trackedPatientId !== patientId) {
    setTrackedPatientId(patientId);
    generationRef.current += 1;
    patientRef.current = patientId;
    cacheRef.current = {};
    runningRef.current = false;
    setRecords({});
    setPreparing(false);
    setPrintPending(false);
    setLoaded(0);
    setScopeTotal(null);
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
    };
  }, []);

  // Guarda de impresión OPT-IN. La marca se pone justo antes de `window.print()`
  // (más abajo) y se retira al cerrarse el diálogo; el documento sigue montado
  // siempre, porque la vista previa de Chrome vuelve a leer el DOM vivo cada vez
  // que se cambia el papel o los márgenes.
  useEffect(() => {
    const release = () => {
      window.document
        .querySelector(PRINT_ROOT_SELECTOR)
        ?.removeAttribute(PRINT_ACTIVE_ATTR);
      // Sólo se avisa al host si la impresión la abrió este hook: un Ctrl+P
      // sobre cualquier otra pestaña de la ficha no debe mover su estado.
      if (!printGuardRef.current) return;
      printGuardRef.current = false;
      afterPrintRef.current?.();
    };
    window.addEventListener("afterprint", release);
    return () => {
      window.removeEventListener("afterprint", release);
      window.document
        .querySelector(PRINT_ROOT_SELECTOR)
        ?.removeAttribute(PRINT_ACTIVE_ATTR);
    };
  }, []);

  // Descarte por guardado. Se tira UNA clave, no la caché entera: vaciarla
  // devolvería las 100 peticiones a cada reimpresión durante una consulta que
  // guarda varias veces. `generationRef` no se toca: invalidar por generación
  // con una carga en vuelo dejaría `runningRef` en `true` para siempre.
  const lastInvalidateTokenRef = useRef(invalidateToken);
  useEffect(() => {
    if (invalidateToken === lastInvalidateTokenRef.current) return;
    lastInvalidateTokenRef.current = invalidateToken;
    const appointmentId = invalidateAppointmentId;
    if (!appointmentId || !(appointmentId in cacheRef.current)) return;
    const next = { ...cacheRef.current };
    delete next[appointmentId];
    cacheRef.current = next;
    setRecords(next);
  }, [invalidateToken, invalidateAppointmentId]);

  const commit = useCallback(
    (appointmentId: string, next: VisitRecordState, generation: number) => {
      if (!mountedRef.current || generation !== generationRef.current) return;
      cacheRef.current = { ...cacheRef.current, [appointmentId]: next };
      setRecords(cacheRef.current);
    },
    [],
  );

  const fetchOne = useCallback(
    async (appointmentId: string): Promise<VisitRecordState> => {
      try {
        const record = await clinicalHistoryService.getVisitRecord(
          patientRef.current,
          appointmentId,
        );
        return { status: "ready", record };
      } catch (error) {
        const httpStatus = statusOf(error);
        // Un 404 NO es un fallo: es "esta visita no tiene registro creado", y
        // así se imprime. Cualquier otra cosa es un fallo técnico y se imprime
        // como tal, nunca como ausencia de dato clínico.
        if (httpStatus === 404) return { status: "empty" };
        return {
          status: "failed",
          message: httpStatus === 403 ? FORBIDDEN_FAILURE : GENERIC_FAILURE,
        };
      }
    },
    [],
  );

  const print = useCallback(
    (scopeAppointmentIds?: string[] | null) => {
      if (runningRef.current) return;

      // El alcance rige también la CARGA: sin esto, un "Imprimir selección (2)"
      // pedía igualmente el expediente entero y congelaba en la caché los 98
      // asientos que ese documento ni siquiera enseña.
      const wanted = scopeAppointmentIds?.length
        ? new Set(scopeAppointmentIds)
        : null;
      const targets = wanted
        ? orderedRef.current.filter((appointment) => wanted.has(appointment.id))
        : orderedRef.current;
      const generation = generationRef.current;

      // Sólo se piden las que aún no están resueltas: reimprimir no vuelve a
      // castigar al backend con las 100 peticiones. Los `failed` sí vuelven a
      // pedirse, porque volver a pulsar Imprimir es su único reintento.
      const pending = targets
        .map((appointment) => appointment.id)
        .filter((id) => id && !isResolved(cacheRef.current[id]));

      const settledCount = targets.length - pending.length;
      setScopeTotal(targets.length);
      setLoaded(settledCount);

      if (pending.length === 0) {
        setPrintPending(true);
        return;
      }

      runningRef.current = true;
      setPreparing(true);

      let cursor = 0;
      let done = settledCount;

      const worker = async () => {
        // `cursor++` es seguro: JS es de un solo hilo, no hay carrera aquí.
        while (cursor < pending.length) {
          const appointmentId = pending[cursor++];
          if (generation !== generationRef.current) return;
          const next = await fetchOne(appointmentId);
          if (generation !== generationRef.current) return;
          commit(appointmentId, next, generation);
          done += 1;
          if (mountedRef.current) setLoaded(done);
        }
      };

      const workers = Array.from(
        { length: Math.min(MAX_CONCURRENT, pending.length) },
        () => worker(),
      );

      void Promise.all(workers).then(() => {
        if (generation !== generationRef.current) return;
        runningRef.current = false;
        if (!mountedRef.current) return;
        setPreparing(false);
        setPrintPending(true);
      });
    },
    [commit, fetchOne],
  );

  // El diálogo se abre DESPUÉS de que React haya pintado los asientos recién
  // resueltos: `window.print()` fotografía el DOM tal como está en ese instante,
  // así que llamarlo en el mismo tick imprimiría el documento incompleto.
  useEffect(() => {
    if (!printPending) return;
    let cancelled = false;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        setPrintPending(false);
        if (typeof window === "undefined") return;
        // Encender la guarda del CSS es lo ÚLTIMO antes de abrir el diálogo: a
        // partir de aquí, y sólo hasta `afterprint`, el papel es el documento.
        window.document
          .querySelector(PRINT_ROOT_SELECTOR)
          ?.setAttribute(PRINT_ACTIVE_ATTR, "");
        printGuardRef.current = true;
        window.print();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [printPending]);

  // El total es el del ALCANCE que se está imprimiendo, no el del expediente:
  // "3 de 100" mientras se prepara una selección de 3 sería falso.
  const progress = useMemo<EvolutionPrintProgress>(
    () => ({ loaded, total: scopeTotal ?? ordered.length }),
    [loaded, scopeTotal, ordered.length],
  );

  return { print, preparing, progress, records };
}

export default useEvolutionPrint;
