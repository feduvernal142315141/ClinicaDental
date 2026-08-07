"use client";

import { Fragment, type ReactNode } from "react";
import { Layers, Stethoscope, type LucideIcon } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { formatClinicCurrencyExact } from "@/lib/utils/clinic-regional-format";
import { cn } from "@/lib/utils/utils";
import type { PlanItemGroup, PlanItemRow } from "@/lib/hooks/odontogram";
import {
  formatGroupCount,
  formatSessionsProgress,
  getPlanItemStatusMeta,
} from "./plan-item-display";

/** Columnas de la tabla. Lo usan las cabeceras de grupo y el pie. */
const COLUMN_COUNT = 5;

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
  /**
   * Estado y prioridad como PROPIEDADES INLINE (skill `ui-interacciones`): el
   * host inyecta los disparadores y la tabla solo los coloca. Sin ellos cae a
   * la pill estática — la vista de solo lectura del futuro no necesita más.
   */
  renderStatus?: (row: PlanItemRow) => ReactNode;
  renderPriority?: (row: PlanItemRow) => ReactNode;
  /** Líneas con una mutación en vuelo: la fila se atenúa mientras dura. */
  pendingItemIds: ReadonlySet<string>;
}

/** Cabecera de columna: pegada arriba DENTRO del único contenedor con scroll. */
const HEAD_CELL =
  "sticky top-0 z-20 border-b border-hairline bg-canvas px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-subtle";

/** Celda del pie: pegada abajo, mismo contenedor. */
const FOOT_CELL =
  "sticky bottom-0 z-20 border-t border-hairline bg-canvas px-3 py-3";

const BODY_CELL = "border-b border-hairline px-3 py-2.5 align-middle";

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
        {/* Secundario a propósito: el texto fuerte de la fila es el SERVICIO.
            El ancla visual de esta celda es el cuadro del FDI. */}
        <span className="block text-sm text-subtle">{label}</span>
        {/* Siempre presente: sin superficies el diseño pone "Pieza completa".
            Ocultarlo dejaba un hueco y hacía que la fila cambiara de alto según
            tuviera superficies o no. */}
        <span
          className="block truncate text-xs text-subtle"
          title={surfacesLabel || undefined}
        >
          {surfacesLabel ? `Superficies: ${surfacesLabel}` : "Pieza completa"}
        </span>
      </span>
    </div>
  );
}

function GeneralScopeCell({ sessionsPlanned }: { sessionsPlanned: number }) {
  return (
    <div className="flex items-start gap-2.5">
      {/* Acento CIAN, no neutro. En el diseño el cuadro general es lo único
          teñido de la fila, y es lo que hace que el bloque de servicios
          generales se lea como un bloque aparte sin necesidad de leerlo. El
          token es `info`: globals.css:170 documenta que "el accent cian es
          info", y en oscuro vale 34 211 238, el hex exacto de la referencia.
          Solo tiñe icono y borde: en claro `info` es cyan-600 (3,3:1), que vale
          para gráfico pero no para texto pequeño. */}
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-info/25 bg-info/10 text-info"
      >
        <Layers className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-subtle">General</span>
        {/* El diseño pone aquí el ALCANCE de la línea ("Toda la boca",
            "Estudio", "Por sesión · 4"). El contrato no manda el alcance, pero
            SÍ las sesiones, así que se recupera el único de los tres que
            tenemos con dato real en vez de repetir una constante muda. */}
        <span className="block text-xs text-subtle">
          {sessionsPlanned > 1
            ? `Por sesión · ${sessionsPlanned}`
            : "Sin pieza asociada"}
        </span>
      </span>
    </div>
  );
}

function PlanItemRowCells({
  row,
  currency,
  actions,
  pending,
  renderStatus,
  renderPriority,
}: {
  row: PlanItemRow;
  currency: string;
  actions: ReactNode;
  pending: boolean;
  renderStatus?: (row: PlanItemRow) => ReactNode;
  renderPriority?: (row: PlanItemRow) => ReactNode;
}) {
  const { item, countsTowardsTotal } = row;
  const status = getPlanItemStatusMeta(item.status);
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
        {item.general ? (
          <GeneralScopeCell sessionsPlanned={item.sessionsPlanned} />
        ) : (
          <ToothScopeCell row={row} />
        )}
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
        {renderStatus ? (
          renderStatus(row)
        ) : (
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        )}
        {/* Contadores del SERVIDOR (`sessionsDone`/`sessionsPlanned`). Un
            tratamiento de varias sesiones se ve "En curso" durante semanas: sin
            el "2 de 3" no hay forma de saber cuánto falta.

            `inProgress` —también derivado por el servidor— es lo que decide el
            énfasis: entre una línea a medias y una terminada o sin empezar, la
            que hay que atender hoy es la primera, y en una tabla de veinte filas
            el gris de `text-subtle` la esconde entre las demás. */}
        {(renderPriority || sessions) && (
          <span className="mt-1 flex items-center gap-2 whitespace-nowrap">
            {renderPriority?.(row)}
            {sessions && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  item.inProgress ? "font-medium text-ink" : "text-subtle",
                )}
              >
                {sessions} sesiones
              </span>
            )}
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
  icon: Icon,
  iconClassName,
}: {
  title: string;
  group: PlanItemGroup;
  currency: string;
  note?: string;
  icon: LucideIcon;
  iconClassName?: string;
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
        <span className="flex flex-wrap items-center gap-x-2">
          {/* Icono de banda: es lo que hace que los dos bloques se distingan de
              un vistazo sin leer el rótulo. Cian en el general, por el mismo
              motivo que el cuadro de alcance. */}
          <Icon
            aria-hidden="true"
            className={cn("h-3.5 w-3.5 shrink-0", iconClassName)}
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
            {title}
          </span>
          <span className="text-xs font-normal text-subtle">
            {formatGroupCount(group.count, group.excludedCount)} ·{" "}
            <span className="tabular-nums">
              {formatClinicCurrencyExact(group.subtotal, currency)}
            </span>
          </span>
          {/* A la DERECHA de la misma banda, como el diseño. Debajo duplicaba
              la altura de la banda general y desalineaba los dos grupos.
              Se oculta en estrecho antes que partir la banda en dos líneas. */}
          {note && (
            <span className="ml-auto hidden text-[11px] font-normal normal-case text-subtle sm:inline">
              {note}
            </span>
          )}
        </span>
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
  renderStatus,
  renderPriority,
  pendingItemIds,
}: TreatmentPlanItemsTableProps) {
  const groups: Array<{
    title: string;
    group: PlanItemGroup;
    note?: string;
    icon: LucideIcon;
    iconClassName?: string;
  }> = [
    { title: "Por pieza", group: toothGroup, icon: Stethoscope },
    {
      title: "Servicios generales",
      group: generalGroup,
      note: "No se marcan sobre el odontograma.",
      icon: Layers,
      iconClassName: "text-info",
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
        {groups.map(({ title, group, note, icon, iconClassName }) =>
          group.count === 0 ? null : (
            <Fragment key={group.kind}>
              <GroupHeaderRow
                title={title}
                group={group}
                currency={currency}
                note={note}
                icon={icon}
                iconClassName={iconClassName}
              />
              {group.rows.map((row) => (
                <PlanItemRowCells
                  key={row.item.id}
                  row={row}
                  currency={currency}
                  actions={renderActions(row)}
                  pending={pendingItemIds.has(row.item.id)}
                  renderStatus={renderStatus}
                  renderPriority={renderPriority}
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
