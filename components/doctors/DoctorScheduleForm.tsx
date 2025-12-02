"use client";

import { Controller, Control } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

interface DoctorScheduleFormProps {
  control: Control<any>;
}

export function DoctorScheduleForm({ control }: DoctorScheduleFormProps) {
  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Horarios de Atención</Label>
      <div className="space-y-3">
        {DAYS.map((day) => (
          <Controller
            key={day.key}
            name={`schedule.${day.key}`}
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="flex items-center space-x-2 min-w-[100px]">
                  <Switch
                    checked={field.value.enabled}
                    onCheckedChange={(val) =>
                      field.onChange({ ...field.value, enabled: val })
                    }
                  />
                  <Label className="text-sm">{day.label}</Label>
                </div>

                {field.value.enabled && (
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={field.value.startTime}
                      onChange={(e) =>
                        field.onChange({
                          ...field.value,
                          startTime: e.target.value,
                        })
                      }
                      className="border rounded px-2 py-1 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">a</span>
                    <input
                      type="time"
                      value={field.value.endTime}
                      onChange={(e) =>
                        field.onChange({
                          ...field.value,
                          endTime: e.target.value,
                        })
                      }
                      className="border rounded px-2 py-1 text-sm"
                    />

                    <div className="flex items-center gap-2 ml-4">
                      <Label className="text-xs text-muted-foreground">
                        Descanso:
                      </Label>
                      <input
                        type="time"
                        value={field.value.breakStart || ""}
                        onChange={(e) =>
                          field.onChange({
                            ...field.value,
                            breakStart: e.target.value,
                          })
                        }
                        className="border rounded px-2 py-1 text-sm"
                      />
                      <input
                        type="time"
                        value={field.value.breakEnd || ""}
                        onChange={(e) =>
                          field.onChange({
                            ...field.value,
                            breakEnd: e.target.value,
                          })
                        }
                        className="border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          />
        ))}
      </div>
    </div>
  );
}
