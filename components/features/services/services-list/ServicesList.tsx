"use client";

import { useEffect, useMemo, useState, useRef } from "react";

import { DataTable } from "@/components/ui/data-display/data-table";
import { useDebouncedValue } from "@/lib/hooks/useDebounce";
import { TableSearch } from "@/components/ui/data-display/table-search";
import { Checkbox } from "@/components/ui/atomic/forms/checkbox";
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

export function ServicesList({
  basePath = "/settings/services",
}: ServicesListProps) {
  const { handleEditService } = useServicesPage({ basePath });
  const { can, isAdmin } = usePermission();
  const { settings, loading: loadingSettings } = useClinicGeneralSettings();
  const currency = settings?.currency ?? DEFAULT_CLINIC_GENERAL_SETTINGS.currency;

  const { services, loading, pagination, fetchServices, toggleServiceStatus } =
    useServices();

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Fase 2 (GET semántico): la búsqueda viaja como intención plana `q` (el backend
  // barre `name`) y el estado como la faceta escalar `active`. El front ya NO arma
  // strings del dialecto de 4 segmentos para búsqueda/estado. El orden sigue por la
  // ruta estructurada (`orders`) durante la coexistencia.
  const activeOrdersRef = useRef<string[]>([]);
  const pageSizeRef = useRef(10);
  pageSizeRef.current = pagination.pageSize;

  // Faceta de estado: por defecto se ocultan los inactivos (active=true); al mostrar
  // todos se omite la faceta (patrón "Show Hidden").
  const activeFacet = showInactive ? undefined : true;

  // Intención semántica activa, persistida para paginación/orden/refetch sin
  // re-crear callbacks (survive re-renders without causing them).
  const qRef = useRef<string>("");
  qRef.current = search.trim();
  const activeFacetRef = useRef<boolean | undefined>(activeFacet);
  activeFacetRef.current = activeFacet;

  // Carga inicial + recarga al cambiar buscador/estado. El término de búsqueda se
  // debouncea (hook genérico compartido); la faceta de estado dispara de inmediato.
  // Es el único efecto de carga (evita un doble fetch en el montaje).
  const debouncedSearch = useDebouncedValue(search, 350);
  useEffect(() => {
    fetchServices({
      page: 0,
      pageSize: pageSizeRef.current,
      q: debouncedSearch.trim(),
      active: activeFacet,
      orders: activeOrdersRef.current,
    }).catch((err) => {
      notify.error(err?.message || "No se pudo cargar la lista de servicios", {
        description:
          "Revisa tu conexión e inténtalo de nuevo; si el problema persiste, contacta a soporte.",
      });
    });
  }, [debouncedSearch, activeFacet, fetchServices]);

  const canEdit = isAdmin || can("service", PermissionAction.EDIT);
  const canBlock = isAdmin || can("service", PermissionAction.BLOCK);

  const columns = useMemo(
    () =>
      getServicesColumns({
        onEdit: handleEditService,
        onToggleStatus: (id, currentlyActive) => {
          toggleServiceStatus(id, currentlyActive)
            .then(() =>
              fetchServices({
                page: 0,
                pageSize: pageSizeRef.current,
                q: qRef.current,
                active: activeFacetRef.current,
                orders: activeOrdersRef.current,
              }),
            )
            .catch(() => {});
        },
        canEdit,
        canBlock,
        currency,
      }),
    [
      handleEditService,
      toggleServiceStatus,
      fetchServices,
      canEdit,
      canBlock,
      currency,
    ],
  );

  return (
    <section className="bento space-y-4 p-4 lg:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar servicio por nombre..."
            loading={loading}
          />
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-subtle">
          <Checkbox
            checked={showInactive}
            onCheckedChange={(c) => setShowInactive(c === true)}
          />
          Mostrar inactivos
        </label>
      </div>
      <DataTable
        columns={columns}
        data={services}
        // La columna Costo depende de la moneda de la clínica: mientras esa
        // configuración no ha llegado, la tabla sigue en estado de carga para
        // no pintar los importes con la moneda de respaldo y corregirlos luego.
        loading={loading || (loadingSettings && !settings)}
        rowKey="id"
        page={pagination.page + 1}
        pageSize={pagination.pageSize}
        total={pagination.total}
        showSizeChanger={true}
        onSortChange={(field, order) => {
          activeOrdersRef.current = order
            ? servicesQuery().order(field as ServiceField, order).build().orders
            : [];
          fetchServices({
            page: 0,
            pageSize: pageSizeRef.current,
            q: qRef.current,
            active: activeFacetRef.current,
            orders: activeOrdersRef.current,
          });
        }}
        onPageChange={(page, pageSize) => {
          fetchServices({
            page: page - 1,
            pageSize,
            q: qRef.current,
            active: activeFacetRef.current,
            orders: activeOrdersRef.current,
          });
        }}
      />
    </section>
  );
}
