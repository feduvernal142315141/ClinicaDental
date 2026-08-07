"use client";

import { Fragment, type ReactNode } from "react";
import { Layers } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { formatClinicCurrencyExact } from "@/lib/utils/clinic-regional-format";
import { cn } from "@/lib/utils/utils";
import type { PlanItemGroup, PlanItemRow } from "@/lib/hooks/odontogram";
import {
  formatGroupCount,
  formatPhase,
  formatSessionsProgress,
  getPlanItemStatusMeta,
} from "./plan-item-display";

/** Columnas de la tabla. Lo usan las cabeceras de grupo y el pie. */
const COLUMN_COUNT = 6;

interface TreatmentPlanItemsTableProps {
  patientName: string;
  toothGroup: PlanItemGroup;
  generalGroup: PlanItemGroup;
  /** Total del plan TAL CUAL lo manda el servidor. Nunca la suma de las filas. */
  total: number;
  currency: string;
  /**
   * Líneas que los filtros de la barra dejan FUERA de la tabla. El pie sigue
   * pintando el total del servidor —que las incluye—, así que si no se dice
   * cuántas faltan el importe no cuadra con lo que se ve.
   */
  hiddenCount: number;
  /** Menú de la fila. La tabla no conoce las mutaciones: solo hace su hueco. */
  renderActions: (row: PlanItemRow) => ReactNode;
  /** Líneas con una mutación en vuelo: la fila se atenúa mientras dura. */
  pendingItemIds: ReadonlySet<string>;
}

/** Cabecera de columna: pegada arriba DENTRO del único contenedor con scroll. */
const HEAD_CELL =
  "sticky top-0 z-20 border-b border-hairline bg-surface px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-subtle";

/** Celda del pie: pegada abajo, mismo contenedor. */
const FOOT_CELL =
  "sticky bottom-0 z-20 border-t border-hairline bg-surface px-3 py-3";

const BODY_CELL = "border-b border-hairline px-3 py-2.5 align-top";

/**
 * Columna del menú, ANCLADA a la derecha.
 *
 * La tabla mide 50rem (800px) de mínimo y el sitio real no da: en iPad vertical
 * el `main` deja 736px (768 − `p-4`) y en horizontal 720px (1024 − `lg:w-64` −
 * `lg:p-6`). Siendo la última columna, en las dos orientaciones el menú NACE
 * fuera de pantalla: habría que arrastrar la tabla a la derecha para abrirlo en
 * CADA fila, perdiendo de vista «Sobre» y «Servicio» —o sea, sobre qué pieza se
 * está actuando— justo mientras se decide.
 *
 * El fondo es `bg-surface` OPACO y no `bg-inherit`: `--hover` es translúcido
 * (rgba .045/.05), así que heredarlo dejaría ver el texto de las celdas que
 * pasan por debajo al scrollear. El precio es que la banda de hover no tiñe la
 * columna anclada; son 4,5 puntos de alfa, imperceptibles al lado de un menú
 * inalcanzable.
 */
const STICKY_ACTIONS_CELL = "sticky right-0 w-10 bg-surface";

/**
 * `mesialOclusal` → `Mesial oclusal`. Transformación puramente tipográfica: no
 * asume vocabulario, así que sirve igual para los códigos por vista del
 * odontograma que para las siglas canónicas (M, O, D) que pueda mandar el
 * backend. Traducirlos a nombre clínico exige la arcada de la pieza
 * (palatino vs lingual) y eso vive en el módulo del odontograma, no aquí.
 */
