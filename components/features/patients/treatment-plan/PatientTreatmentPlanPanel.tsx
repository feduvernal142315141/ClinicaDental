"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AlertTriangle,
  ClipboardList,
  FilterX,
  Plus,
  RotateCw,
  SearchX,
  X,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui";
import { LoadingSpinner } from "@/components/ui/atomic/feedback/loading-spinner";
import {
  NO_PHASE_VALUE,
  useAddToPlanCatalog,
  useTreatmentPlanBoard,
  type PlanItemRow,
} from "@/lib/hooks/odontogram";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { formatClinicCurrencyExact } from "@/lib/utils/clinic-regional-format";
import { AddToPlanPanel } from "./AddToPlanPanel";
import { PlanItemRowActions } from "./PlanItemRowActions";
import { TreatmentPlanFiltersBar } from "./TreatmentPlanFiltersBar";
import { TreatmentPlanItemsTable } from "./TreatmentPlanItemsTable";

interface PatientTreatmentPlanPanelProps {
  patientId: string;
  /** Solo para la cabecera y el `<caption>`; los datos los trae el hook. */
  patientName: string;
}

/** `min-w-[50rem]` de {@link TreatmentPlanItemsTable} (creció con el menú). */
const TABLE_MIN_WIDTH_PX = 800;
/** `w-[24rem]` del `<aside>` de más abajo. */
const ADD_PANEL_WIDTH_PX = 384;
/** `gap-4` de la fila que reparte tabla y panel. */
const COLUMN_GAP_PX = 16;
/** Ancho a partir del cual caben LOS DOS sin estrujar la tabla. */
const SIDE_BY_SIDE_MIN_WIDTH_PX =
  TABLE_MIN_WIDTH_PX + COLUMN_GAP_PX + ADD_PANEL_WIDTH_PX;

/**
 * ¿Cabe el panel de "Añadir" como columna al lado de la tabla?
 *
 * Se mide el CONTENEDOR REAL, no el viewport. Entre uno y otro están la barra
 * lateral de la app (`lg:w-64`, o `lg:w-20` al colapsarla) y el padding del
 * `main` (`lg:p-6`): con el umbral de viewport anterior (`min-width: 1024px`) a
 * 1024px reales le quedaban ~320px a una tabla de 46rem, así que el panel se
 * comía justo las columnas Importe y Estado —las dos contra las que se compara
 * al presupuestar, que es la razón por la que el panel es columna y no Sheet—.
 * Medir el contenedor cubre además el colapso de la barra lateral, que el
 * viewport no ve.
 *
 * Se resuelve en un efecto y arranca en `false`: medir durante el render rompe
 * la hidratación. Como el panel solo existe cuando el usuario lo abre, el
 * primer valor nunca llega a pintarse.
 */
function useFitsSideBySide(ref: RefObject<HTMLElement | null>): boolean {
  const [fits, setFits] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width === undefined) return;
      setFits(width >= SIDE_BY_SIDE_MIN_WIDTH_PX);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return fits;
}

/**
 * El mismo valor, pero CONGELADO mientras el panel está abierto.
 *
 * `fitsSideBySide` no elige un ancho: elige QUÉ ANFITRIÓN monta el panel, el
 * `<aside>` o el `Sheet`. Solo se monta uno, y la selección vive DENTRO de
 * `AddToPlanPanel`, así que voltear el valor con el panel abierto lo desmonta y
 * lo vuelve a montar en el otro anfitrión con la selección vacía y sin un
 * aviso.
 *
 * No es teórico ni exige redimensionar la ventana: colapsar la barra lateral
 * ensancha la fila 176px de golpe (`lg:w-64` → `lg:w-20`, app-shell.tsx), así
 * que la fila cabe desde 1440px de ventana con la barra expandida y desde
 * 1264px con ella colapsada. En todo el tramo 1264–1440 —los portátiles más
 * comunes— pulsar «Colapsar menú» cruza el umbral, y colapsar el menú para
 * hacer sitio es justo lo que hace quien tiene el panel apretado.
 *
 * Congelar deja como peor caso una tabla estrujada hasta que se cierre el
 * panel; la alternativa es tirar un presupuesto a medio hacer. Al cerrarlo, el
 * valor vuelve a seguir al contenedor y la próxima apertura ya elige bien.
 */
function useFrozenWhileOpen(value: boolean, open: boolean): boolean {
  const frozen = useRef(value);
  // Escritura en render, pero idempotente y sin efectos: mientras está cerrado
  // el valor congelado ES el valor actual. Hacerlo en un efecto llegaría un
  // render tarde, y ese render es precisamente el de la apertura.
  if (!open) frozen.current = value;
  return frozen.current;
}

