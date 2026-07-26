"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  Lock,
  RotateCcw,
} from "lucide-react";
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils/utils";
import { matchesQuery } from "@/lib/utils/text";
import {
  findAppointmentDate,
  formatVisitDate,
  formatVisitDateLong,
  getEligibleVisits,
  type EligibleVisit,
} from "@/lib/utils/visit-eligibility";
import type { Appointment } from "@/lib/entity/appointment/appointments";
import { VisitPickerRow } from "./VisitPickerRow";

/** A partir de este número de visitas el panel monta el buscador. */
const SEARCH_THRESHOLD = 8;
/** Tope de filas renderizadas; el resto se alcanza buscando. */
const MAX_ROWS = 40;

interface OdontogramVisitContextBarProps {
  appointments: Appointment[];
  /** Visita histórica mostrada; undefined = estado actual. */
  historicAppointmentId?: string;
  /** Consulta activa — la visita "Hoy". */
  activeAppointmentId?: string;
  onSelectVisit: (appointmentId: string) => void;
  onReturnToCurrent: () => void;
  /** Hay una visita cargándose: bloquea la superficie de selección. */
  loading?: boolean;
}

/**
 * Barra de contexto de visita del odontograma.
 *
 * Sustituye al carrusel de tarjetas (~135 px) por una fila de 49 px: dos
 * steppers, una píldora que declara qué se está viendo y, bajo demanda, un
 * panel con el historial completo. El odontograma recupera el espacio y deja
 * de competir con un bloque azul saturado.
 *
 * CONTRATO DE INTERACCIÓN (no reintroducir la autoselección):
 * la versión anterior seleccionaba la visita centrada tras un debounce de
 * 350 ms al hacer scroll. Cargar un registro clínico-legal sin un acto
 * deliberado incumple WCAG 3.2.2 (On Input) y es lo que la guía de APG
 * desaconseja cuando el panel se pide al backend. Aquí NADA carga por mover el
 * foco o el resaltado: solo el clic, `Enter` o `Espacio`. El coste —un clic por
 * visita para quien antes "pasaba" tarjetas— es deliberado.
 *
 * REGLA DE LOS STEPPERS: `‹ ›` recorren SOLO las visitas históricas y se
 * detienen en la más reciente. `›` jamás cruza de "pasado, solo lectura" a
 * "presente, editable": volver al presente exige el botón "Volver a hoy" o la
 * fila "Hoy" del panel.
 *
 * El componente NO decide si una visita "es la actual": emite el id real y el
 * anfitrión resuelve la equivalencia. Así muere la heurística
 * `idx === points.length - 1`, que dejaba inseleccionable la última visita
 * histórica cuando la consulta activa no era la más reciente.
 */
