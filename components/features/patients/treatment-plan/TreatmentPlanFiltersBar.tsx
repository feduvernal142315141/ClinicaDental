"use client";

import { useMemo } from "react";
import { FilterX } from "lucide-react";
import { Button, ToggleGroup, ToggleGroupItem } from "@/components/ui";
import { Select, type SelectOption } from "@/components/ui/controls/select";
import { cn } from "@/lib/utils/utils";
import {
  ALL_FILTER_VALUE,
  NO_PHASE_VALUE,
  type PlanFilterOption,
  type PlanScopeFilter,
  type UseTreatmentPlanFiltersResult,
} from "@/lib/hooks/odontogram";
import type { PlanItemDisplayStatus } from "@/lib/entity/odontogram";
import { formatPhase, getPlanItemStatusMeta } from "./plan-item-display";

interface TreatmentPlanFiltersBarProps {
  filters: UseTreatmentPlanFiltersResult;
  /** Contadores DEL SERVIDOR (incluyen anuladas), no de lo que se ve. */
  totalCount: number;
  toothCount: number;
  generalCount: number;
  /** Líneas visibles ahora mismo, para el "N de M". */
  visibleCount: number;
}

/** "3 líneas" / "1 línea" / "0 líneas". Subtítulo de cada opción. */
function countLabel(count: number): string {
  return `${count} ${count === 1 ? "línea" : "líneas"}`;
}

function buildPhaseSelectOptions(options: PlanFilterOption[]): SelectOption[] {
  return [
    { value: ALL_FILTER_VALUE, label: "Todas las fases" },
    ...options.map<SelectOption>((option) => ({
      value: option.value,
      label:
        option.value === NO_PHASE_VALUE
          ? "Sin fase"
          : formatPhase(Number(option.value)),
      description: countLabel(option.count),
    })),
  ];
}

function buildStatusSelectOptions(options: PlanFilterOption[]): SelectOption[] {
  return [
    { value: ALL_FILTER_VALUE, label: "Todos los estados" },
    ...options.map<SelectOption>((option) => ({
      value: option.value,
      label: getPlanItemStatusMeta(option.value as PlanItemDisplayStatus).label,
      description: countLabel(option.count),
    })),
  ];
}

/**
 * TreatmentPlanFiltersBar
 *
 * Segmentado de ámbito + desplegables de fase y estado. Filtra EN CLIENTE sobre
 * las líneas ya cargadas: el plan entero está en memoria y una ida y vuelta por
 * cada clic no compraría nada.
 *
 * Los contadores del segmentado son los DEL SERVIDOR (`totalCount`, `toothCount`,
 * `generalCount`) y por tanto incluyen las líneas anuladas, igual que el
 * subtítulo de la cabecera. No se recalculan sobre lo visible: si bailaran con
 * cada filtro dejarían de ser el mapa del plan, que es para lo que se miran.
 *
 * Los desplegables solo ofrecen valores que EXISTEN en el plan (con su
 * contador), así que una clínica que no fasea no ve seis fases vacías.
 */
