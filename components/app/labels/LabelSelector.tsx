"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown, Plus, Check, Tag } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useLabelCatalog } from "@/lib/hooks/labels";
import { LabelChip } from "./LabelChip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/primitives/shadcn/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/primitives/shadcn/command";
import type { LabelSummary } from "@/lib/entity/label";

// Cap de opciones visibles en el desplegable (seleccionadas primero). Mismo
// criterio que el sidebar de filtros — evita renderizar de golpe las ~200
// etiquetas de la primera carga del catálogo.
const VISIBLE_OPTIONS_CAP = 24;

interface LabelSelectorProps {
  appointmentId?: string;
  value?: string[];
  onChange?: (ids: string[]) => void;
  maxLabels?: number;
  disabled?: boolean;
  onCreateNew?: () => void;
  /**
   * Etiquetas ya asignadas (ej. `appointment.labels`), tal cual llegan del
   * recurso padre. Garantiza que sus chips se rendericen siempre aunque el
   * catálogo paginado (`useLabelCatalog`, primera carga = 200) aún no las
   * haya cargado o la búsqueda activa las haya filtrado.
   */
  assignedLabels?: LabelSummary[];
}

export function LabelSelector({
  value = [],
  onChange,
  maxLabels = 5,
  disabled = false,
  onCreateNew,
  assignedLabels = [],
}: LabelSelectorProps) {
  const { labels, loading, search, results, query } = useLabelCatalog(false);
  const [open, setOpen] = useState(false);

  // Etiquetas conocidas por id: catálogo cargado (más fresco) + las ya
  // asignadas que traiga el padre (garantía de render aunque no estén en la
  // página cargada del catálogo).
  const knownLabelsMap = useMemo(() => {
    const map = new Map<string, LabelSummary>();
    assignedLabels.forEach((l) => map.set(l.id, l));
    labels.forEach((l) => map.set(l.id, l));
    return map;
  }, [assignedLabels, labels]);

  // Chips seleccionados, en el mismo orden que `value`.
  const selected = useMemo(
    () =>
      value
        .map((id) => knownLabelsMap.get(id))
        .filter((l): l is LabelSummary => Boolean(l)),
    [value, knownLabelsMap],
  );

  // Opciones del desplegable: resultados de la búsqueda (client o server,
  // según decida el hook) + cualquier seleccionada ausente de esa página,
  // seleccionadas primero, con cap de render.
  const optionPool = useMemo(() => {
    const selectedIds = new Set(value);
    const missingSelected = selected.filter(
      (l) => !results.some((r) => r.id === l.id),
    );
    const selectedInResults = results.filter((l) => selectedIds.has(l.id));
    const rest = results.filter((l) => !selectedIds.has(l.id));
    return [...missingSelected, ...selectedInResults, ...rest];
  }, [results, value, selected]);

  const visibleOptions = optionPool.slice(0, VISIBLE_OPTIONS_CAP);
  const hiddenCount = optionPool.length - visibleOptions.length;

  const atLimit = value.length >= maxLabels;

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange?.(value.filter((v) => v !== id));
    } else if (!atLimit) {
      onChange?.([...value, id]);
    }
  };

  const remove = (id: string) => onChange?.(value.filter((v) => v !== id));

  return (
    <div className="flex flex-col gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {/* Trigger como div (no button) para poder anidar los chips removibles
              sin botones dentro de botones (HTML inválido). */}
          <div
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen((o) => !o);
              }
            }}
            className={cn(
              "flex min-h-10 w-full cursor-pointer items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-left text-sm transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
              "hover:border-brand/40",
              "data-[state=open]:border-brand/60 data-[state=open]:ring-2 data-[state=open]:ring-brand/30",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <span className="flex flex-1 flex-wrap items-center gap-1.5">
              {selected.length === 0 ? (
                <span className="text-subtle">Seleccionar etiquetas...</span>
              ) : (
                selected.map((label) => (
                  <LabelChip
                    key={label.id}
                    label={label}
                    size="xs"
                    removable={!disabled}
                    onRemove={() => remove(label.id)}
                  />
                ))
              )}
            </span>
            <ChevronsUpDown
              className="h-4 w-4 shrink-0 text-subtle"
              aria-hidden
            />
          </div>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] overflow-hidden border-hairline bg-elevated p-0 shadow-bento"
        >
          {/* shouldFilter=false: el filtrado ya lo resuelve useLabelCatalog
              (client-side instantáneo o server-side con debounce cuando el
              catálogo excede CATALOG_PAGE_SIZE); dejar el filtro propio de
              cmdk activo pelearía contra ese resultado durante el debounce. */}
          <Command className="bg-transparent" shouldFilter={false}>
            <CommandInput
              placeholder="Buscar etiqueta..."
              className="text-sm"
              value={query}
              onValueChange={search}
            />
            <CommandList>
              <CommandEmpty className="py-6 text-center text-sm text-subtle">
                {loading ? "Cargando..." : "Sin etiquetas"}
              </CommandEmpty>
              <CommandGroup className="p-1.5">
                {visibleOptions.map((label) => {
                  const isSelected = value.includes(label.id);
                  const isDisabled = !isSelected && atLimit;
                  return (
                    <CommandItem
                      key={label.id}
                      value={label.id}
                      disabled={isDisabled}
                      onSelect={() => toggle(label.id)}
                      // cmdk 1.x emite data-disabled="false" en TODOS los ítems y el
                      // primitive aplica pointer-events:none por selector de presencia,
                      // bloqueando el clic. Mismo workaround que combobox.tsx.
                      style={{ pointerEvents: "auto" }}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 aria-selected:bg-hover",
                        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40",
                      )}
                    >
                      <LabelChip label={label} size="sm" />
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0 text-brand transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                        aria-hidden
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {hiddenCount > 0 && (
                <p className="px-3 pb-2 text-center text-xs text-subtle">
                  +{hiddenCount} más — refina la búsqueda para encontrarlas
                </p>
              )}
            </CommandList>

            {onCreateNew && (
              <div className="border-t border-hairline p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onCreateNew();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-brand outline-none transition-colors hover:bg-brand/10 focus-visible:ring-2 focus-visible:ring-brand/45"
                >
                  <Plus className="h-4 w-4" />
                  Nueva etiqueta
                </button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>

      {atLimit && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <Tag className="h-3 w-3" aria-hidden />
          Límite de {maxLabels} etiquetas por cita alcanzado.
        </p>
      )}
    </div>
  );
}
