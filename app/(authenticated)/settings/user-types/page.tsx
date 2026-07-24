"use client";

import { useState, useMemo, type ReactNode } from "react";
import {
  Pencil,
  Archive,
  IdCard,
  Plus,
  Search,
  LayoutGrid,
  List,
  RotateCcw,
  X,
  ArrowUpAZ,
  Clock,
  CalendarCheck2,
  CalendarOff,
} from "lucide-react";
import {
  useUserTypeCatalog,
  useArchiveUserTypeWithUndo,
  useUnarchiveUserType,
} from "@/lib/hooks/userTypes";
import { UserTypeFormModal } from "@/components/app/user-types";
import type { UserType } from "@/lib/entity/userType";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/primitives/shadcn/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/atomic/forms/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/primitives/shadcn/tooltip";
import { cn } from "@/lib/utils/utils";
import { CatalogListRow } from "@/components/app/catalog/catalog-list-row";
import { matchesQuery } from "@/lib/utils/text";

// ── Tipos locales ─────────────────────────────────────────────────────────────

type StatusFilter = "active" | "archived" | "all";
type SortMode = "name" | "newest";
type ViewMode = "cards" | "list";

// ── Página ────────────────────────────────────────────────────────────────────

export default function UserTypesSettingsPage() {
  const {
    userTypes,
    total,
    isComplete,
    loading,
    search: searchCatalog,
    results,
    query: search,
    loadMore,
    refetch,
  } = useUserTypeCatalog(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUserType, setEditingUserType] = useState<UserType | undefined>(undefined);

  // Toolbar state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [sort, setSort] = useState<SortMode>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Hooks de acciones — instanciados en página para que el Deshacer sobreviva
  // al desmontaje de tarjetas individuales.
  const { archiveWithUndo } = useArchiveUserTypeWithUndo(refetch);
  const { unarchiveUserType } = useUnarchiveUserType();

  // Tipos proveedor activos (attendsAppointments=true, no archivados) — para
  // la defensa UX del switch "Atiende citas" en el modal (último proveedor).
  const activeProviderIds = useMemo(
    () =>
      new Set(
        userTypes.filter((t) => t.attendsAppointments && !t.isArchived).map((t) => t.id),
      ),
    [userTypes],
  );
  const isLastProvider =
    !!editingUserType &&
    activeProviderIds.size === 1 &&
    activeProviderIds.has(editingUserType.id);

  const handleNewUserType = () => {
    setEditingUserType(undefined);
    setModalOpen(true);
  };

  const handleEdit = (userType: UserType) => {
    setEditingUserType(userType);
    setModalOpen(true);
  };

  const handleArchive = (userType: UserType) => archiveWithUndo(userType.id, userType.name);
  const handleRestore = (userType: UserType) =>
    unarchiveUserType(userType.id, userType.name, refetch);

  // ── Filtrado y orden ─────────────────────────────────────────────────────
  // Catálogo completo en cliente (caso real, total <= CATALOG_PAGE_SIZE): todos
  // los filtros (estado, búsqueda por nombre/descripción, orden) se aplican
  // sobre `userTypes` — UX idéntica a la versión anterior.
  // Catálogo incompleto (total > CATALOG_PAGE_SIZE): la búsqueda ya viene
  // resuelta por el servidor en `results` (filters=name__CONTAINS__q); aquí
  // solo se aplican estado y orden sobre ese resultado.

  const filtered = useMemo(() => {
    let list = isComplete ? userTypes : results;

    // Estado
    if (statusFilter === "active") list = list.filter((t) => !t.isArchived);
    else if (statusFilter === "archived") list = list.filter((t) => t.isArchived);

    // Búsqueda por nombre o descripción (solo client-side; server-side ya filtró por nombre)
    const q = search.trim();
    if (isComplete && q) {
      list = list.filter(
        (t) => matchesQuery(t.name, q) || matchesQuery(t.description ?? "", q),
      );
    }

    // Orden
    const sorted = [...list];
    if (sort === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
    } else {
      sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return sorted;
  }, [isComplete, userTypes, results, statusFilter, search, sort]);

  const totalByFilter = useMemo(() => {
    if (statusFilter === "active") return userTypes.filter((t) => !t.isArchived).length;
    if (statusFilter === "archived") return userTypes.filter((t) => t.isArchived).length;
    return userTypes.length;
  }, [userTypes, statusFilter]);

  const hasUserTypes = userTypes.length > 0;
  const hasSearch = search.trim().length > 0;
  const canLoadMore = !isComplete && !loading;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Cabecera ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Tipos de usuario</h2>
          <p className="mt-0.5 text-sm text-subtle">
            Administra los tipos de usuario (profesión/cargo) de tu clínica
          </p>
        </div>
        <Button
          type="primary"
          onClick={handleNewUserType}
          icon={<Plus className="h-4 w-4" />}
          size="middle"
        >
          Nuevo tipo de usuario
        </Button>
      </div>

      {/* ── Toolbar ── */}
      {hasUserTypes && (
        <div className="mb-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Búsqueda */}
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={search}
                onChange={(e) => searchCatalog(e.target.value)}
                placeholder="Buscar tipo de usuario..."
                aria-label="Buscar tipo de usuario por nombre o descripción"
                className={cn(
                  "h-9 w-full rounded-lg border border-hairline bg-surface pl-9 pr-9 text-sm text-ink placeholder:text-subtle",
                  "outline-none transition-colors focus:border-brand/60 focus:ring-2 focus:ring-brand/20",
                )}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => searchCatalog("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-subtle hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filtro por estado */}
            <Tabs
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <TabsList className="h-9">
                <TabsTrigger value="active" className="py-1 text-xs">
                  Activos
                </TabsTrigger>
                <TabsTrigger value="archived" className="py-1 text-xs">
                  Archivados
                </TabsTrigger>
                <TabsTrigger value="all" className="py-1 text-xs">
                  Todos
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Ordenar */}
            <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
              <SelectTrigger
                size="sm"
                className="h-9 min-w-[148px] border-hairline bg-surface text-sm text-ink"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-hairline bg-elevated text-sm">
                <SelectItem value="name">
                  <ArrowUpAZ className="mr-1.5 inline h-3.5 w-3.5 text-subtle" />
                  Nombre A–Z
                </SelectItem>
                <SelectItem value="newest">
                  <Clock className="mr-1.5 inline h-3.5 w-3.5 text-subtle" />
                  Más recientes
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Toggle vista */}
            <div className="flex items-center gap-0.5 rounded-lg border border-hairline bg-elevated p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    aria-label="Vista en tarjetas"
                    aria-pressed={viewMode === "cards"}
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40",
                      viewMode === "cards"
                        ? "bg-surface text-ink shadow-sm"
                        : "text-subtle hover:text-ink",
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Vista tarjetas</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    aria-label="Vista en lista"
                    aria-pressed={viewMode === "list"}
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40",
                      viewMode === "list"
                        ? "bg-surface text-ink shadow-sm"
                        : "text-subtle hover:text-ink",
                    )}
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Vista lista</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Contador de resultados */}
          <p className="text-xs text-subtle" aria-live="polite" aria-atomic>
            {!isComplete
              ? `${userTypes.length} de ${total} tipos de usuario`
              : hasSearch || statusFilter !== "all"
              ? filtered.length === totalByFilter
                ? `${filtered.length} ${filtered.length === 1 ? "tipo de usuario" : "tipos de usuario"}`
                : `${filtered.length} de ${totalByFilter} ${totalByFilter === 1 ? "tipo de usuario" : "tipos de usuario"}`
              : `${filtered.length} ${filtered.length === 1 ? "tipo de usuario" : "tipos de usuario"}`}
            {statusFilter === "archived" && filtered.length > 0 && (
              <span className="ml-1.5 text-subtle/70">
                — archivados (ocultos al asignar tipo a nuevos usuarios)
              </span>
            )}
          </p>
        </div>
      )}

      {/* ── Contenido ── */}
      {loading && userTypes.length === 0 ? (
        <UserTypeGridSkeleton viewMode={viewMode} />
      ) : !hasUserTypes ? (
        <EmptyUserTypes onCreate={handleNewUserType} />
      ) : filtered.length === 0 ? (
        <EmptyFiltered
          hasSearch={hasSearch}
          statusFilter={statusFilter}
          onClearSearch={() => searchCatalog("")}
          onSwitchFilter={() => setStatusFilter("all")}
        />
      ) : viewMode === "cards" ? (
        <UserTypeGrid>
          {filtered.map((userType) => (
            <UserTypeCard
              key={userType.id}
              userType={userType}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onRestore={handleRestore}
            />
          ))}
        </UserTypeGrid>
      ) : (
        <UserTypeList>
          {filtered.map((userType) => (
            <UserTypeListRow
              key={userType.id}
              userType={userType}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onRestore={handleRestore}
            />
          ))}
        </UserTypeList>
      )}

      {/* Carga incremental — solo cuando el catálogo excede CATALOG_PAGE_SIZE */}
      {!isComplete && filtered.length > 0 && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            type="button"
            size="sm"
            onClick={loadMore}
            disabled={!canLoadMore}
          >
            {loading ? "Cargando…" : "Cargar más tipos de usuario"}
          </Button>
        </div>
      )}

      <UserTypeFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={refetch}
        userType={editingUserType}
        isLastProvider={isLastProvider}
      />
    </>
  );
}