export function TreatmentPlanFiltersBar({
  filters,
  totalCount,
  toothCount,
  generalCount,
  visibleCount,
}: TreatmentPlanFiltersBarProps) {
  const {
    filters: value,
    setScope,
    setPhase,
    setStatus,
    clearFilters,
    filtersActive,
    phaseOptions,
    statusOptions,
  } = filters;

  const phaseSelectOptions = useMemo(
    () => buildPhaseSelectOptions(phaseOptions),
    [phaseOptions],
  );
  const statusSelectOptions = useMemo(
    () => buildStatusSelectOptions(statusOptions),
    [statusOptions],
  );

  const scopes: Array<{ value: PlanScopeFilter; label: string; count: number }> =
    [
      { value: ALL_FILTER_VALUE, label: "Todos", count: totalCount },
      { value: "tooth", label: "Por pieza", count: toothCount },
      { value: "general", label: "Generales", count: generalCount },
    ];

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={value.scope}
        // Radix devuelve "" al pulsar el segmento ya activo. Eso aquí es "sigue
        // como estabas", no "ningún ámbito" (que vaciaría la tabla sin que nada
        // en pantalla lo explicara).
        onValueChange={(next) =>
          setScope((next || ALL_FILTER_VALUE) as PlanScopeFilter)
        }
        aria-label="Filtrar por ámbito"
        className="shrink-0"
      >
        {scopes.map((scope) => (
          <ToggleGroupItem
            key={scope.value}
            value={scope.value}
            // `h-[2.625rem]` = la altura exacta del disparador del `Select` de
            // al lado (texto de 14px + `py-2.5` + los dos bordes). Los tamaños
            // del `ToggleGroup` (h-8/h-9/h-10) no dan ninguno, y un segmentado
            // 6px más bajo que los desplegables que tiene pegados se lee como
            // un desajuste, no como jerarquía.
            //
            // `flex-none` anula el `flex-1` del primitivo (toggle-group.tsx:63),
            // que reparte el ancho a partes iguales IGNORANDO el texto y engorda
            // el control justo donde falta sitio en tablet.
            //
            // El hover se fija aquí porque la variante `outline` del primitivo
            // usa `hover:bg-accent hover:text-accent-foreground` (toggle.tsx:19)
            // y `--accent` es VIOLETA en los dos temas (globals.css:23 y :89):
            // un color que no aparece en ninguna otra parte de la pantalla,
            // pegado a un segmento activo azul marca. Mismo arreglo ya validado
            // en ServicesList.tsx. El par `data-[state=on]:hover:*` reafirma el
            // activo por especificidad (0,3,0 > 0,2,0) para que pasar el ratón
            // por encima —o dejarlo "pegado" tras un toque en tablet— no le
            // quite el azul al segmento que de verdad está activo.
            className="h-[2.625rem] flex-none gap-1.5 border-hairline px-3 text-xs font-medium text-subtle hover:bg-hover hover:text-ink data-[state=on]:border-brand-strong data-[state=on]:bg-brand-strong data-[state=on]:text-white data-[state=on]:hover:bg-brand-strong data-[state=on]:hover:text-white"
          >
            {scope.label}
            {/* La jerarquía del contador se hace con el PESO y no con el alfa:
                `opacity` sobre el segmento activo deja el número por debajo de
                AA en los dos temas. */}
            <span className="font-normal tabular-nums">{scope.count}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Select
        value={value.phase}
        onChange={setPhase}
        options={phaseSelectOptions}
        aria-label="Filtrar por fase"
        className="w-[10.5rem]"
      />

      <Select
        value={value.status}
        onChange={setStatus}
        options={statusSelectOptions}
        aria-label="Filtrar por estado"
        className="w-[11.5rem]"
      />

      {filtersActive && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1.5"
        >
          <FilterX aria-hidden="true" className="h-4 w-4" />
          Quitar filtros
        </Button>
      )}

      {/* Filtrar cambia el contenido de la tabla sin mover el foco: el
          resultado es un mensaje de estado y tiene que anunciarse (WCAG 2.2 —
          4.1.3). Cubre además el caso de cero coincidencias, que si no se lee
          igual que "este plan está vacío".

          La región se monta SIEMPRE, con filtros o sin ellos. Una región viva
          tiene que existir en el árbol de accesibilidad ANTES de que su
          contenido cambie: insertar el nodo y el texto en el mismo commit es el
          caso que los lectores se saltan, y el anuncio que importa es
          justamente el PRIMERO. Los siguientes sí se anunciaban, así que a mano
          parecía funcionar.

          Sin filtros el texto existe pero no se pinta (`sr-only`): así quitar
          el filtro también se anuncia —vaciar una región no dispara nada— y la
          barra no gana ruido visual. */}
      <p
        role="status"
        className={cn("text-xs text-subtle", !filtersActive && "sr-only")}
      >
        {filtersActive
          ? `Mostrando ${visibleCount} de ${totalCount} ${
              totalCount === 1 ? "línea" : "líneas"
            }`
          : `Sin filtros · ${totalCount} ${
              totalCount === 1 ? "línea" : "líneas"
            }`}
      </p>
    </div>
  );
}
