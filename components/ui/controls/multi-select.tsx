"use client";

import * as React from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { SelectOption } from "@/components/ui/controls/select";

export interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  /** Máximo de chips a mostrar en el trigger antes de resumir "+N". */
  maxTagCount?: number;
  className?: string;
  id?: string;
  /** Llamado cuando el foco abandona el componente (validación onBlur de RHF). */
  onBlur?: () => void;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * MultiSelect corporativo (popover propio, sin `<select multiple>` nativo).
 * Listbox accesible con búsqueda, navegación por teclado (aria-activedescendant)
 * y chips removibles, theme-aware vía tokens Bento. Controlado: value + onChange.
 */
export const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  function MultiSelect(
    {
      value,
      onChange,
      options,
      placeholder = "Selecciona…",
      searchPlaceholder = "Buscar…",
      disabled = false,
      searchable = true,
      maxTagCount = 4,
      className,
      id,
      onBlur,
      "aria-label": ariaLabel,
      "aria-invalid": ariaInvalid,
      "aria-describedby": ariaDescribedby,
    },
    forwardedRef,
  ) {
    const reactId = React.useId();
    const baseId = id ?? `multiselect-${reactId}`;
    const listId = `${baseId}-list`;
    const optionId = (i: number) => `${baseId}-opt-${i}`;

    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [active, setActive] = React.useState(-1);

    const rootRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const setTriggerRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );
    const searchRef = React.useRef<HTMLInputElement>(null);

    const selectedSet = React.useMemo(() => new Set(value), [value]);

    const filtered = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return options;
      return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query]);

    const selectedOptions = React.useMemo(
      () => options.filter((o) => selectedSet.has(o.value)),
      [options, selectedSet],
    );

    const openMenu = React.useCallback(() => {
      if (disabled) return;
      setOpen(true);
      setActive(-1);
    }, [disabled]);

    const closeMenu = React.useCallback((focusTrigger = true) => {
      setOpen(false);
      setQuery("");
      setActive(-1);
      if (focusTrigger) triggerRef.current?.focus();
    }, []);

    const toggle = React.useCallback(
      (val: string) => {
        if (selectedSet.has(val)) onChange(value.filter((v) => v !== val));
        else onChange([...value, val]);
        // El popover permanece abierto y el foco sigue dentro del root, así
        // que un blur nativo nunca dispara aquí. Revalidamos manualmente
        // para que RHF (mode:"onBlur") limpie un error "required" previo.
        onBlur?.();
      },
      [onChange, selectedSet, value, onBlur],
    );

    const remove = React.useCallback(
      (val: string) => onChange(value.filter((v) => v !== val)),
      [onChange, value],
    );

    // Foco al buscador al abrir
    React.useEffect(() => {
      if (open && searchable) searchRef.current?.focus();
    }, [open, searchable]);

    // Cierre por click fuera
    React.useEffect(() => {
      if (!open) return;
      const onDown = (e: MouseEvent) => {
        if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
          setOpen(false);
          setQuery("");
          setActive(-1);
        }
      };
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    // Scroll del item activo a la vista
    React.useEffect(() => {
      if (!open || active < 0) return;
      document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, open]);

    const onKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (!open) {
        if (["Enter", " ", "ArrowDown"].includes(e.key)) {
          e.preventDefault();
          openMenu();
        }
        return;
      }
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActive((a) => Math.min(a + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActive((a) => Math.max(a - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (active >= 0 && filtered[active] && !filtered[active].disabled) {
            toggle(filtered[active].value);
          }
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation(); // no cerrar un popover contenedor
          closeMenu();
          break;
        case "Tab":
          setOpen(false);
          break;
      }
    };

    // onBlur solo cuando el foco abandona TODO el componente.
    const handleRootBlur = (e: React.FocusEvent<HTMLDivElement>) => {
      if (!rootRef.current?.contains(e.relatedTarget as Node | null)) {
        onBlur?.();
      }
    };

    const activeDescId =
      open && active >= 0 ? optionId(active) : undefined;
    const visibleChips = selectedOptions.slice(0, maxTagCount);
    const overflow = selectedOptions.length - visibleChips.length;

    return (
      <div ref={rootRef} className={cn("relative", className)} onBlur={handleRootBlur}>
        <button
          ref={setTriggerRef}
          type="button"
          id={baseId}
          disabled={disabled}
          onClick={() => (open ? closeMenu(false) : openMenu())}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={searchable ? undefined : activeDescId}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl border bg-elevated px-3 py-2 text-left text-sm outline-none transition-colors",
            "focus:border-brand focus:ring-2 focus:ring-brand/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            open ? "border-brand ring-2 ring-brand/30" : "border-hairline",
            ariaInvalid && "border-rose-500/60",
          )}
        >
          <span className="flex flex-1 flex-wrap items-center gap-1.5 py-0.5">
            {selectedOptions.length === 0 ? (
              <span className="text-subtle">{placeholder}</span>
            ) : (
              <>
                {visibleChips.map((o) => (
                  <span
                    key={o.value}
                    className="inline-flex items-center gap-1 rounded-md bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand"
                  >
                    {o.label}
                    {!disabled && (
                      <button
                        type="button"
                        aria-label={`Quitar ${o.label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(o.value);
                        }}
                        className="grid h-3.5 w-3.5 place-items-center rounded-sm hover:bg-brand/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="text-xs text-subtle">+{overflow}</span>
                )}
              </>
            )}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-subtle transition-transform",
              open && "rotate-180",
            )}
          />
        </button>

        {open && (
          <div className="absolute left-0 z-50 mt-2 w-full rounded-xl border border-hairline bg-surface shadow-bento">
            {searchable && (
              <div className="border-b border-hairline p-2">
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  aria-controls={listId}
                  aria-activedescendant={activeDescId}
                  className="w-full rounded-lg border border-hairline bg-elevated px-3 py-1.5 text-sm text-ink outline-none placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
              </div>
            )}
            <ul
              id={listId}
              role="listbox"
              aria-multiselectable="true"
              aria-label={ariaLabel}
              className="max-h-60 overflow-auto py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-subtle">Sin resultados.</li>
              ) : (
                filtered.map((o, i) => {
                  const isSel = selectedSet.has(o.value);
                  const isActive = i === active;
                  return (
                    <li
                      key={o.value}
                      id={optionId(i)}
                      role="option"
                      aria-selected={isSel}
                      aria-disabled={o.disabled || undefined}
                      data-active={isActive || undefined}
                      onMouseEnter={() => !o.disabled && setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => !o.disabled && toggle(o.value)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-ink transition-colors",
                        o.disabled && "cursor-not-allowed opacity-50",
                        isActive && "bg-hover",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors",
                          isSel
                            ? "border-brand bg-brand text-white"
                            : "border-hairline bg-elevated",
                        )}
                      >
                        {isSel && <Check className="h-3 w-3" />}
                      </span>
                      <span className="flex-1 truncate">{o.label}</span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    );
  },
);
