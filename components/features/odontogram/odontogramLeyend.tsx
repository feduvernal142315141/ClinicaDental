"use client";

import { useState } from "react";
import { Info, X, ChevronUp } from "lucide-react";
import { ODONTOGRAM_LEGEND_ITEMS } from "@/lib/odontogram/domain/odontogram/constants/odontogram-colors.constants";
import { cn } from "@/lib/utils/utils";

export function OdontogramLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-30">
      {/* Panel flotante expandido */}
      {isOpen && (
        <div className="absolute bottom-12 left-0 z-40 w-[90vw] max-w-lg p-4 rounded-xl bg-surface/95 backdrop-blur-md border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/50">
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-brand" />
              Guía de Estados Clínicos
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-ink hover:bg-subtle/80 transition-colors"
              title="Cerrar guía de estados"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1 text-xs">
            {ODONTOGRAM_LEGEND_ITEMS.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 p-1 rounded hover:bg-subtle/40 transition-colors"
              >
                {"gradient" in item ? (
                  // Mostrar gradiente para ICDAS (caries)
                  <div className="flex items-center gap-0.5 shrink-0">
                    <div
                      className="w-3 h-3.5 rounded-l border border-hairline"
                      style={{ backgroundColor: item.gradient[0] }}
                    />
                    <div
                      className="w-3 h-3.5 border-t border-b border-hairline"
                      style={{ backgroundColor: item.color }}
                    />
                    <div
                      className="w-3 h-3.5 rounded-r border border-hairline"
                      style={{ backgroundColor: item.gradient[1] }}
                    />
                  </div>
                ) : "symbol" in item ? (
                  // Mostrar símbolo (cruz de ausencia, ENDO, círculo de corona)
                  <div className="w-4 h-4 rounded border border-hairline shadow-sm flex items-center justify-center bg-surface shrink-0">
                    <span
                      className="font-bold leading-none"
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
                    className="w-4 h-4 rounded border border-hairline shadow-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="text-muted-foreground text-xs font-medium leading-tight truncate">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Nota profesional */}
          <p className="text-[10px] text-subtle mt-3 pt-2 border-t border-border/40 italic">
            * Los colores indican el estado clínico actual del diente. ICDAS:
            Sistema de detección de caries (1=inicial, 6=severa).
          </p>
        </div>
      )}

      {/* Botón flotante para expandir/colapsar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-full px-3.5 py-2 shadow-lg backdrop-blur-md border border-border/70 text-xs font-medium transition-all hover:shadow-xl outline-none group",
          isOpen
            ? "bg-brand text-brand-foreground border-brand shadow-brand/20 shadow-lg"
            : "bg-surface/90 text-ink hover:bg-surface opacity-90 hover:opacity-100"
        )}
        title="Ver guía de colores y estados clínicos"
        type="button"
      >
        <Info
          className={cn(
            "h-4 w-4 transition-transform group-hover:scale-110",
            isOpen ? "text-brand-foreground" : "text-brand"
          )}
        />
        <span>Estados Clínicos</span>
        <ChevronUp
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            isOpen ? "rotate-180 text-brand-foreground" : "text-muted-foreground"
          )}
        />
      </button>
    </div>
  );
}