function humanizeSurface(code: string): string {
  const spaced = code.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function ToothScopeCell({ row }: { row: PlanItemRow }) {
  const { teeth, surfaces } = row;
  const label =
    teeth.length === 0
      ? "Pieza sin especificar"
      : teeth.length === 1
        ? `Diente ${teeth[0]}`
        : `Dientes ${teeth.join(", ")}`;
  const surfacesLabel = surfaces.map(humanizeSurface).join(", ");

  return (
    <div className="flex items-start gap-2.5">
      {/* El cuadro repite el FDI que ya dice la etiqueta: se oculta al lector
          de pantalla para no leer "16, Diente 16".

          Con varias piezas lleva el "+N". El cuadro es el ancla con la que se
          escanea la columna, y un puente sobre 15-16-17 pintado como un simple
          "15" se lee como una línea de UNA pieza: en un presupuesto que el
          paciente firma, la pieza equivocada es un problema clínico y
          contractual. La lista completa sigue en la etiqueta de al lado.

          `bg-canvas` y no `bg-elevated`: en tema claro `--elevated` y
          `--surface` son EL MISMO blanco (globals.css:50-51), así que sobre el
          panel el cuadro quedaba sin relleno. */}
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center gap-0.5 rounded-lg border border-hairline bg-canvas px-1.5 text-xs font-semibold tabular-nums text-ink"
      >
        <span>{teeth.length === 0 ? "—" : teeth[0]}</span>
        {teeth.length > 1 && (
          <span className="text-[10px] font-medium text-subtle">
            +{teeth.length - 1}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {surfacesLabel && (
          <span
            className="block truncate text-xs text-subtle"
            title={surfacesLabel}
          >
            Superficies: {surfacesLabel}
          </span>
        )}
      </span>
    </div>
  );
}

function GeneralScopeCell() {
  return (
    <div className="flex items-start gap-2.5">
      {/* `bg-canvas`: en claro `elevated` === `surface` (blanco sobre blanco). */}
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-hairline bg-canvas text-subtle"
      >
        <Layers className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">General</span>
        <span className="block text-xs text-subtle">Sin pieza asociada</span>
      </span>
    </div>
  );
}

function PlanItemRowCells({
  row,
  currency,
  actions,
  pending,
}: {
  row: PlanItemRow;
  currency: string;
  actions: ReactNode;
  pending: boolean;
}) {
  const { item, countsTowardsTotal } = row;
  const status = getPlanItemStatusMeta(item.displayStatus);
  const discount = item.discountAmount ?? 0;
  const sessions = formatSessionsProgress(item);

  return (
    <tr
      // `aria-busy` y no solo la opacidad: mientras el PATCH está en vuelo la
      // fila sigue enseñando los valores VIEJOS (el importe y el estado los
      // recalcula el servidor), y eso hay que anunciarlo, no solo insinuarlo
      // con un gris.
      aria-busy={pending || undefined}
      className={cn(
        "transition-colors hover:bg-hover",
        pending && "opacity-60",
      )}
    >
      <th scope="row" className={cn(BODY_CELL, "font-normal")}>
        {item.general ? <GeneralScopeCell /> : <ToothScopeCell row={row} />}
      </th>

      <td className={BODY_CELL}>
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-sm font-semibold text-ink">
            {item.serviceName}
          </span>
          {/* Con cantidad > 1 el importe de la línea NO coincide con el precio
              de catálogo: sin este "×N" el paciente ve una cifra sin explicar. */}
          {item.quantity > 1 && (
            <span className="text-xs font-semibold tabular-nums text-subtle">
              ×{item.quantity}
            </span>
          )}
        </span>
        {item.serviceCode && (
          <span className="block text-xs text-subtle">{item.serviceCode}</span>
        )}
        {/* El servidor exige motivo para descontar (422 si falta) justamente por
            trazabilidad: esconderlo aquí tiraría ese rastro y dejaría un importe
            por debajo del catálogo sin justificación. */}
        {discount > 0 && (
          <span className="mt-0.5 block text-xs text-subtle">
            Descuento {formatClinicCurrencyExact(discount, currency)}
            {item.discountReason ? ` · ${item.discountReason}` : ""}
          </span>
        )}
      </td>

      <td className={cn(BODY_CELL, "whitespace-nowrap text-sm text-subtle")}>
        {formatPhase(item.phase)}
      </td>

      <td
        className={cn(
          BODY_CELL,
          "whitespace-nowrap text-right text-sm tabular-nums",
          countsTowardsTotal
            ? "font-medium text-ink"
            : "text-subtle line-through",
        )}
      >
        {formatClinicCurrencyExact(item.lineTotal, currency)}
        {!countsTowardsTotal && (
          <span className="sr-only"> (no suma al total del plan)</span>
        )}
      </td>

      <td className={BODY_CELL}>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        {/* Contadores del SERVIDOR (`sessionsDone`/`sessionsPlanned`). Un
            tratamiento de varias sesiones se ve "En curso" durante semanas: sin
            el "2 de 3" no hay forma de saber cuánto falta.

            `inProgress` —también derivado por el servidor— es lo que decide el
            énfasis: entre una línea a medias y una terminada o sin empezar, la
            que hay que atender hoy es la primera, y en una tabla de veinte filas
            el gris de `text-subtle` la esconde entre las demás. */}
        {sessions && (
          <span
            className={cn(
              "mt-1 block whitespace-nowrap text-xs tabular-nums",
              item.inProgress ? "font-medium text-ink" : "text-subtle",
            )}
          >
            {sessions} sesiones
          </span>
        )}
      </td>

      {/* `z-10`: por encima de las celdas normales de la fila (sin posicionar)
          y por debajo de la cabecera y del pie pegados (`z-30`). */}
      <td className={cn(BODY_CELL, STICKY_ACTIONS_CELL, "z-10 text-right")}>
        {actions}
      </td>
    </tr>
  );
}

function GroupHeaderRow({
  title,
  group,
  currency,
  note,
}: {
  title: string;
  group: PlanItemGroup;
  currency: string;
  note?: string;
}) {
  return (
    <tr>
      {/* La banda de grupo es lo que parte la tabla en dos bloques, y para eso
          tiene que DESTACAR sobre el panel. `bg-elevated` no vale: en tema
          claro `--elevated` y `--surface` son los dos 255 255 255
          (globals.css:50-51), así que la banda quedaba blanca sobre blanca y
          la agrupación desaparecía. `bg-canvas` contrasta en los dos temas
          (243 245 250 en claro, 9 13 20 en oscuro). */}
      <th
        scope="colgroup"
        colSpan={COLUMN_COUNT}
        className="border-b border-hairline bg-canvas px-3 py-2 text-left"
      >
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
            {title}
          </span>
          <span className="text-xs font-normal text-subtle">
            {formatGroupCount(group.count, group.excludedCount)} ·{" "}
            <span className="tabular-nums">
              {formatClinicCurrencyExact(group.subtotal, currency)}
            </span>
          </span>
        </span>
        {note && (
          <span className="mt-0.5 block text-[11px] font-normal normal-case text-subtle">
            {note}
          </span>
        )}
      </th>
    </tr>
  );
}

/**
 * Tabla de las líneas del plan de tratamiento.
 *
 * Es una `<table>` de verdad y no un grid de `div`s: es un documento tabular que
 * el paciente acepta, y con marcado real el lector de pantalla anuncia
 * "Importe, Diente 16" en cada celda. Las cabeceras de grupo son `<tr>` con
 * `<th colSpan>` y `scope="colgroup"`, así que "SERVICIOS GENERALES" se anuncia
 * como el encabezado del bloque en vez de como una fila de datos rota.
 *
 * Importes: se pintan con `formatClinicCurrencyExact` y la moneda CONGELADA del
 * plan; ni se convierten ni se recalculan. El pie usa el `total` del servidor,
 * NUNCA la suma de las filas.
 */
export function TreatmentPlanItemsTable({
  patientName,
  toothGroup,
  generalGroup,
  total,
  currency,
  hiddenCount,
  renderActions,
  pendingItemIds,
}: TreatmentPlanItemsTableProps) {
  const groups: Array<{ title: string; group: PlanItemGroup; note?: string }> =
    [
      { title: "Por pieza", group: toothGroup },
      {
        title: "Servicios generales",
        group: generalGroup,
        note: "No se marcan sobre el odontograma.",
      },
    ];

  return (
    <table className="w-full min-w-[50rem] border-separate border-spacing-0 text-sm">
      <caption className="sr-only">
        Líneas del plan de tratamiento de {patientName}, agrupadas en servicios
        por pieza y servicios generales. Los importes son estimados y no
        incluyen pagos.
      </caption>

      <thead>
        <tr>
          <th scope="col" className={HEAD_CELL}>
            Sobre
          </th>
          <th scope="col" className={HEAD_CELL}>
            Servicio
          </th>
          <th scope="col" className={HEAD_CELL}>
            Fase
          </th>
          <th scope="col" className={cn(HEAD_CELL, "text-right")}>
            Importe
          </th>
          <th scope="col" className={HEAD_CELL}>
            Estado
          </th>
          {/* Anclada arriba Y a la derecha, con `z-30` para quedar por encima
              tanto de las demás cabeceras (`z-20`) como de las celdas ancladas
              del cuerpo (`z-10`). */}
          <th
            scope="col"
            className={cn(HEAD_CELL, STICKY_ACTIONS_CELL, "top-0 z-30")}
          >
            {/* Columna del menú: la cabecera existe para el lector de pantalla,
                pero un rótulo "Acciones" sobre tres puntos es puro ruido. */}
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>

      <tbody>
        {groups.map(({ title, group, note }) =>
          group.count === 0 ? null : (
            <Fragment key={group.kind}>
              <GroupHeaderRow
                title={title}
                group={group}
                currency={currency}
                note={note}
              />
              {group.rows.map((row) => (
                <PlanItemRowCells
                  key={row.item.id}
                  row={row}
                  currency={currency}
                  actions={renderActions(row)}
                  pending={pendingItemIds.has(row.item.id)}
                />
              ))}
            </Fragment>
          ),
        )}
      </tbody>

      <tfoot>
        <tr>
          <th
            scope="row"
            colSpan={3}
            className={cn(FOOT_CELL, "text-left text-sm font-semibold text-ink")}
          >
            Total del plan
            {/* El total es SIEMPRE el del servidor, con el plan entero dentro.
                Filtrar esconde filas pero no cambia el presupuesto, así que sin
                esta aclaración el pie parece no cuadrar con lo que se ve —y la
                otra salida, recalcular el total con lo visible, inventaría un
                importe que el servidor no guarda. */}
            {hiddenCount > 0 && (
              <span className="mt-0.5 block text-xs font-normal text-subtle">
                Incluye {hiddenCount}{" "}
                {hiddenCount === 1 ? "línea oculta" : "líneas ocultas"} por el
                filtro.
              </span>
            )}
          </th>
          <td
            className={cn(
              FOOT_CELL,
              "whitespace-nowrap text-right text-base font-semibold tabular-nums text-ink",
            )}
          >
            {formatClinicCurrencyExact(total, currency)}
          </td>
          <td className={FOOT_CELL} />
          {/* El pie cierra la columna anclada con su propia celda en vez de un
              `colSpan`: si no, al scrollear en horizontal la franja anclada se
              cortaría justo en la última fila. */}
          <td className={cn(FOOT_CELL, STICKY_ACTIONS_CELL, "bottom-0 z-30")} />
        </tr>
      </tfoot>
    </table>
  );
}
