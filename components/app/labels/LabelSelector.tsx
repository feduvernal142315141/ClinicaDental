"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown, Plus, Check, Tag } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useLabels } from "@/lib/hooks/labels";
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
import type { Label, LabelSummary } from "@/lib/entity/label";

interface LabelSelectorProps {
  appointmentId?: string;
  value?: string[];
  onChange?: (ids: string[]) => void;
  maxLabels?: number;
  disabled?: boolean;
  onCreateNew?: () => void;
}

export function LabelSelector({
  value = [],
  onChange,
  maxLabels = 5,
  disabled = false,
  onCreateNew,
}: LabelSelectorProps) {
  const { labels, loading } = useLabels(false);
  const [open, setOpen] = useState(false);

  // Chips seleccionados, en el mismo orden que `value`.
  const selected = useMemo(
    () =>
      value
        .map((id) => labels.find((l) => l.id === id))
        .filter((l): l is Label => Boolean(l)),
    [value, labels],
  );

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
          <Command className="bg-transparent">
            <CommandInput placeholder="Buscar etiqueta..." className="text-sm" />
            <CommandList>
              <CommandEmpty className="py-6 text-center text-sm text-subtle">
                {loading ? "Cargando..." : "Sin etiquetas"}
              </CommandEmpty>
              <CommandGroup className="p-1.5">
                {labels.map((label) => {
                  const isSelected = value.includes(label.id);
                  const isDisabled = !isSelected && atLimit;
                  return (
                    <CommandItem
                      key={label.id}
                      value={label.name}
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
                      <LabelChip label={label as LabelSummary} size="sm" />
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
