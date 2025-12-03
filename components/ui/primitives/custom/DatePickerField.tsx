"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Label } from "@/components/ui/atomic/forms/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/primitives/shadcn/popover";
import { Calendar } from "@/components/ui/primitives/shadcn/calendar";
import { Controller } from "react-hook-form";

type DatePickerFieldProps = {
  name: string;
  control: any;
  label?: string;
  error?: string;
  required?: boolean;
  minYear?: number;
  maxDate?: Date;
  placeholder?: string;
};

export function DatePickerField({
  name,
  control,
  label = "Fecha",
  error,
  required,
  minYear = 1900,
  maxDate = new Date(),
  placeholder = "Selecciona una fecha",
}: DatePickerFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange } }) => {
        const [open, setOpen] = React.useState(false);

        const selectedDate = React.useMemo(() => {
          if (!value) return undefined;
          try {
            return parseISO(value);
          } catch {
            return undefined;
          }
        }, [value]);

        const handleSelect = (d: Date | undefined) => {
          if (!d) return;
          onChange(format(d, "yyyy-MM-dd"));
          setOpen(false);
        };

        return (
          <div className="space-y-2">
            <Label>
              {label} {required && <span className="text-destructive">*</span>}
            </Label>

            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "dd/MM/yyyy")
                  ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                  )}
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleSelect}
                  captionLayout="dropdown"
                  startMonth={new Date(minYear, 0)}
                  endMonth={maxDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
      }}
    />
  );
}