// ── Layout helpers ─────────────────────────────────────────────────────────────

function UserTypeGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {children}
    </div>
  );
}

function UserTypeList({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-hairline rounded-bento border border-hairline bg-surface">
      {children}
    </div>
  );
}

function UserTypeGridSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="flex flex-col divide-y divide-hairline rounded-bento border border-hairline bg-surface">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3" aria-hidden>
            <div className="h-5 w-5 animate-pulse rounded-full bg-hover" />
            <div className="h-5 w-24 animate-pulse rounded-full bg-hover" />
            <div className="h-3.5 flex-1 animate-pulse rounded bg-hover" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bento flex flex-col gap-3 p-4" aria-hidden>
          <div className="h-6 w-28 animate-pulse rounded-full bg-hover" />
          <div className="h-3 w-full animate-pulse rounded bg-hover" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-hover" />
        </div>
      ))}
    </div>
  );
}

// ── Estados vacíos ─────────────────────────────────────────────────────────────

function EmptyUserTypes({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="bento flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand">
        <IdCard className="h-7 w-7" />
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-ink">Aún no hay tipos de usuario</h3>
        <p className="mx-auto max-w-sm text-sm text-subtle">
          Crea el primer tipo (ej. Dentista, Recepcionista) para clasificar al
          personal de tu clínica y definir quién atiende citas.
        </p>
      </div>
      <Button type="primary" onClick={onCreate} icon={<Plus className="h-4 w-4" />}>
        Nuevo tipo de usuario
      </Button>
    </div>
  );
}

