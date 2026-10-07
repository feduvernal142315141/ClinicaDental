import {
  LEAD_SOURCES,
  LEAD_STAGES,
  LEAD_TEMPERATURES,
  type LeadFilters,
  type LeadSource,
  type LeadStage,
  type LeadTemperature,
} from "@/lib/entity/leads";

/**
 * Filtros de "Adquisición de pacientes" tal como viven en la URL (compartidos por tablero y
 * lista) y su traducción a los parámetros de `GET /leads` y `GET /leads/pipeline`.
 */

export type LeadView = "board" | "list";

/** Valor de "sin clasificar" / "sin asignar" en los selectores. */
export const LEAD_FILTER_NONE = "none";

export interface LeadFilterState {
  q: string;
  /** Solo aplica a la lista: el tablero ya separa por etapa. */
  stage: LeadStage | "";
  temperature: LeadTemperature | typeof LEAD_FILTER_NONE | "";
  source: LeadSource | "";
  assignee: string;
  service: string;
  /** Fechas locales `YYYY-MM-DD`; "hasta" es inclusivo en la interfaz. */
  createdFrom: string;
  createdTo: string;
  activityFrom: string;
  activityTo: string;
  overdue: boolean;
  match: boolean;
}

export const EMPTY_LEAD_FILTERS: LeadFilterState = {
  q: "",
  stage: "",
  temperature: "",
  source: "",
  assignee: "",
  service: "",
  createdFrom: "",
  createdTo: "",
  activityFrom: "",
  activityTo: "",
  overdue: false,
  match: false,
};

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

type ParamReader = { get(name: string): string | null };

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | "" {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

function localDate(value: string | null): string {
  return value && LOCAL_DATE.test(value) ? value : "";
}

export function parseLeadView(params: ParamReader): LeadView {
  return params.get("view") === "list" ? "list" : "board";
}

export function parseLeadPage(params: ParamReader): number {
  const page = Number(params.get("page"));
  return Number.isInteger(page) && page > 0 ? page : 0;
}

/** Lee los filtros de la URL descartando cualquier valor que no sea del contrato. */
export function parseLeadFilters(params: ParamReader): LeadFilterState {
  const temperature = params.get("temperature");
  return {
    q: (params.get("q") ?? "").slice(0, 100),
    stage: oneOf(params.get("stage"), LEAD_STAGES),
    temperature: temperature === LEAD_FILTER_NONE ? LEAD_FILTER_NONE : oneOf(temperature, LEAD_TEMPERATURES),
    source: oneOf(params.get("source"), LEAD_SOURCES),
    assignee: params.get("assignee") ?? "",
    service: params.get("service") ?? "",
    createdFrom: localDate(params.get("createdFrom")),
    createdTo: localDate(params.get("createdTo")),
    activityFrom: localDate(params.get("activityFrom")),
    activityTo: localDate(params.get("activityTo")),
    overdue: params.get("overdue") === "1",
    match: params.get("match") === "1",
  };
}

/** Serializa a query string solo lo que difiere del estado vacío. */
export function serializeLeadFilters(state: LeadFilterState, view: LeadView, page = 0): string {
  const params = new URLSearchParams();
  if (view === "list") params.set("view", "list");
  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.stage && view === "list") params.set("stage", state.stage);
  if (state.temperature) params.set("temperature", state.temperature);
  if (state.source) params.set("source", state.source);
  if (state.assignee) params.set("assignee", state.assignee);
  if (state.service) params.set("service", state.service);
  if (state.createdFrom) params.set("createdFrom", state.createdFrom);
  if (state.createdTo) params.set("createdTo", state.createdTo);
  if (state.activityFrom) params.set("activityFrom", state.activityFrom);
  if (state.activityTo) params.set("activityTo", state.activityTo);
  if (state.overdue) params.set("overdue", "1");
  if (state.match) params.set("match", "1");
  if (view === "list" && page > 0) params.set("page", String(page));
  return params.toString();
}

/** Inicio del día local como instante ISO-8601 UTC (el backend rechaza `YYYY-MM-DD` con 400). */
export function localDayStartIso(date: string, addDays = 0): string | undefined {
  if (!LOCAL_DATE.test(date)) return undefined;
  const [year, month, day] = date.split("-").map(Number);
  const instant = new Date(year, month - 1, day + addDays, 0, 0, 0, 0);
  return Number.isNaN(instant.getTime()) ? undefined : instant.toISOString();
}

/**
 * Traduce los filtros de la interfaz al contrato. Los "hasta" del backend son exclusivos:
 * se envía el inicio del día siguiente para incluir el día elegido completo.
 */
export function toLeadApiFilters(state: LeadFilterState, options: { includeStage?: boolean } = {}): LeadFilters {
  const filters: LeadFilters = {};
  const q = state.q.trim();
  if (q) filters.q = q;
  if (options.includeStage && state.stage) filters.stage = state.stage;
  if (state.temperature === LEAD_FILTER_NONE) filters.unclassified = true;
  else if (state.temperature) filters.temperature = state.temperature;
  if (state.source) filters.source = state.source;
  if (state.assignee === LEAD_FILTER_NONE) filters.unassigned = true;
  else if (state.assignee) filters.assignedToUserId = state.assignee;
  if (state.service) filters.interestServiceId = state.service;
  const createdFrom = localDayStartIso(state.createdFrom);
  const createdTo = localDayStartIso(state.createdTo, 1);
  const activityFrom = localDayStartIso(state.activityFrom);
  const activityTo = localDayStartIso(state.activityTo, 1);
  if (createdFrom) filters.createdFrom = createdFrom;
  if (createdTo) filters.createdTo = createdTo;
  if (activityFrom) filters.lastActivityFrom = activityFrom;
  if (activityTo) filters.lastActivityTo = activityTo;
  if (state.overdue) filters.overdueFollowUp = true;
  if (state.match) filters.pendingPatientMatch = true;
  return filters;
}

export function countActiveLeadFilters(state: LeadFilterState, view: LeadView): number {
  return [
    state.q.trim(),
    view === "list" ? state.stage : "",
    state.temperature,
    state.source,
    state.assignee,
    state.service,
    state.createdFrom || state.createdTo,
    state.activityFrom || state.activityTo,
    state.overdue,
    state.match,
  ].filter(Boolean).length;
}
