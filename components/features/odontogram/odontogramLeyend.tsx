"use client"

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ODONTOGRAM_LEGEND_ITEMS, ODONTOGRAM_STATE_COLORS } from "@/lib/odontogram/domain/odontogram/constants/odontogram-colors.constants"

export function OdontogramLegend() {
  return (
    <div className="mt-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 text-center">
        Estados Clínicos
      </h3>
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        {ODONTOGRAM_LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            {'gradient' in item ? (
              // Mostrar gradiente para ICDAS (caries)
              <div className="flex items-center gap-0.5">
                <div
                  className="w-3 h-4 rounded-l border border-gray-300"
                  style={{ backgroundColor: item.gradient[0] }}
                />
                <div
                  className="w-3 h-4 border-t border-b border-gray-300"
                  style={{ backgroundColor: item.color }}
                />
                <div
                  className="w-3 h-4 rounded-r border border-gray-300"
                  style={{ backgroundColor: item.gradient[1] }}
                />
              </div>
            ) : (
              // Mostrar color sólido
              <div
                className="w-4 h-4 rounded border border-gray-300 shadow-sm"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-muted-foreground text-xs font-medium">
              {item.label}
            </span>
          </div>
        ))}
      </div>
      
      {/* Nota profesional */}
      <p className="text-[10px] text-center text-gray-400 mt-4 italic">
        * Los colores indican el estado clínico actual del diente. ICDAS: Sistema de detección de caries (1=inicial, 6=severa)
      </p>
    </div>
  )
}