export function OdontogramVisitContextBar({
  appointments,
  historicAppointmentId,
  activeAppointmentId,
  onSelectVisit,
  onReturnToCurrent,
  loading = false,
}: OdontogramVisitContextBarProps) {
  const [open, setOpen] = useState(false);

  const visits = useMemo(
    () => getEligibleVisits(appointments, activeAppointmentId),
    [appointments, activeAppointmentId],
  );
  const historicVisits = useMemo(
    () => visits.filter((v) => !v.isActive),
    [visits],
  );

  // Con una sola visita consultable no hay nada que navegar: 0 px de barra.
  if (visits.length < 2) return null;

  const isHistoric = !!historicAppointmentId;
  const activeVisit = visits.find((v) => v.isActive);
  const currentVisit = isHistoric
    ? visits.find((v) => v.appointmentId === historicAppointmentId)
    : activeVisit;

  // Posición dentro del recorrido histórico. Viendo el presente nos situamos
  // "una después" de la última histórica, de modo que `‹` entra al historial.
  const historicIndex = isHistoric
    ? historicVisits.findIndex((v) => v.appointmentId === historicAppointmentId)
    : historicVisits.length;
  // -1 = la visita mostrada no está en el listado elegible (se abrió desde el
  // drawer una cita cancelada, p. ej.): no hay recorrido posible desde ahí.
  const isOffList = historicIndex < 0;
  const previousVisit =
    !isOffList && historicIndex > 0
      ? historicVisits[historicIndex - 1]
      : undefined;
  const nextVisit =
    !isOffList && historicIndex < historicVisits.length - 1
      ? historicVisits[historicIndex + 1]
      : undefined;
  const atMostRecentHistoric = isHistoric && !isOffList && !nextVisit;

  // La fecha es la identidad del registro: si la visita no es elegible se lee
  // igualmente de la lista completa de citas.
  const currentParsedDate =
    currentVisit?.parsedDate ??
    findAppointmentDate(appointments, historicAppointmentId);
  const currentDate = formatVisitDate(currentParsedDate);

  const commit = (appointmentId: string) => {
    setOpen(false);
    onSelectVisit(appointmentId);
  };

  const returnToCurrent = () => {
    setOpen(false);
    onReturnToCurrent();
  };

  // Etiqueta declarativa: qué se está viendo, en palabras.
  const currentLabel = loading
    ? `Cargando ${currentDate}…`
    : isHistoric
      ? currentDate
      : activeVisit
        ? "Hoy"
        : "Estado actual";
  const currentQualifier = loading
    ? null
    : isHistoric
      ? "Solo lectura"
      : activeVisit
        ? "consulta actual"
        : "última información";

  const accessibleState = isHistoric
    ? `registro del ${formatVisitDateLong(currentParsedDate)}, solo lectura`
    : activeVisit
      ? "hoy, consulta actual"
      : "estado actual del odontograma";

  // El panel lista de la visita más reciente a la más antigua y separa por año:
  // un salto de 2025 a 2026 sin marca visual es un error de lectura esperando.
  const orderedHistoric = [...historicVisits].reverse();
  const visibleHistoric = orderedHistoric.slice(0, MAX_ROWS);
  const hiddenCount = orderedHistoric.length - visibleHistoric.length;
  const groups: { year: string; items: EligibleVisit[] }[] = [];
  for (const visit of visibleHistoric) {
    const year = visit.parsedDate
      ? String(visit.parsedDate.getFullYear())
      : "Sin fecha";
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.items.push(visit);
    else groups.push({ year, items: [visit] });
  }

  const stepperClass =
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-hairline bg-surface text-subtle shadow-sm transition-colors ease-emphasized hover:bg-hover hover:text-ink disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas motion-reduce:transition-none";

  return (
    <div
      onKeyDown={(event) => {
        // Salida rápida del modo histórico sin buscar el botón con el ratón.
        if (event.key === "Escape" && !open && isHistoric) {
          event.preventDefault();
          onReturnToCurrent();
        }
      }}
      className={cn(
        "flex shrink-0 items-center gap-2 border-b border-hairline px-3 py-1 transition-colors ease-emphasized",
        // Barra hundida + controles elevados: en tema claro `surface` y
        // `elevated` son ambos blanco puro, así que la relación inversa
        // (barra `surface` + control `elevated`) sería blanco sobre blanco.
        isHistoric ? "bg-amber-500/10" : "bg-canvas",
      )}
    >
      <button
        type="button"
        onClick={() => previousVisit && commit(previousVisit.appointmentId)}
        disabled={!previousVisit || loading}
        className={stepperClass}
        aria-label="Ver la visita anterior"
        title="Ver la visita anterior"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>

      {/* El span porta el title: un <button disabled> no dispara tooltip nativo */}
      <span
        title={
          atMostRecentHistoric
            ? "Usa «Volver a hoy» para editar"
            : "Ver la visita siguiente"
        }
        className="shrink-0"
      >
        <button
          type="button"
          onClick={() => nextVisit && commit(nextVisit.appointmentId)}
          disabled={!nextVisit || loading}
          className={stepperClass}
          aria-label={
            atMostRecentHistoric
              ? "Es la visita más reciente. Usa «Volver a hoy» para editar"
              : "Ver la visita siguiente"
          }
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </span>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={loading}
            aria-haspopup="listbox"
            aria-label={`Cambiar la visita mostrada en el odontograma. Mostrando ahora: ${accessibleState}`}
            className={cn(
              "flex h-10 min-w-0 max-w-[380px] flex-1 items-center gap-2 rounded-xl border px-3 text-left text-sm shadow-sm transition-colors ease-emphasized",
              "focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
              "disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none",
              isHistoric
                ? "border-amber-400/40 bg-amber-500/15 text-amber-600 ring-1 ring-amber-400/25 dark:text-amber-300"
                : "border-hairline bg-surface text-ink hover:border-brand/40 data-[state=open]:border-brand/60 data-[state=open]:ring-2 data-[state=open]:ring-brand/30",
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : isHistoric ? (
              <Lock className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <History className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
            )}

            {!loading && (
              <span className="hidden shrink-0 text-subtle lg:inline">
                Viendo:
              </span>
            )}
            <span className="truncate font-medium">{currentLabel}</span>
            {currentQualifier && (
              <span
                className={cn(
                  "shrink-0 text-xs",
                  // "Solo lectura" es la señal clínica: no se trunca jamás.
                  isHistoric ? "font-semibold" : "hidden text-subtle sm:inline",
                )}
              >
                · {currentQualifier}
              </span>
            )}

            <ChevronDown
              className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70"
              aria-hidden
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="shadow-bento w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden border-hairline p-0"
        >
          <Command
            className="bg-transparent"
            // cmdk espera un SCORE numérico, no un booleano.
            filter={(value, search) => (matchesQuery(value, search) ? 1 : 0)}
          >
            <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-subtle uppercase">
                Historial de visitas
              </span>
              <span className="text-xs text-subtle tabular-nums">
                {visits.length} registros
              </span>
            </div>

            {visits.length >= SEARCH_THRESHOLD && (
              <CommandInput
                placeholder="Buscar por fecha, motivo o profesional…"
                className="text-sm"
              />
            )}

            <CommandList className="max-h-[420px]">
              <CommandEmpty className="py-6 text-center text-sm text-subtle">
                Ninguna visita coincide con la búsqueda
              </CommandEmpty>

              {/* Fila fija del presente: siempre alcanzable sin scrollear */}
              <CommandGroup className="sticky top-0 z-10 bg-popover p-1.5">
                <CommandItem
                  value={`hoy actual presente ${activeVisit?.appointmentId ?? "current"}`}
                  onSelect={returnToCurrent}
                  style={{ pointerEvents: "auto" }}
                  aria-current={!isHistoric ? "true" : undefined}
                  className={cn(
                    "flex min-h-[52px] items-center gap-2 rounded-lg px-3 py-2 aria-selected:bg-hover",
                    !isHistoric && "bg-hover",
                  )}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-brand">
                      {activeVisit ? "Hoy · consulta actual" : "Estado actual"}
                    </span>
                    <span className="truncate text-xs text-subtle">
                      {activeVisit
                        ? `${formatVisitDate(activeVisit.parsedDate, { weekday: true })} · editable`
                        : "Última información registrada"}
                    </span>
                  </span>
                </CommandItem>
              </CommandGroup>

              {groups.map((group) => (
                <CommandGroup
                  key={group.year}
                  heading={group.year}
                  className="p-1.5"
                >
                  {group.items.map((visit) => (
                    <VisitPickerRow
                      key={visit.appointmentId}
                      visit={visit}
                      isSelected={visit.appointmentId === historicAppointmentId}
                      onSelect={commit}
                    />
                  ))}
                </CommandGroup>
              ))}

              {hiddenCount > 0 && (
                <p className="px-3 pb-2 text-center text-xs text-subtle">
                  +{hiddenCount} más — refina la búsqueda para encontrarlas
                </p>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {isHistoric ? (
        <Button
          variant="outline"
          size="sm"
          onClick={returnToCurrent}
          className="h-10 shrink-0 border-amber-400/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-300"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Volver a hoy
        </Button>
      ) : (
        // Única prueba en reposo de que existe historial: no se oculta salvo
        // en pantallas muy estrechas, donde el conteo vive en el panel.
        <span className="ml-auto hidden shrink-0 text-xs text-subtle sm:inline">
          {visits.length} visitas registradas
        </span>
      )}
    </div>
  );
}
