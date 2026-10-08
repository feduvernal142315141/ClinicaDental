"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  LEAD_TEMPERATURES,
  LEAD_TEMPERATURE_LABELS,
  LEAD_UNCLASSIFIED_LABEL,
  type LeadSource,
  type LeadStage,
} from "@/lib/entity/leads";
import {
  LEAD_FILTER_NONE,
  countActiveLeadFilters,
  useLeadServiceOptions,
  useLeadUserOptions,
  type LeadFilterState,
  type LeadView,
} from "@/lib/hooks/leads";
import { cn } from "@/lib/utils/utils";

const ALL = "__all__";

interface LeadFiltersBarProps {
  state: LeadFilterState;
  view: LeadView;
  search: string;
  onSearchChange: (value: string) => void;
  onChange: (patch: Partial<LeadFilterState>) => void;
  onReset: () => void;
}

function DateRange({
  label,
  from,
  to,
  onChange,
}: {
  label: string;
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs text-subtle">{label}</legend>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label={`${label}: desde`}
          value={from}
          max={to || undefined}
          onChange={(event) => onChange({ from: event.target.value, to })}
        />
        <span className="text-subtle" aria-hidden>
          –
        </span>
        <Input
          type="date"
          aria-label={`${label}: hasta`}
          value={to}
          min={from || undefined}
          onChange={(event) => onChange({ from, to: event.target.value })}
        />
      </div>
    </fieldset>
  );
}

/** Barra de filtros compartida por el tablero y la lista (su estado vive en la URL). */
export function LeadFiltersBar({ state, view, search, onSearchChange, onChange, onReset }: LeadFiltersBarProps) {
  const users = useLeadUserOptions();
  const services = useLeadServiceOptions();
  const hasAdvanced = !!(state.createdFrom || state.createdTo || state.activityFrom || state.activityTo);
  const [advanced, setAdvanced] = useState(hasAdvanced);
  // En móvil los selectores se pliegan para que el tablero quede a la vista.
  const [expanded, setExpanded] = useState(false);
  const active = countActiveLeadFilters({ ...state, q: search }, view);

  const pick = (value: string) => (value === ALL ? "" : value);
  const collapsed = expanded ? "" : "hidden md:block";

  return (
    <div className="bento space-y-3 p-4" role="search" aria-label="Filtros de prospectos">
      <div className={cn("grid gap-3 md:grid-cols-2", view === "list" ? "xl:grid-cols-6" : "xl:grid-cols-5")}>
        <div className="space-y-1.5">
          <Label htmlFor="lead-search" className="text-xs text-subtle">
            Buscar
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <Input
              id="lead-search"
              value={search}
              maxLength={100}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Nombre, teléfono o correo"
              className="pl-9"
            />
          </div>
        </div>

        {view === "list" && (
          <div className={cn("space-y-1.5", collapsed)}>
            <Label className="text-xs text-subtle">Etapa</Label>
            <SearchSelect
              value={state.stage || ALL}
              onChange={(value) => onChange({ stage: pick(value) as LeadStage | "" })}
              options={[
                { value: ALL, label: "Todas" },
                ...LEAD_STAGES.map((stage) => ({ value: stage, label: LEAD_STAGE_LABELS[stage] })),
              ]}
              aria-label="Etapa"
            />
          </div>
        )}

        <div className={cn("space-y-1.5", collapsed)}>
          <Label className="text-xs text-subtle">Temperatura</Label>
          <SearchSelect
            value={state.temperature || ALL}
            onChange={(value) => onChange({ temperature: pick(value) as LeadFilterState["temperature"] })}
            options={[
              { value: ALL, label: "Todas" },
              ...LEAD_TEMPERATURES.map((value) => ({ value, label: LEAD_TEMPERATURE_LABELS[value] })),
              { value: LEAD_FILTER_NONE, label: LEAD_UNCLASSIFIED_LABEL },
            ]}
            aria-label="Temperatura"
          />
        </div>

        <div className={cn("space-y-1.5", collapsed)}>
          <Label className="text-xs text-subtle">Origen</Label>
          <SearchSelect
            value={state.source || ALL}
            onChange={(value) => onChange({ source: pick(value) as LeadSource | "" })}
            options={[
              { value: ALL, label: "Todos" },
              ...LEAD_SOURCES.map((value) => ({ value, label: LEAD_SOURCE_LABELS[value] })),
            ]}
            aria-label="Origen"
          />
        </div>

        <div className={cn("space-y-1.5", collapsed)}>
          <Label className="text-xs text-subtle">Responsable</Label>
          <SearchSelect
            value={state.assignee || ALL}
            onChange={(value) => onChange({ assignee: pick(value) })}
            options={[
              { value: ALL, label: "Todos" },
              { value: LEAD_FILTER_NONE, label: "Sin asignar" },
              ...(users.data ?? []).map((user) => ({ value: user.id, label: user.name })),
            ]}
            searchable
            searchPlaceholder="Buscar persona…"
            aria-label="Responsable"
          />
        </div>

        <div className={cn("space-y-1.5", collapsed)}>
          <Label className="text-xs text-subtle">Servicio de interés</Label>
          <SearchSelect
            value={state.service || ALL}
            onChange={(value) => onChange({ service: pick(value) })}
            options={[
              { value: ALL, label: "Todos" },
              ...(services.data ?? []).map((service) => ({ value: service.id, label: service.name })),
            ]}
            searchable
            searchPlaceholder="Buscar servicio…"
            aria-label="Servicio de interés"
          />
        </div>
      </div>

      {advanced && (
        <div className={cn("grid gap-3 border-t border-hairline pt-3 md:grid-cols-2", expanded ? "" : "hidden md:grid")}>
          <DateRange
            label="Fecha de creación"
            from={state.createdFrom}
            to={state.createdTo}
            onChange={({ from, to }) => onChange({ createdFrom: from, createdTo: to })}
          />
          <DateRange
            label="Última actividad"
            from={state.activityFrom}
            to={state.activityTo}
            onChange={({ from, to }) => onChange({ activityFrom: from, activityTo: to })}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {expanded ? "Ocultar filtros" : "Más filtros"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={expanded ? "" : "hidden md:inline-flex"}
          onClick={() => setAdvanced((value) => !value)}
          aria-expanded={advanced}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {advanced ? "Ocultar fechas" : "Filtrar por fechas"}
        </Button>
        {active > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            <X className="h-4 w-4" />
            Quitar filtros ({active})
          </Button>
        )}
      </div>
    </div>
  );
}
