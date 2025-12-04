/**
 * CALENDAR HEADER ATOMIC COMPONENT
 *
 * Componente atómico para el header del calendario con navegación
 * Reutilizable para cualquier vista de calendario
 */

import * as React from "react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonthYear } from "@/lib/utils/appointment-utils";
import { cn } from "@/lib/utils/utils";

// ============================================
// TYPES
// ============================================

interface CalendarHeaderProps {
  /** Fecha actual del calendario */
  currentDate: Date;

  /** Callback para navegar al mes anterior */
  onPreviousMonth: () => void;

  /** Callback para navegar al mes siguiente */
  onNextMonth: () => void;

  /** Clases CSS adicionales */
  className?: string;
}

// ============================================
// CALENDAR HEADER
// ============================================

/**
 * Header de calendario con título del mes/año y botones de navegación
 *
 * @example
 * <CalendarHeader
 *   currentDate={new Date()}
 *   onPreviousMonth={() => navigateMonth("prev")}
 *   onNextMonth={() => navigateMonth("next")}
 * />
 */
export function CalendarHeader({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  className,
}: CalendarHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h3 className="text-lg font-semibold capitalize">
        {formatMonthYear(currentDate)}
      </h3>

      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousMonth}
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextMonth}
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
