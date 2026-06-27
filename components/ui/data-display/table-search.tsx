"use client";

import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/utils";

interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  className?: string;
}

/**
 * Buscador de tablas (reemplaza TableSearchBar de antd). El debounce lo maneja
 * el componente padre. Tokens Bento: `bg-elevated` + borde hairline + focus brand.
 */
export function TableSearch({
  value,
  onChange,
  placeholder = "Buscar…",
  loading,
  className,
}: TableSearchProps) {
  return (
    <div className={cn("flex justify-end", className)}>
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-hairline bg-elevated py-2 pl-9 pr-9 text-sm text-ink outline-none transition-colors placeholder:text-subtle focus:border-brand/40 focus:ring-2 focus:ring-brand/15"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-subtle" />
        ) : (
          value && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => onChange("")}
              className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-subtle hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
