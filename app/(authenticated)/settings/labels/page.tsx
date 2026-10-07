"use client";

import { useState, useMemo, type ReactNode } from "react";
import {
  Pencil,
  Archive,
  Tags,
  Plus,
  Search,
  LayoutGrid,
  List,
  RotateCcw,
  X,
  ArrowUpAZ,
  Clock,
} from "lucide-react";
import {
  useLabelCatalog,
  useArchiveLabelWithUndo,
  useUnarchiveLabel,
} from "@/lib/hooks/labels";
import { LabelChip, LabelFormModal } from "@/components/app/labels";
import type { Label } from "@/lib/entity/label";
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
import { useI18n } from "@/lib/contexts/i18n-context";

// ── Tipos locales ─────────────────────────────────────────────────────────────

type StatusFilter = "active" | "archived" | "all";
type SortMode = "name" | "newest";
type ViewMode = "cards" | "list";

// ── Página ────────────────────────────────────────────────────────────────────

export default function LabelsSettingsPage() {
  const { language, t } = useI18n();
  const {
    labels,
    total,
    isComplete,
    loading,
    search: searchCatalog,
    results,
    query: search,
    loadMore,
    refetch,
  } = useLabelCatalog(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | undefined>(undefined);

  // Toolbar state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [sort, setSort] = useState<SortMode>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Hooks de acciones — instanciados en página para que el Deshacer sobreviva
  // al desmontaje de tarjetas individuales.
  const { archiveWithUndo } = useArchiveLabelWithUndo(refetch);
  const { unarchiveLabel } = useUnarchiveLabel();

  const handleNewLabel = () => {
    setEditingLabel(undefined);
    setModalOpen(true);
  };

  const handleEdit = (label: Label) => {
    setEditingLabel(label);
    setModalOpen(true);
  };

  const handleArchive = (label: Label) => archiveWithUndo(label.id, label.name);
  const handleRestore = (label: Label) => unarchiveLabel(label.id, label.name, refetch);

  // ── Filtrado y orden ─────────────────────────────────────────────────────
  // Catálogo completo en cliente (caso real, total <= CATALOG_PAGE_SIZE): todos
  // los filtros (estado, búsqueda por nombre/descripción, orden) se aplican
  // sobre `labels` — UX idéntica a la versión anterior.
  // Catálogo incompleto (total > CATALOG_PAGE_SIZE): la búsqueda ya viene
  // resuelta por el servidor en `results` (filters=name__CONTAINS__q); aquí
  // solo se aplican estado y orden sobre ese resultado.

  const filtered = useMemo(() => {
    let list = isComplete ? labels : results;

    // Estado
    if (statusFilter === "active") list = list.filter((l) => !l.isArchived);
    else if (statusFilter === "archived") list = list.filter((l) => l.isArchived);

    // Búsqueda por nombre o descripción (solo client-side; server-side ya filtró por nombre)
    const q = search.trim();
    if (isComplete && q) {
      list = list.filter(
        (l) => matchesQuery(l.name, q) || matchesQuery(l.description ?? "", q),
      );
    }

    // Orden
    const sorted = [...list];
    if (sort === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, language));
    } else {
      sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return sorted;
  }, [isComplete, labels, results, statusFilter, search, sort, language]);

  const totalByFilter = useMemo(() => {
    if (statusFilter === "active") return labels.filter((l) => !l.isArchived).length;
    if (statusFilter === "archived") return labels.filter((l) => l.isArchived).length;
    return labels.length;
  }, [labels, statusFilter]);

  const hasLabels = labels.length > 0;
  const hasSearch = search.trim().length > 0;
  const canLoadMore = !isComplete && !loading;
  const labelCount = (count: number) =>
    count === 1
      ? t("labels.count.singular").replace("{count}", String(count))
      : t("labels.count.plural").replace("{count}", String(count));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Cabecera ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">{t("labels.page.title")}</h2>
          <p className="mt-0.5 text-sm text-subtle">
            {t("labels.page.description")}
          </p>
        </div>
        <Button
          type="primary"
          onClick={handleNewLabel}
          icon={<Plus className="h-4 w-4" />}
          size="middle"
        >
          {t("labels.actions.new")}
        </Button>
      </div>

      {/* ── Toolbar ── */}
      {hasLabels && (
        <div className="mb-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Búsqueda */}
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={search}
                onChange={(e) => searchCatalog(e.target.value)}
                placeholder={t("labels.search.placeholder")}
                aria-label={t("labels.search.aria")}
                className={cn(
                  "h-9 w-full rounded-lg border border-hairline bg-surface pl-9 pr-9 text-sm text-ink placeholder:text-subtle",
                  "outline-none transition-colors focus:border-brand/60 focus:ring-2 focus:ring-brand/20",
                )}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => searchCatalog("")}
                  aria-label={t("app.search.clear")}
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
                  {t("labels.filters.active")}
                </TabsTrigger>
                <TabsTrigger value="archived" className="py-1 text-xs">
                  {t("labels.filters.archived")}
                </TabsTrigger>
                <TabsTrigger value="all" className="py-1 text-xs">
                  {t("labels.filters.all")}
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
                  {t("labels.sort.name")}
                </SelectItem>
                <SelectItem value="newest">
                  <Clock className="mr-1.5 inline h-3.5 w-3.5 text-subtle" />
                  {t("labels.sort.newest")}
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
                    aria-label={t("labels.view.cards")}
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
                <TooltipContent>{t("labels.view.cardsShort")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    aria-label={t("labels.view.list")}
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
                <TooltipContent>{t("labels.view.listShort")}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Contador de resultados */}
          <p className="text-xs text-subtle" aria-live="polite" aria-atomic>
            {!isComplete
              ? t("labels.count.partial")
                  .replace("{shown}", String(labels.length))
                  .replace("{total}", String(total))
              : hasSearch || statusFilter !== "all"
              ? filtered.length === totalByFilter
                ? labelCount(filtered.length)
                : t("labels.count.filtered")
                    .replace("{shown}", String(filtered.length))
                    .replace("{total}", labelCount(totalByFilter))
              : labelCount(filtered.length)}
            {statusFilter === "archived" && filtered.length > 0 && (
              <span className="ml-1.5 text-subtle/70">
                {t("labels.count.archivedHint")}
              </span>
            )}
          </p>
        </div>
      )}

      {/* ── Contenido ── */}
      {loading && labels.length === 0 ? (
        <LabelGridSkeleton viewMode={viewMode} />
      ) : !hasLabels ? (
        <EmptyLabels onCreate={handleNewLabel} />
      ) : filtered.length === 0 ? (
        <EmptyFiltered
          hasSearch={hasSearch}
          statusFilter={statusFilter}
          onClearSearch={() => searchCatalog("")}
          onSwitchFilter={() => setStatusFilter("all")}
        />
      ) : viewMode === "cards" ? (
        <LabelGrid>
          {filtered.map((label) => (
            <LabelCard
              key={label.id}
              label={label}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onRestore={handleRestore}
            />
          ))}
        </LabelGrid>
      ) : (
        <LabelList>
          {filtered.map((label) => (
            <LabelListRow
              key={label.id}
              label={label}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onRestore={handleRestore}
            />
          ))}
        </LabelList>
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
            {loading ? t("labels.loading") : t("labels.actions.loadMore")}
          </Button>
        </div>
      )}

      <LabelFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={refetch}
        label={editingLabel}
      />
    </>
  );
}

