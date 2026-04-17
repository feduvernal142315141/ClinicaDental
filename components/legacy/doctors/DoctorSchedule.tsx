"use client";
import { Clock } from "lucide-react";
const DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

export default function DoctorSchedule({ schedule }: { schedule: unknown }) {
  return (
    <div>
      <p className="font-medium mb-2 flex items-center gap-2">
        <Clock className="h-4 w-4" /> Horarios de Atención
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {DAYS.map((day) => {
          const d = schedule[day.key];
          return (
            <div
              key={day.key}
              className={`p-2 rounded border ${
                d.enabled
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <p className="font-medium">{day.label}</p>
              {d.enabled ? (
                <p>
                  {d.startTime} - {d.endTime}
                </p>
              ) : (
                <p className="text-muted-foreground">Cerrado</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
