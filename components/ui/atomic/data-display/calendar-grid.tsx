/**
 * CALENDAR GRID ATOMIC COMPONENT
 *
 * Componente atómico para renderizar la grilla del calendario
 * Reutilizable para cualquier vista de calendario
 */

import * as React from "react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { toISODateString, isToday } from "@/lib/utils/appointment-utils";
import { cn } from "@/lib/utils/utils";

// ============================================
// TYPES
// ============================================

interface CalendarGridProps {
  /** Array de días del mes (null = espacio vacío) */
  days: (Date | null)[];

  /** Fecha seleccionada en formato ISO */
  selectedDate: string;

  /** Callback cuando se selecciona un día */
  onSelectDate: (dateStr: string) => void;

  /** Clases CSS adicionales */
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const WEEK_DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ============================================
// CALENDAR GRID
// ============================================

/**
 * Grilla de calendario con días de la semana y botones de días
 *
 * @example
 * <CalendarGrid
 *   days={getDaysInMonth(currentDate)}
 *   selectedDate="2024-12-03"
 *   onSelectDate={(date) => setSelectedDate(date)}
 * />
 */
export function CalendarGrid({
  days,
  selectedDate,
  onSelectDate,
  className,
}: CalendarGridProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Headers de días de la semana */}
      <div className="grid grid-cols-7 gap-2">
        {WEEK_DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground p-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="p-2" />;
          }

          const dateStr = toISODateString(day);
          const isSelected = dateStr === selectedDate;
          const isTodayDate = isToday(day);

          return (
            <Button
              key={index}
              variant={isSelected ? "default" : "ghost"}
              className={cn(
                "p-2 h-12 flex flex-col items-center justify-center relative",
                isTodayDate && "ring-2 ring-primary"
              )}
              onClick={() => onSelectDate(dateStr)}
            >
              <span className="text-sm">{day.getDate()}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
