"use client";

import { useState } from "react";
import { Info, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { ODONTOGRAM_LEGEND_ITEMS } from "@/lib/odontogram/domain/odontogram/constants/odontogram-colors.constants";
import { cn } from "@/lib/utils/utils";

/**
 * Guía de estados clínicos del odontograma.
 *
 * Vive como control flotante sobre el lienzo: el panel se renderiza en un
 * portal (Popover) para que no lo recorte el `overflow-hidden` del lienzo,
 * y para heredar el cierre con Escape, el clic fuera y el manejo de foco.
 */
export function OdontogramLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "group flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium shadow-lg backdrop-blur-md transition-all hover:shadow-xl",
            "outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
            isOpen
              ? "border-brand bg-brand text-white shadow-brand/20"
              : "border-border/70 bg-surface/90 text-ink opacity-90 hover:bg-surface hover:opacity-100",
          )}
          title="Ver guía de colores y estados clínicos"
          type="button"
        >
          <Info
            className={cn(
              "h-4 w-4 transition-transform group-hover:scale-110",
              isOpen ? "text-white" : "text-brand",
            )}
          />
          <span>Estados Clínicos</span>
          <ChevronUp
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              isOpen ? "rotate-180 text-white" : "text-muted-foreground",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className="w-[min(90vw,32rem)] rounded-xl border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-md"
      >
        <h3 className="mb-3 flex items-center gap-1.5 border-b border-border/50 pb-2 text-xs font-semibold tracking-wider text-ink uppercase">
          <Info className="h-3.5 w-3.5 text-brand" />
          Guía de Estados Clínicos
        </h3>

        <div className="grid max-h-[min(50vh,20rem)] grid-cols-2 gap-2.5 overflow-y-auto pr-1 text-xs sm:grid-cols-3">
          {ODONTOGRAM_LEGEND_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 rounded p-1 transition-colors hover:bg-subtle/40"
            >
              {"gradient" in item ? (
                // Mostrar gradiente para ICDAS (caries)
                <div className="flex shrink-0 items-center gap-0.5">
                  <div
                    className="h-3.5 w-3 rounded-l border border-hairline"
                    style={{ backgroundColor: item.gradient[0] }}
                  />
                  <div
                    className="h-3.5 w-3 border-t border-b border-hairline"
                    style={{ backgroundColor: item.color }}
                  />
                  <div
                    className="h-3.5 w-3 rounded-r border border-hairline"
                    style={{ backgroundColor: item.gradient[1] }}
                  />
                </div>
              ) : "symbol" in item ? (
                // Mostrar símbolo (cruz de ausencia, ENDO, círculo de corona)
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-hairline bg-surface shadow-sm">
                  <span
                    className="leading-none font-bold"
                    style={{
                      color: item.symbolColor,
                      fontSize: item.symbol.length > 1 ? "6px" : "10px",
                    }}
                  >
                    {item.symbol}
                  </span>
                </div>
              ) : (
                // Mostrar color sólido
                <div
                  className="h-4 w-4 shrink-0 rounded border border-hairline shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="truncate text-xs leading-tight font-medium text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Nota profesional */}
        <p className="mt-3 border-t border-border/40 pt-2 text-[10px] text-subtle italic">
          * Los colores indican el estado clínico actual del diente. ICDAS:
          Sistema de detección de caries (1=inicial, 6=severa).
        </p>
      </PopoverContent>
    </Popover>
  );
}
