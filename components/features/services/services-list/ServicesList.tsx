"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";

import { DataTable } from "@/components/ui/data-display/data-table";
import { useDebouncedValue } from "@/lib/hooks/useDebounce";
import { TableSearch } from "@/components/ui/data-display/table-search";
import { Checkbox } from "@/components/ui/atomic/forms/checkbox";
// Exportados por el barrel `@/components/ui`; se importan por su ruta canónica
// para no arrastrar el barrel entero al bundle de cliente (igual que el resto
// de imports de este archivo).
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/primitives/shadcn/toggle-group";
import { useServices } from "@/lib/hooks/services/useServices";
import { useServicesPage } from "@/lib/hooks/services/use-services-page";
import { useClinicGeneralSettings } from "@/lib/hooks/settings";
import { DEFAULT_CLINIC_GENERAL_SETTINGS } from "@/lib/entity/settings";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { servicesQuery, type ServiceField } from "@/lib/query/domains/services";
import { getServicesColumns } from "../table/services-table.config";
import { notify } from "@/lib/utils/notify";

interface ServicesListProps {
  basePath?: string;
}

/** Faceta de la barra de chips: dónde se planifica el servicio. */
type PlacementFacet = "all" | "odontogram" | "general";

const PLACEMENT_OPTIONS: { value: PlacementFacet; label: string }[] = [
  { value: "all", label: "Todos" },
  // Etiquetas cortas y alineadas con los chips de la columna "Visible en
  // odontograma" de la propia tabla ("Odontograma" / "General"): el eje ya
  // queda nombrado por el aria-label del grupo y por la cabecera de columna.
  { value: "odontogram", label: "Odontograma" },
  { value: "general", label: "Generales" },
];