function EmptyFiltered({
  hasSearch,
  statusFilter,
  onClearSearch,
  onSwitchFilter,
}: {
  hasSearch: boolean;
  statusFilter: StatusFilter;
  onClearSearch: () => void;
  onSwitchFilter: () => void;
}) {
  const isArchived = statusFilter === "archived";
  const isActive = statusFilter === "active";

  return (
    <div className="rounded-bento border border-dashed border-hairline bg-surface/50 px-8 py-12 text-center">
      <span className="mb-3 inline-grid h-12 w-12 place-items-center rounded-2xl bg-elevated text-subtle">
        {hasSearch ? (
          <Search className="h-5 w-5" />
        ) : (
          <IdCard className="h-5 w-5" />
        )}
      </span>
      <h3 className="mb-1 text-sm font-semibold text-ink">
        {hasSearch
          ? "Sin resultados para esa búsqueda"
          : isArchived
          ? "No hay tipos de usuario archivados"
          : isActive
          ? "No hay tipos de usuario activos"
          : "No hay tipos de usuario"}
      </h3>
      <p className="mx-auto mb-4 max-w-xs text-xs text-subtle">
        {hasSearch
          ? "Prueba con otro término o limpia el filtro de búsqueda."
          : isArchived
          ? "Los tipos archivados se muestran aquí. Puedes archivar cualquier tipo activo."
          : isActive
          ? "Todos tus tipos de usuario están archivados. Puedes restaurarlos desde el filtro «Archivados»."
          : "No hay tipos de usuario que coincidan con los filtros activos."}
      </p>
      <div className="flex items-center justify-center gap-2">
        {hasSearch && (
          <Button variant="outline" type="button" size="sm" onClick={onClearSearch}>
            Limpiar búsqueda
          </Button>
        )}
        {(isArchived || isActive) && !hasSearch && (
          <Button variant="outline" type="button" size="sm" onClick={onSwitchFilter}>
            Ver todos los tipos de usuario
          </Button>
        )}
      </div>
    </div>
  );
}