/** "3 líneas · 2 por pieza, 1 general". */
function buildCountsSubtitle(
  totalCount: number,
  toothCount: number,
  generalCount: number,
  excludedCount: number,
): string {
  const parts = [
    `${totalCount} ${totalCount === 1 ? "línea" : "líneas"}`,
    `${toothCount} por pieza, ${generalCount} ${
      generalCount === 1 ? "general" : "generales"
    }`,
  ];
  // Los recuentos INCLUYEN canceladas y rechazadas, pero el importe de al lado
  // las excluye. Sin este aviso, "8 líneas · 4.300" no le cuadra a nadie que
  // intente sumar las filas.
  if (excludedCount > 0) {
    parts.push(`${excludedCount} fuera del total`);
  }
  return parts.join(" · ");
}

/**
 * PatientTreatmentPlanPanel
 *
 * Pantalla del plan de tratamiento del paciente dentro de su historia clínica:
 * las líneas ya presupuestadas con sus importes congelados, y el panel para
 * añadir más.
 *
 * Un único scroll por superficie (ADR-36): el cuerpo de la tabla. Cabecera de
 * la pantalla y nota del pie quedan fuera de él; la cabecera de la tabla va
 * pegada DENTRO. El panel de "Añadir" tiene el suyo, pero es una superficie
 * HERMANA (columna al lado o Sheet encima), nunca un scroll anidado dentro del
 * de la tabla.
 *
 * Los tres estados no-felices cubren la PANTALLA ENTERA a propósito. Un bloque
 * que desaparece al fallar es indistinguible de "aquí no hay nada", y en un
 * presupuesto esa confusión se traduce en decirle al paciente que no debe nada.
 */