export function ServicesList({
  basePath = "/settings/services",
}: ServicesListProps) {
  const { handleEditService } = useServicesPage({ basePath });
  const { can, isAdmin } = usePermission();
  const { settings, loading: loadingSettings } = useClinicGeneralSettings();
  const currency = settings?.currency ?? DEFAULT_CLINIC_GENERAL_SETTINGS.currency;

  const {
    services,
    loading,
    pagination,
    fetchServices,
    toggleServiceStatus,
    setOdontogramVisibility,
  } = useServices();

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [placement, setPlacement] = useState<PlacementFacet>("all");
  const [pendingOdontogramIds, setPendingOdontogramIds] = useState<Set<string>>(
    () => new Set(),
  );

  // El controller de servicios SOLO declara filters/orders/page/pageSize: los
  // parámetros planos (q/active/odontogramEnabled/sort) los descartaba Spring en
  // silencio y el buscador no filtraba nada. Toda la intención viaja ahora por la
  // ruta estructurada que arma `servicesQuery()`. No hace falta filtrar en cliente:
  // CONTAINS_IGNORE_CASE aplica unaccent(lower(...)) en columna y patrón, así que
  // "protesis" encuentra "Prótesis".
  const activeOrdersRef = useRef<string[]>([]);
  const pageSizeRef = useRef(10);
  pageSizeRef.current = pagination.pageSize;

  // El término se debouncea; las facetas (estado / ubicación) disparan al instante.
  const debouncedSearch = useDebouncedValue(search, 350);

  const filters = useMemo(() => {
    const q = servicesQuery().search(debouncedSearch);
    // Por defecto se ocultan los inactivos; al mostrar todos se omite la faceta
    // (patrón "Show Hidden").
    if (!showInactive) q.active(true);
    if (placement === "odontogram") q.odontogramEnabled(true);
    if (placement === "general") q.odontogramEnabled(false);
    return q.build().filters;
  }, [debouncedSearch, showInactive, placement]);

  // Filtros vigentes, para refetch desde callbacks sin re-crearlos en cada cambio.
  const filtersRef = useRef<string[]>(filters);
  filtersRef.current = filters;

  // Faceta y paginación vigentes: los callbacks asíncronos (el switch) no pueden
  // leer el valor capturado en su clausura, que puede ser de hace varios clics.
  const placementRef = useRef(placement);
  placementRef.current = placement;
  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;

  const reload = useCallback(
    (page = 0, pageSize = pageSizeRef.current) =>
      fetchServices({
        page,
        pageSize,
        filters: filtersRef.current,
        orders: activeOrdersRef.current,
      }),
    [fetchServices],
  );

  // Carga inicial + recarga al cambiar buscador/facetas. Único efecto de carga
  // (evita el doble fetch en el montaje).
  useEffect(() => {
    fetchServices({
      page: 0,
      pageSize: pageSizeRef.current,
      filters,
      orders: activeOrdersRef.current,
    }).catch((err) => {
      notify.error(err?.message || "No se pudo cargar la lista de servicios", {
        description:
          "Revisa tu conexión e inténtalo de nuevo; si el problema persiste, contacta a soporte.",
      });
    });
  }, [filters, fetchServices]);

  const canEdit = isAdmin || can("service", PermissionAction.EDIT);
  const canBlock = isAdmin || can("service", PermissionAction.BLOCK);

  const handleToggleOdontogram = useCallback(
    (id: string, next: boolean) => {
      setPendingOdontogramIds((prev) => new Set(prev).add(id));
      setOdontogramVisibility(id, next)
        .then((ok) => {
          // Con una faceta de ubicación activa la fila deja de pertenecer al
          // listado filtrado: se recarga para que desaparezca de verdad.
          // Recarga la página VIGENTE, no la primera: `reload()` por defecto va
          // a page=0, así que conmutar un servicio desde la página 4 devolvía al
          // usuario al principio de la lista en cada clic.
          if (ok && placementRef.current !== "all") {
            return reload(paginationRef.current.page);
          }
        })
        .catch(() => {})
        .finally(() =>
          setPendingOdontogramIds((prev) => {
            const nextSet = new Set(prev);
            nextSet.delete(id);
            return nextSet;
          }),
        );
    },
    [setOdontogramVisibility, reload],
  );

  const columns = useMemo(
    () =>
      getServicesColumns({
        onEdit: handleEditService,
        onToggleStatus: (id, currentlyActive) => {
          toggleServiceStatus(id, currentlyActive)
            .then(() => reload())
            .catch(() => {});
        },
        onToggleOdontogram: handleToggleOdontogram,
        canEdit,
        canBlock,
        pendingOdontogramIds,
        currency,
      }),
    [
      handleEditService,
      toggleServiceStatus,
      handleToggleOdontogram,
      reload,
      canEdit,
      canBlock,
      pendingOdontogramIds,
      currency,
    ],
  );

  return (
    <section className="bento space-y-4 p-4 lg:p-5">
      {/*
        Barra de filtros en UNA sola fila, con el patrón canónico de las listas
        del proyecto (ver DoctorsList): faceta a la izquierda, búsqueda a la
        derecha. Apila en vertical por debajo de `lg`, donde los tres controles
        no caben sin comprimir el buscador.
      */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ToggleGroup
          type="single"
          variant="outline"
          value={placement}
          // `type="single"` devuelve "" al re-pulsar el chip activo: se ignora
          // para que la barra siempre tenga exactamente una opción marcada.
          onValueChange={(v) => {
            if (v) setPlacement(v as PlacementFacet);
          }}
          aria-label="Filtrar servicios por dónde se planifican"
          className="h-9 shrink-0 self-start rounded-xl lg:self-auto"
        >
          {PLACEMENT_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              // `flex-none` anula el `flex-1` del primitivo compartido
              // (toggle-group.tsx:63), que reparte el ancho a partes iguales
              // IGNORANDO el texto: con etiquetas de largos distintos la más
              // larga se desbordaba sobre la vecina. `whitespace-nowrap` evita
              // que se parta en dos líneas y rompa la altura de la fila.
              // h-9 (36px) supera el mínimo de 24x24 CSS px de WCAG 2.2 (2.5.8).
              //
              // Los colores se fijan aquí porque la variante `outline` del
              // primitivo usa los tokens LEGACY (input/accent/muted), no los
              // Bento: `--input` es blanco puro sobre el `surface` blanco del
              // card (borde invisible, falla 1.4.11), y su `hover:bg-accent`
              // pinta exactamente igual que `data-[state=on]` (imposible saber
              // qué faceta está activa mientras el ratón está encima).
              className="h-9 flex-none whitespace-nowrap border-hairline px-3.5 text-xs font-medium text-subtle first:rounded-l-xl last:rounded-r-xl hover:bg-hover hover:text-ink data-[state=on]:bg-brand data-[state=on]:text-white"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar servicio por nombre..."
            loading={loading}
            className="sm:w-72"
          />
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-subtle">
            <Checkbox
              checked={showInactive}
              onCheckedChange={(c) => setShowInactive(c === true)}
            />
            Mostrar inactivos
          </label>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={services}
        // La columna Costo depende de la moneda de la clínica: mientras esa
        // configuración no ha llegado, la tabla sigue en estado de carga para
        // no pintar los importes con la moneda de respaldo y corregirlos luego.
        loading={loading || (loadingSettings && !settings)}
        rowKey="id"
        // Ahora que el buscador filtra de verdad (antes el backend descartaba
        // `q` en silencio y la lista siempre venía entera), el "sin resultados"
        // pasa a ser un camino habitual y merece copy propio.
        emptyText={
          search
            ? `No se encontraron servicios para «${search}».`
            : "Aún no hay servicios registrados."
        }
        page={pagination.page + 1}
        pageSize={pagination.pageSize}
        total={pagination.total}
        showSizeChanger={true}
        onSortChange={(field, order) => {
          activeOrdersRef.current = order
            ? servicesQuery().order(field as ServiceField, order).build().orders
            : [];
          reload();
        }}
        onPageChange={(page, pageSize) => {
          reload(page - 1, pageSize);
        }}
      />
    </section>
  );
}
