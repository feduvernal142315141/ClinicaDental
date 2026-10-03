"use client";

import { Search, X } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import { PatientPicker } from "./PatientPicker";

export interface PatientFilterValue {
  id: string;
  name: string;
}

interface ListFiltersProps {
  search?: { value: string; onChange: (value: string) => void; placeholder: string };
  status?: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] };
  patient?: { value: PatientFilterValue | null; onChange: (value: PatientFilterValue | null) => void };
  range?: {
    from: string;
    to: string;
    onChange: (range: { from: string; to: string }) => void;
  };
}

export const ALL_STATUSES = "__all__";

/** Barra de filtros común de las listas de Finanzas. */
export function ListFilters({ search, status, patient, range }: ListFiltersProps) {
  return (
    <div className="bento grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4" role="search">
      {search && (
        <div className="space-y-1.5">
          <Label htmlFor="billing-search" className="text-xs text-subtle">
            Buscar
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <Input
              id="billing-search"
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.placeholder}
              className="pl-9"
            />
          </div>
        </div>
      )}
      {status && (
        <div className="space-y-1.5">
          <Label className="text-xs text-subtle">Estado</Label>
          <SearchSelect
            value={status.value}
            onChange={status.onChange}
            options={[{ value: ALL_STATUSES, label: "Todos" }, ...status.options]}
            aria-label="Estado"
          />
        </div>
      )}
      {patient && (
        <div className="space-y-1.5">
          <Label className="text-xs text-subtle">Paciente</Label>
          <PatientPicker
            value={patient.value?.id ?? ""}
            selectedName={patient.value?.name}
            onChange={patient.onChange}
          />
        </div>
      )}
      {range && (
        <div className="space-y-1.5">
          <Label className="text-xs text-subtle">Rango de fechas</Label>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="Desde"
              value={range.from}
              max={range.to || undefined}
              onChange={(event) => range.onChange({ from: event.target.value, to: range.to })}
            />
            <span className="text-subtle">–</span>
            <Input
              type="date"
              aria-label="Hasta"
              value={range.to}
              min={range.from || undefined}
              onChange={(event) => range.onChange({ from: range.from, to: event.target.value })}
            />
            {(range.from || range.to) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => range.onChange({ from: "", to: "" })}
                aria-label="Quitar rango"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