export function PatientTreatmentPlanPanel({
  patientId,
  patientName,
}: PatientTreatmentPlanPanelProps) {
  const {
    toothGroup,
    generalGroup,
    filters,
    loadedCount,
    totals,
    currency,
    excludedCount,
    loading,
    pendingItemIds,
    error,
    retry,
    addItems,
    updateItem,
    registerSession,
    removeItem,
  } = useTreatmentPlanBoard(patientId);

  const { isAdmin, can } = usePermission();
  /**
   * `PATCH /items/{id}/session` exige `hasAuthority('odontogram')`. Esa autoridad
   * de MÓDULO se concede en cuanto el rol tiene el módulo con cualquier acción,
   * sin mirar bits, así que se replica con el OR de las cuatro — el mismo idioma
   * que `useSidebarNavigation` (el enum es una máscara y no tiene READ).
   *
   * Hoy la pestaña entera ya se gatea con `odontogram`, así que este permiso
   * está de más en la práctica; se comprueba igual porque el endpoint de LECTURA
   * admite además el módulo `service` (`hasAnyAuthority('odontogram','service')`)
   * y en cuanto la pestaña se abra a ese rol —que puede leer el plan y editar
   * líneas— registrar sesiones seguiría siendo suyo y solo suyo.
   */
  const canRegisterSession =
    isAdmin ||
    can("odontogram", PermissionAction.CREATE) ||
    can("odontogram", PermissionAction.EDIT) ||
    can("odontogram", PermissionAction.DELETE) ||
    can("odontogram", PermissionAction.BLOCK);

  /** Fases ya presentes en el plan: el diálogo numera a partir de ellas. */
  const usedPhases = useMemo(
    () =>
      filters.phaseOptions
        .filter((option) => option.value !== NO_PHASE_VALUE)
        .map((option) => Number(option.value))
        .filter((phase) => Number.isFinite(phase)),
    [filters.phaseOptions],
  );

  const renderRowActions = useCallback(
    (row: PlanItemRow) => (
      <PlanItemRowActions
        row={row}
        currency={currency}
        usedPhases={usedPhases}
        pending={pendingItemIds.has(row.item.id)}
        canRegisterSession={canRegisterSession}
        onUpdate={updateItem}
        onRegisterSession={registerSession}
        onRemove={removeItem}
      />
    ),
    [
      canRegisterSession,
      currency,
      pendingItemIds,
      registerSession,
      removeItem,
      updateItem,
      usedPhases,
    ],
  );

  const [addOpen, setAddOpen] = useState(false);
  // El catálogo se pide desde AQUÍ y no desde el panel: así sobrevive a que el
  // panel se cierre y se vuelva a abrir (el Sheet desmonta su contenido) y no
  // se repite la petición en cada apertura.
  const catalog = useAddToPlanCatalog(addOpen);
  const rowRef = useRef<HTMLDivElement>(null);
  const fitsSideBySide = useFitsSideBySide(rowRef);
  // El anfitrión del panel NO puede cambiar con el panel abierto: cambiarlo lo
  // remonta y se lleva por delante la selección (ver `useFrozenWhileOpen`).
  const addPanelAsColumn = useFrozenWhileOpen(fitsSideBySide, addOpen);

  const asideTitleId = useId();
  const closeAddPanel = useCallback(() => setAddOpen(false), []);

  /** ¿El plan tiene alguna línea? (antes de filtrar). */
  const hasItems = loadedCount > 0;
  /** ¿Queda alguna a la vista? Con filtros puestos puede no quedar ninguna. */
  const hasVisibleItems = toothGroup.count + generalGroup.count > 0;
  const addPanel = (
    <AddToPlanPanel
      catalog={catalog}
      currency={currency}
      onAdd={addItems}
      onAdded={closeAddPanel}
    />
  );

  return (
    <>
      {/* `flex-1 min-h-0` y no `h-full`: el alto lo reparte la columna flex de
          la pestaña, y `min-h-0` es lo que permite que el contenedor de la
          tabla encoja y scrollee en vez de estirar la página entera. */}
      <div ref={rowRef} className="flex min-h-0 flex-1 gap-4">
        <section className="flex min-h-0 flex-1 flex-col gap-3">
          {loading && (
            <div className="flex min-h-[16rem] flex-1 items-center justify-center">
              <LoadingSpinner
                size="lg"
                message="Cargando plan de tratamiento..."
              />
            </div>
          )}

          {!loading && error && (
            // El fallo va en `Alert variant="destructive"` y no en un bloque
            // neutro como el estado vacío: pintados igual (mismo círculo gris,
            // mismo icono en `text-subtle`), un 500 o un "plan no activo" se
            // leen de un vistazo como "este paciente no tiene nada
            // presupuestado", que es exactamente la confusión de la que se
            // protege esta pantalla. La variante trae su tinte rose propio,
            // legible en claro Y en oscuro, y `live` ya aporta el
            // `role="alert"`.
            <div className="flex min-h-[16rem] flex-1 items-center justify-center px-6">
              <Alert variant="destructive" live className="max-w-md">
                <AlertTriangle />
                <AlertTitle>No se pudo abrir el plan de tratamiento</AlertTitle>
                <AlertDescription>
                  {/* El mensaje REAL del backend (plan no activo, permisos,
                      mezcla de monedas…). Se muestra tal cual: es lo único que
                      dice qué pasó. */}
                  <p>{error}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={retry}
                    className="mt-1 gap-2"
                  >
                    <RotateCw aria-hidden="true" className="h-4 w-4" />
                    Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {!loading && !error && (
            <>
              <header className="flex shrink-0 flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-ink">
                    Plan de tratamiento · {patientName}
                  </h2>
                  <p className="mt-0.5 text-sm text-subtle">
                    {buildCountsSubtitle(
                      totals.totalCount,
                      totals.toothCount,
                      totals.generalCount,
                      excludedCount,
                    )}
                  </p>
                </div>

                {hasItems && (
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-semibold tabular-nums text-ink">
                      {formatClinicCurrencyExact(totals.total, currency)}
                    </p>
                    <p className="text-xs tabular-nums text-subtle">
                      {formatClinicCurrencyExact(
                        totals.acceptedTotal,
                        currency,
                      )}{" "}
                      aceptados
                    </p>
                  </div>
                )}
              </header>

              {/* Barra: filtros a la izquierda, acción primaria a la derecha. */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
                {hasItems ? (
                  <TreatmentPlanFiltersBar
                    filters={filters}
                    totalCount={totals.totalCount}
                    toothCount={totals.toothCount}
                    generalCount={totals.generalCount}
                    visibleCount={toothGroup.count + generalGroup.count}
                  />
                ) : (
                  // Sin líneas no hay nada que filtrar, pero el botón de la
                  // derecha tiene que seguir en su sitio.
                  <span />
                )}

                {/* Vive en la barra y no dentro del estado vacío: hoy NINGÚN
                    plan tiene líneas, así que si el botón solo apareciera con la
                    tabla llena no habría forma de estrenar ninguno. */}
                <Button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  // Solo cuando el panel es columna: allí despliega una región
                  // de la misma página. Si entra como Sheet abre un diálogo, y
                  // anunciar "expandido" sobre él es engañoso.
                  aria-expanded={addPanelAsColumn ? addOpen : undefined}
                  className="shrink-0 gap-1.5"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Añadir al plan
                </Button>
              </div>

              {!hasItems && (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                  <div className="rounded-full bg-hover p-3">
                    <ClipboardList
                      aria-hidden="true"
                      className="h-6 w-6 text-subtle"
                    />
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    El plan aún no tiene líneas
                  </p>
                  <p className="max-w-sm text-xs text-subtle">
                    Usa «Añadir al plan» para presupuestar tratamientos. Los que
                    se marcan sobre una pieza y los servicios generales van en
                    pestañas distintas.
                  </p>
                </div>
              )}

              {/* El plan SÍ tiene líneas, pero el filtro no deja ver ninguna.
                  Pintar aquí el vacío de "el plan aún no tiene líneas" diría que
                  no hay presupuesto cuando lo que hay es un filtro puesto, y el
                  total del pie —que sigue estando— lo desmentiría. */}
              {hasItems && !hasVisibleItems && (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                  <div className="rounded-full bg-hover p-3">
                    <SearchX aria-hidden="true" className="h-6 w-6 text-subtle" />
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    Ninguna línea coincide con el filtro
                  </p>
                  <p className="max-w-sm text-xs text-subtle">
                    El plan tiene {totals.totalCount}{" "}
                    {totals.totalCount === 1 ? "línea" : "líneas"}, pero ninguna
                    cumple lo que has elegido arriba.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={filters.clearFilters}
                    className="mt-1 gap-2"
                  >
                    <FilterX aria-hidden="true" className="h-4 w-4" />
                    Quitar filtros
                  </Button>
                </div>
              )}

              {hasVisibleItems && (
                <>
                  {/* EL único contenedor con scroll de esta columna.

                      `tabIndex`/`role="region"`: cada fila ya tiene su menú, así
                      que el scroll VERTICAL se alcanza tabulando; pero la tabla
                      mide 50rem de mínimo y, cuando scrollea en horizontal, los
                      únicos focusables están en la última columna — o sea que
                      tabular arrastra siempre hacia la derecha y no hay forma de
                      volver a ver «Sobre» y «Servicio». Con la región enfocable,
                      las flechas la desplazan en los dos sentidos (WCAG 2.2 —
                      2.1.1). */}
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label="Líneas del plan de tratamiento"
                    className="min-h-0 flex-1 overflow-auto rounded-bento border border-hairline bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    <TreatmentPlanItemsTable
                      patientName={patientName}
                      toothGroup={toothGroup}
                      generalGroup={generalGroup}
                      total={totals.total}
                      currency={currency}
                      hiddenCount={filters.hiddenCount}
                      renderActions={renderRowActions}
                      pendingItemIds={pendingItemIds}
                    />
                  </div>
                </>
              )}

              {/* Atada a `hasItems`, LO MISMO que el importe grande de la
                  cabecera, y no a que la tabla se pinte: con un filtro que no
                  deja ver ninguna línea la tabla (y su pie) desaparecen, pero
                  el total de la cabecera sigue ahí. Sin esta nota el único
                  importe en pantalla quedaría sin cualificar, que es justo lo
                  que no puede pasar: no existe entidad Pago en el sistema y un
                  total sin advertencia se lee como "el paciente no debe nada"
                  y acaba en reclamación. */}
              {hasItems && (
                <p className="shrink-0 text-xs text-subtle">
                  Importe estimado — no incluye pagos.
                </p>
              )}
            </>
          )}
        </section>

        {/* Cuando caben los dos, el panel es una COLUMNA y no una capa encima:
            se presupuesta comparando con lo que ya hay en la tabla, y un Sheet
            la taparía justo mientras se decide qué añadir. Solo se ofrece si la
            tabla NO se estruja: media tabla sin las columnas Importe y Estado
            no sirve para comparar, así que ahí el Sheet es mejor trato. */}
        {addOpen && addPanelAsColumn && (
          <aside
            aria-labelledby={asideTitleId}
            className="flex w-[24rem] min-h-0 shrink-0 flex-col rounded-bento border border-hairline bg-surface"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-4">
              <div className="min-w-0">
                <h3
                  id={asideTitleId}
                  className="text-sm font-semibold text-ink"
                >
                  Añadir al plan
                </h3>
                <p className="mt-0.5 text-xs text-subtle">
                  Elige los servicios que quieres presupuestar.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddPanel}
                aria-label="Cerrar el panel de añadir al plan"
                className="-mr-1 shrink-0 rounded-lg p-1.5 text-subtle transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            {addPanel}
          </aside>
        )}
      </div>

      {/* Si no hay sitio para una columna, el mismo panel entra como Sheet.
          Solo se monta uno de los dos, así que la selección no se duplica ni se
          pierde: el anfitrión queda CONGELADO mientras el panel está abierto
          (`useFrozenWhileOpen`), de modo que ni redimensionar la ventana ni
          colapsar la barra lateral pueden remontarlo y vaciar la selección. */}
      <Sheet open={addOpen && !addPanelAsColumn} onOpenChange={setAddOpen}>
        <SheetContent
          side="right"
          className="w-full gap-0 border-hairline bg-surface p-0 sm:max-w-md"
        >
          <SheetHeader className="shrink-0 px-4 pb-2 pt-4">
            <SheetTitle className="text-sm">Añadir al plan</SheetTitle>
            <SheetDescription className="text-xs">
              Elige los servicios que quieres presupuestar.
            </SheetDescription>
          </SheetHeader>
          {addPanel}
        </SheetContent>
      </Sheet>
    </>
  );
}