// ── Layout helpers ─────────────────────────────────────────────────────────────

function LabelGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {children}
    </div>
  );
}

function LabelList({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-hairline rounded-bento border border-hairline bg-surface">
      {children}
    </div>
  );
}

function LabelGridSkeleton({ viewMode }: { viewMode: ViewMode }) {
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

function EmptyLabels({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n();

  return (
    <div className="bento flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand">
        <Tags className="h-7 w-7" />
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-ink">
          {t("labels.empty.title")}
        </h3>
        <p className="mx-auto max-w-sm text-sm text-subtle">
          {t("labels.empty.description")}
        </p>
      </div>
      <Button type="primary" onClick={onCreate} icon={<Plus className="h-4 w-4" />}>
        {t("labels.actions.new")}
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
  const { t } = useI18n();
  const isArchived = statusFilter === "archived";
  const isActive = statusFilter === "active";

  return (
    <div className="rounded-bento border border-dashed border-hairline bg-surface/50 px-8 py-12 text-center">
      <span className="mb-3 inline-grid h-12 w-12 place-items-center rounded-2xl bg-elevated text-subtle">
        {hasSearch ? (
          <Search className="h-5 w-5" />
        ) : (
          <Tags className="h-5 w-5" />
        )}
      </span>
      <h3 className="mb-1 text-sm font-semibold text-ink">
        {hasSearch
          ? t("labels.emptyFiltered.noResults")
          : isArchived
          ? t("labels.emptyFiltered.noArchived")
          : isActive
          ? t("labels.emptyFiltered.noActive")
          : t("labels.emptyFiltered.noLabels")}
      </h3>
      <p className="mx-auto mb-4 max-w-xs text-xs text-subtle">
        {hasSearch
          ? t("labels.emptyFiltered.noResultsDescription")
          : isArchived
          ? t("labels.emptyFiltered.noArchivedDescription")
          : isActive
          ? t("labels.emptyFiltered.noActiveDescription")
          : t("labels.emptyFiltered.noLabelsDescription")}
      </p>
      <div className="flex items-center justify-center gap-2">
        {hasSearch && (
          <Button variant="outline" type="button" size="sm" onClick={onClearSearch}>
            {t("app.search.clear")}
          </Button>
        )}
        {(isArchived || isActive) && !hasSearch && (
          <Button variant="outline" type="button" size="sm" onClick={onSwitchFilter}>
            {t("labels.actions.viewAll")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── LabelCard (vista tarjetas) ─────────────────────────────────────────────────

interface CardProps {
  label: Label;
  onEdit: (l: Label) => void;
  onArchive: (l: Label) => void;
  onRestore: (l: Label) => void;
}

function LabelCard({ label, onEdit, onArchive, onRestore }: CardProps) {
  const { t } = useI18n();
  const isArchived = label.isArchived;

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
      {/* Acento de color */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: label.color }}
      />

      <div className="flex items-start justify-between gap-2 pt-1">
        <LabelChip label={label} size="md" />

        {isArchived ? (
          /* Tarjeta archivada: badge + botón Restaurar */
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full bg-hover px-2 py-0.5 text-[11px] font-medium text-subtle">
              {t("labels.status.archived")}
            </span>
          </div>
        ) : (
          /* Tarjeta activa: editar + archivar (hover) */
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onEdit(label)}
                  aria-label={t("labels.actions.editNamed").replace(
                    "{name}",
                    label.name,
                  )}
                  className="grid h-8 w-8 place-items-center rounded-lg text-subtle outline-none transition-colors hover:bg-hover hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/45"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t("labels.actions.edit")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onArchive(label)}
                  aria-label={t("labels.actions.archiveNamed").replace(
                    "{name}",
                    label.name,
                  )}
                  className="grid h-8 w-8 place-items-center rounded-lg text-subtle outline-none transition-colors hover:bg-amber-500/10 hover:text-amber-600 focus-visible:ring-2 focus-visible:ring-amber-400/40 dark:hover:text-amber-400"
                >
                  <Archive className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t("labels.actions.archiveTooltip")}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      <p
        className={cn(
          "line-clamp-2 text-[13px] leading-relaxed",
          label.description ? "text-subtle" : "italic text-subtle/50",
        )}
      >
        {label.description || t("labels.noDescription")}
      </p>

      {/* Restaurar — solo en archivadas, siempre visible */}
      {isArchived && (
        <div className="mt-auto pt-1">
          <button
            type="button"
            onClick={() => onRestore(label)}
            aria-label={t("labels.actions.restoreNamed").replace(
              "{name}",
              label.name,
            )}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-lg border border-hairline bg-hover px-3 py-1.5",
              "text-xs font-medium text-subtle outline-none transition-colors",
              "hover:border-brand/40 hover:bg-brand/5 hover:text-brand",
              "focus-visible:ring-2 focus-visible:ring-brand/40",
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("labels.actions.restore")}
          </button>
        </div>
      )}
    </article>
  );
}

// ── LabelListRow (vista lista compacta) ────────────────────────────────────────

function LabelListRow({ label, onEdit, onArchive, onRestore }: CardProps) {
  return (
    <CatalogListRow
      leading={
        <span
          aria-hidden
          className="mt-0.5 block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: label.color }}
        />
      }
      title={<LabelChip label={label} size="sm" />}
      description={label.description}
      archived={label.isArchived}
      entityName={label.name}
      onEdit={() => onEdit(label)}
      onArchive={() => onArchive(label)}
      onRestore={() => onRestore(label)}
    />
  );
}