// ── ProviderBadge ────────────────────────────────────────────────────────────

function ProviderBadge({ attendsAppointments }: { attendsAppointments: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        attendsAppointments
          ? "bg-brand/10 text-brand"
          : "bg-hover text-subtle",
      )}
    >
      {attendsAppointments ? (
        <CalendarCheck2 className="h-3 w-3" />
      ) : (
        <CalendarOff className="h-3 w-3" />
      )}
      {attendsAppointments ? "Atiende citas" : "No atiende citas"}
    </span>
  );
}

// ── UserTypeCard (vista tarjetas) ───────────────────────────────────────────────

interface CardProps {
  userType: UserType;
  onEdit: (t: UserType) => void;
  onArchive: (t: UserType) => void;
  onRestore: (t: UserType) => void;
}

function UserTypeCard({ userType, onEdit, onArchive, onRestore }: CardProps) {
  const isArchived = userType.isArchived;

  return (
    <article
      className={cn(
        "bento group relative flex h-full flex-col gap-3 overflow-hidden p-4",
        "transition-[transform,box-shadow] duration-200 ease-emphasized",
        isArchived
          ? "opacity-60"
          : "hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-20px_rgba(16,24,40,0.5)]",
      )}
    >
      {/* Acento */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          userType.attendsAppointments ? "bg-brand" : "bg-subtle/40",
        )}
      />

      <div className="flex items-start justify-between gap-2 pt-1">
        <h3 className="truncate text-sm font-semibold text-ink" title={userType.name}>
          {userType.name}
        </h3>

        {isArchived ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full bg-hover px-2 py-0.5 text-[11px] font-medium text-subtle">
              Archivado
            </span>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onEdit(userType)}
                  aria-label={`Editar ${userType.name}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-subtle outline-none transition-colors hover:bg-hover hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/45"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onArchive(userType)}
                  aria-label={`Archivar ${userType.name}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-subtle outline-none transition-colors hover:bg-amber-500/10 hover:text-amber-600 focus-visible:ring-2 focus-visible:ring-amber-400/40 dark:hover:text-amber-400"
                >
                  <Archive className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Archivar — se ocultará al asignar tipo a nuevos usuarios
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      <ProviderBadge attendsAppointments={userType.attendsAppointments} />

      <p
        className={cn(
          "line-clamp-2 text-[13px] leading-relaxed",
          userType.description ? "text-subtle" : "italic text-subtle/50",
        )}
      >
        {userType.description || "Sin descripción"}
      </p>

      {/* Restaurar — solo en archivados, siempre visible */}
      {isArchived && (
        <div className="mt-auto pt-1">
          <button
            type="button"
            onClick={() => onRestore(userType)}
            aria-label={`Restaurar ${userType.name}`}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-lg border border-hairline bg-hover px-3 py-1.5",
              "text-xs font-medium text-subtle outline-none transition-colors",
              "hover:border-brand/40 hover:bg-brand/5 hover:text-brand",
              "focus-visible:ring-2 focus-visible:ring-brand/40",
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar tipo de usuario
          </button>
        </div>
      )}
    </article>
  );
}

// ── UserTypeListRow (vista lista compacta) ──────────────────────────────────────

function UserTypeListRow({ userType, onEdit, onArchive, onRestore }: CardProps) {
  return (
    <CatalogListRow
      leading={
        <span
          aria-hidden
          className={cn(
            "mt-0.5 block h-2.5 w-2.5 rounded-full",
            userType.attendsAppointments ? "bg-brand" : "bg-subtle/40",
          )}
        />
      }
      title={
        <span className="truncate text-sm font-medium text-ink" title={userType.name}>
          {userType.name}
        </span>
      }
      meta={<ProviderBadge attendsAppointments={userType.attendsAppointments} />}
      description={userType.description}
      archived={userType.isArchived}
      entityName={userType.name}
      onEdit={() => onEdit(userType)}
      onArchive={() => onArchive(userType)}
      onRestore={() => onRestore(userType)}
    />
  );
}
