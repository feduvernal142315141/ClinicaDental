"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Muestra un buscador dentro del popover (combobox filtrable). */
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  id?: string;
  /** Llamado cuando el control pierde el foco (para validación onBlur de RHF). */
  onBlur?: () => void;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * Select corporativo (popover propio, sin `<select>` nativo). Listbox accesible
 * con `aria-activedescendant`, navegación por teclado, typeahead (o búsqueda
 * si `searchable`), theme-aware. forwardRef → integra con `<FormControl>`.
 */
export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  function Select(
    {
      value,
      onChange,
      options,
      placeholder = "Selecciona…",
      disabled = false,
      searchable = false,
      searchPlaceholder = "Buscar…",
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
    const baseId = id ?? `select-${reactId}`;
    const listId = `${baseId}-list`;
    const optionId = (i: number) => `${baseId}-opt-${i}`;

    const [open, setOpen] = React.useState(false);
    const [active, setActive] = React.useState(-1);
    const [query, setQuery] = React.useState("");

    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const setTriggerRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );
    const listRef = React.useRef<HTMLUListElement>(null);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const searchRef = React.useRef<HTMLInputElement>(null);
    const typeahead = React.useRef<{
      buf: string;
      t: ReturnType<typeof setTimeout> | null;
    }>({ buf: "", t: null });

    // El label del trigger se basa SIEMPRE en las opciones completas.
    const selected = options.find((o) => o.value === value);

    // Lista visible: filtrada por query sólo en modo searchable.
    const display = React.useMemo(() => {
      if (!searchable) return options;
      const q = query.trim().toLowerCase();
      if (!q) return options;
      return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query, searchable]);

    const firstEnabled = React.useCallback(
      (from: number, dir: 1 | -1) => {
        const n = display.length;
        for (let step = 0; step < n; step++) {
          const i = (((from + dir * step) % n) + n) % n;
          if (!display[i]?.disabled) return i;
        }
        return -1;
      },
      [display],
    );

    const openMenu = React.useCallback(() => {
      if (disabled) return;
      setQuery("");
      setOpen(true);
      const selIdx = options.findIndex((o) => o.value === value);
      setActive(selIdx >= 0 ? selIdx : firstEnabled(0, 1));
    }, [disabled, options, value, firstEnabled]);

    const closeMenu = React.useCallback((focusTrigger = true) => {
      setOpen(false);
      setQuery("");
      if (focusTrigger) triggerRef.current?.focus();
    }, []);

    const confirm = React.useCallback(
      (i: number) => {
        const opt = display[i];
        if (!opt || opt.disabled) return;
        onChange(opt.value);
        closeMenu();
      },
      [display, onChange, closeMenu],
    );

    // Foco al buscador al abrir (modo searchable)
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
        }
      };
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    // Scroll del item activo a la vista
    React.useEffect(() => {
      if (!open) return;
      listRef.current
        ?.querySelector('[data-active="true"]')
        ?.scrollIntoView({ block: "nearest" });
    }, [open, active]);

    const onTypeahead = (key: string) => {
      const ta = typeahead.current;
      if (ta.t) clearTimeout(ta.t);
      ta.buf += key.toLowerCase();
      const start = active >= 0 ? active : 0;
      const n = display.length;
      for (let step = 1; step <= n; step++) {
        const i = (start + step) % n;
        const o = display[i];
        if (!o.disabled && o.label.toLowerCase().startsWith(ta.buf)) {
          setActive(i);
          break;
        }
      }
      ta.t = setTimeout(() => {
        ta.buf = "";
      }, 600);
    };

    // Navegación compartida (flechas / Enter / Esc / Tab).
    const navKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActive((a) => firstEnabled(a < 0 ? 0 : a + 1, 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActive((a) => firstEnabled(a < 0 ? 0 : a - 1, -1));
          break;
        case "Home":
          e.preventDefault();
          setActive(firstEnabled(0, 1));
          break;
        case "End":
          e.preventDefault();
          setActive(firstEnabled(display.length - 1, -1));
          break;
        case "Enter":
          e.preventDefault();
          if (active >= 0) confirm(active);
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation(); // no cerrar un popover contenedor
          closeMenu();
          break;
        case "Tab":
          closeMenu(false);
          break;
      }
    };

    // Teclado del TRIGGER (incluye abrir + typeahead cuando NO es searchable).
    const onTriggerKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (!open) {
        if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
          e.preventDefault();
          openMenu();
        }
        return;
      }
      if (searchable) return; // el foco está en el buscador
      if (
        !["ArrowDown", "ArrowUp", "Home", "End", "Enter", "Escape", "Tab"].includes(
          e.key,
        ) &&
        e.key.length === 1 &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        onTypeahead(e.key);
        return;
      }
      navKeyDown(e);
    };

    const activeDescId = open && active >= 0 ? optionId(active) : undefined;

    return (
      <div ref={rootRef} className={cn("relative", className)}>
        <button
          ref={setTriggerRef}
          type="button"
          id={baseId}
          disabled={disabled}
          onClick={() => (open ? closeMenu(false) : openMenu())}
          onKeyDown={onTriggerKeyDown}
          onBlur={onBlur}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={searchable ? undefined : activeDescId}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl border bg-elevated px-3 py-2.5 text-left text-sm text-ink outline-none transition-colors",
            "focus:border-brand focus:ring-2 focus:ring-brand/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            open ? "border-brand ring-2 ring-brand/30" : "border-hairline",
            ariaInvalid && "border-rose-500/60",
          )}
        >
          <span
            className={cn(
              "flex-1 truncate",
              selected ? "text-ink" : "text-subtle",
            )}
          >
            {selected ? selected.label : placeholder}
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
                  onKeyDown={navKeyDown}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  aria-controls={listId}
                  aria-activedescendant={activeDescId}
                  className="w-full rounded-lg border border-hairline bg-elevated px-3 py-1.5 text-sm text-ink outline-none placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
              </div>
            )}
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              className="max-h-64 overflow-auto py-1"
            >
              {display.length === 0 ? (
                <li className="px-3 py-2 text-sm text-subtle">
                  {searchable && query ? "Sin resultados." : "No hay opciones."}
                </li>
              ) : (
                display.map((o, i) => {
                  const isSelected = o.value === value;
                  const isActive = i === active;
                  return (
                    <li
                      key={o.value || i}
                      id={optionId(i)}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={o.disabled || undefined}
                      data-active={isActive || undefined}
                      onMouseEnter={() => !o.disabled && setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => confirm(i)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                        o.disabled && "cursor-not-allowed text-subtle/50",
                        !o.disabled && isActive && "bg-hover",
                        !o.disabled && isSelected ? "text-brand" : "text-ink",
                      )}
                    >
                      <span className="flex-1 truncate">{o.label}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-brand" />
                      )}
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
