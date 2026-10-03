"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCheck, ChevronDown, Eraser, Search } from "lucide-react";

import { Checkbox } from "@/components/ui/atomic/forms/checkbox";
import { Input } from "@/components/ui/atomic/forms/input";
import { StatusBadge } from "@/components/ui/atomic/data-display/status-badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/primitives/shadcn/collapsible";
import { PERMISSIONS } from "@/lib/constants/roles.constants";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import {
  permissionsToObject,
  objectToPermissions,
  type PermissionsObject,
} from "@/lib/permissions/permissions-encoding";
import { cn } from "@/lib/utils/utils";

type PermissionModule = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  /**
   * Acciones que admite el módulo y su etiqueta propia (p. ej. Finanzas: Crear = "Cobrar y
   * emitir"). Sin `actions` el módulo admite las cuatro con las etiquetas genéricas.
   */
  actions?: ReadonlyArray<{ action: number; label: string }>;
};

const ACTIONS: Array<{ label: string; action: PermissionAction }> = [
  { label: "Crear", action: PermissionAction.CREATE },
  { label: "Editar", action: PermissionAction.EDIT },
  { label: "Eliminar", action: PermissionAction.DELETE },
  { label: "Bloquear", action: PermissionAction.BLOCK },
];

/** Etiquetas en español para las categorías del catálogo. */
const CATEGORY_LABELS: Record<string, string> = {
  appointments: "Citas",
  patients: "Pacientes",
  clinical: "Clínico",
  doctors: "Usuarios",
  settings: "Configuración",
  reports: "Reportes",
  finance: "Finanzas",
};

const UNCATEGORIZED = "__otros__";

// Plantilla de columnas compartida por la cabecera y las filas (alineación exacta).
// Las columnas de acción usan un mínimo de 4.5rem para que "BLOQUEAR" (la
// etiqueta más ancha en mayúsculas) quepa en una sola línea sin partirse.
const GRID =
  "grid grid-cols-[minmax(11rem,1fr)_repeat(4,minmax(4.5rem,4.75rem))_minmax(6rem,7rem)] items-center gap-x-2";

function toggleActionValue(current: number, action: PermissionAction): number {
  const has = (current & action) === action;
  return has ? current & ~action : current | action;
}

function hasAnyPermission(value: number): boolean {
  return value > 0;
}

/** Máscara de las acciones que admite el módulo (ALL si no restringe). */
function moduleMask(mod: PermissionModule): number {
  if (!mod.actions?.length) return PermissionAction.ALL;
  return mod.actions.reduce((mask, { action }) => mask | action, 0);
}

function hasFullAccess(value: number, mask: number = PermissionAction.ALL): boolean {
  return value > 0 && (value & mask) === mask;
}

/** Etiqueta de la acción en ese módulo, o null si el módulo no la admite. */
function moduleActionLabel(mod: PermissionModule, action: PermissionAction): string | null {
  if (!mod.actions?.length) return actionLabel(action);
  return mod.actions.find((a) => a.action === action)?.label ?? null;
}

function actionLabel(action: PermissionAction): string {
  if (action === PermissionAction.CREATE) return "Crear";
  if (action === PermissionAction.EDIT) return "Editar";
  if (action === PermissionAction.DELETE) return "Eliminar";
  if (action === PermissionAction.BLOCK) return "Bloquear";
  return "";
}

function categoryLabel(category: string): string {
  if (category === UNCATEGORIZED) return "Otros";
  return CATEGORY_LABELS[category] ?? category;
}

/** Badge de nivel de acceso (sin acceso · limitado · acceso total). */
function LevelBadge({ value, mod }: { value: number; mod: PermissionModule }) {
  if (!hasAnyPermission(value)) {
    return <span className="text-xs text-subtle">—</span>;
  }

  const mask = moduleMask(mod);
  const allLabels = ACTIONS.map(({ action }) => moduleActionLabel(mod, action)).filter(
    (label): label is string => label !== null,
  );

  if (hasFullAccess(value, mask)) {
    return (
      <StatusBadge tone="success" title={allLabels.join(", ")}>
        Acceso total
      </StatusBadge>
    );
  }

  const actions = ACTIONS.filter(({ action }) => (value & action) === action)
    .map(({ action }) => moduleActionLabel(mod, action))
    .filter((label): label is string => label !== null);

  return (
    <StatusBadge
      tone="warning"
      title={actions.length ? actions.join(", ") : "Permisos limitados"}
    >
      Limitado
    </StatusBadge>
  );
}

export interface PermissionsSelectorProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
}

export function PermissionsSelector({
  value = [],
  onChange,
  disabled,
}: PermissionsSelectorProps) {
  const [query, setQuery] = useState("");
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const normalizedValue = useMemo(() => {
    if (!Array.isArray(value)) return [] as string[];
    return value.filter((p): p is string => typeof p === "string");
  }, [value]);

  const modules: PermissionModule[] = useMemo(
    () => Object.values(PERMISSIONS),
    [],
  );

  const knownModuleIds = useMemo(
    () => new Set(modules.map((m) => m.id)),
    [modules],
  );

  const permissionsObj = useMemo<PermissionsObject>(() => {
    const raw = permissionsToObject(normalizedValue);
    const next: PermissionsObject = {};
    for (const moduleId of knownModuleIds) {
      const v = raw[moduleId];
      if (typeof v === "number" && v > 0) next[moduleId] = v;
    }
    return next;
  }, [normalizedValue, knownModuleIds]);

  const emit = useCallback(
    (next: PermissionsObject) => {
      onChange?.(objectToPermissions(next));
    },
    [onChange],
  );

  const setModuleValue = useCallback(
    (moduleKey: string, nextValue: number) => {
      const next: PermissionsObject = { ...permissionsObj };
      if (nextValue > 0) next[moduleKey] = nextValue;
      else delete next[moduleKey];
      emit(next);
    },
    [permissionsObj, emit],
  );

  /** Acceso total (máscara de cada módulo) o ninguno para un grupo de módulos. */
  const setManyModulesValue = useCallback(
    (mods: PermissionModule[], enabled: boolean) => {
      const next: PermissionsObject = { ...permissionsObj };
      for (const mod of mods) {
        if (enabled) next[mod.id] = moduleMask(mod);
        else delete next[mod.id];
      }
      emit(next);
    },
    [permissionsObj, emit],
  );

  const handleToggleAction = useCallback(
    (moduleKey: string, action: PermissionAction) => {
      const current = permissionsObj[moduleKey] ?? 0;
      setModuleValue(moduleKey, toggleActionValue(current, action));
    },
    [permissionsObj, setModuleValue],
  );

  const handleSelectAll = useCallback(() => {
    const next: PermissionsObject = {};
    for (const mod of modules) next[mod.id] = moduleMask(mod);
    emit(next);
  }, [modules, emit]);

  const handleClearAll = useCallback(() => {
    emit({});
  }, [emit]);

  const summary = useMemo(() => {
    const values = Object.values(permissionsObj);
    return {
      modulesWithPermissions: values.filter((v) => v > 0).length,
      modulesWithFullAccess: modules.filter((m) =>
        hasFullAccess(permissionsObj[m.id] ?? 0, moduleMask(m)),
      ).length,
    };
  }, [permissionsObj, modules]);

  // Agrupar los módulos (filtrados por búsqueda) por categoría, preservando el
  // orden de aparición del catálogo.
  const normalizedQuery = query.trim().toLowerCase();

  const groups = useMemo(() => {
    const map = new Map<string, PermissionModule[]>();
    for (const mod of modules) {
      if (normalizedQuery) {
        const haystack = `${mod.name} ${mod.description ?? ""}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) continue;
      }
      const key = mod.category || UNCATEGORIZED;
      const list = map.get(key) ?? [];
      list.push(mod);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([key, mods]) => ({ key, modules: mods }));
  }, [modules, normalizedQuery]);

  const renderModuleRow = useCallback(
    (mod: PermissionModule) => {
      const current = permissionsObj[mod.id] ?? 0;
      const mask = moduleMask(mod);
      const checked = hasAnyPermission(current);
      const full = hasFullAccess(current, mask);

      return (
        <div
          key={mod.id}
          className={cn(GRID, "px-4 py-2.5 transition-colors hover:bg-hover/50")}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Checkbox
              checked={full ? true : checked ? "indeterminate" : false}
              onCheckedChange={(c) =>
                setModuleValue(mod.id, c ? mask : 0)
              }
              disabled={disabled}
              aria-label={`Acceso total a ${mod.name}`}
            />
            <div className="min-w-0">
              <div
                className={cn(
                  "truncate text-sm",
                  checked ? "font-medium text-ink" : "text-subtle",
                )}
              >
                {mod.name}
              </div>
              {mod.description ? (
                <div className="truncate text-xs text-subtle">
                  {mod.description}
                </div>
              ) : null}
            </div>
          </div>

          {ACTIONS.map(({ action }) => {
            const label = moduleActionLabel(mod, action);
            if (label === null) {
              return (
                <div key={`${mod.id}-${action}`} className="flex justify-center">
                  <span className="text-xs text-subtle" aria-hidden>—</span>
                </div>
              );
            }
            const customLabel = label !== actionLabel(action);
            return (
              <div
                key={`${mod.id}-${action}`}
                className="flex flex-col items-center gap-0.5"
              >
                <Checkbox
                  checked={(current & action) === action}
                  onCheckedChange={() => handleToggleAction(mod.id, action)}
                  disabled={disabled}
                  aria-label={`${label} en ${mod.name}`}
                />
                {customLabel && (
                  <span className="text-center text-[0.65rem] leading-tight text-subtle">
                    {label}
                  </span>
                )}
              </div>
            );
          })}

          <div className="flex justify-end pr-1">
            <LevelBadge value={current} mod={mod} />
          </div>
        </div>
      );
    },
    [permissionsObj, disabled, handleToggleAction, setModuleValue],
  );

  return (
    <div className="space-y-3">
      {/* Toolbar: buscador + resumen + acciones masivas (botones Bento-nativos) */}
      <div className="sticky top-0 z-10 rounded-xl border border-hairline bg-surface/90 px-3 py-2.5 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Izquierda: buscador + resumen */}
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar módulo…"
                className="h-9 pl-9"
                aria-label="Buscar módulo"
              />
            </div>
            <div className="flex items-center gap-3 text-xs whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5 text-subtle">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                <strong className="font-semibold tabular-nums text-ink">
                  {summary.modulesWithPermissions}
                </strong>
                con permisos
              </span>
              <span className="h-3 w-px bg-hairline" aria-hidden />
              <span className="inline-flex items-center gap-1.5 text-subtle">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  aria-hidden
                />
                <strong className="font-semibold tabular-nums text-ink">
                  {summary.modulesWithFullAccess}
                </strong>
                acceso total
              </span>
            </div>
          </div>

          {/* Derecha: acciones masivas */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearAll}
              disabled={disabled}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Eraser className="h-4 w-4 text-subtle" />
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={disabled}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              Seleccionar todo
            </button>
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bento px-4 py-10 text-center text-sm text-subtle">
          No se encontraron módulos para «{query.trim()}».
        </div>
      ) : (
        groups.map(({ key, modules: categoryModules }) => {
          const moduleIds = categoryModules.map((m) => m.id);
          const values = moduleIds.map((id) => permissionsObj[id] ?? 0);
          const all =
            values.length > 0 &&
            categoryModules.every((m) =>
              hasFullAccess(permissionsObj[m.id] ?? 0, moduleMask(m)),
            );
          const some = values.some((v) => hasAnyPermission(v));
          const withPerms = values.filter((v) => hasAnyPermission(v)).length;
          // Al buscar, forzar la categoría abierta para mostrar coincidencias.
          const isOpen = normalizedQuery ? true : (openMap[key] ?? true);

          return (
            <div key={key} className="bento overflow-hidden p-0">
              <Collapsible
                open={isOpen}
                onOpenChange={(o) =>
                  setOpenMap((prev) => ({ ...prev, [key]: o }))
                }
              >
                <div className="flex items-center gap-3 border-b border-hairline bg-elevated/50 px-4 py-3">
                  <Checkbox
                    checked={all ? true : some ? "indeterminate" : false}
                    onCheckedChange={(c) =>
                      setManyModulesValue(categoryModules, !!c)
                    }
                    disabled={disabled}
                    aria-label={`Acceso total a ${categoryLabel(key)}`}
                  />
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="group flex flex-1 items-center justify-between gap-2 text-left"
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-ink">
                          {categoryLabel(key)}
                        </span>
                        <span className="text-xs text-subtle tabular-nums">
                          {withPerms}/{categoryModules.length} módulos
                        </span>
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-subtle transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent>
                  <div className="overflow-x-auto">
                    <div className="min-w-[640px]">
                      <div
                        className={cn(
                          GRID,
                          "border-b border-hairline bg-elevated/30 px-4 py-2",
                        )}
                      >
                        <span className="whitespace-nowrap text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
                          Módulo
                        </span>
                        {ACTIONS.map(({ label, action }) => (
                          <span
                            key={action}
                            className="whitespace-nowrap text-center text-[0.7rem] font-medium uppercase tracking-wider text-subtle"
                          >
                            {label}
                          </span>
                        ))}
                        <span className="whitespace-nowrap text-right text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
                          Nivel
                        </span>
                      </div>
                      <div className="divide-y divide-hairline">
                        {categoryModules.map((m) => renderModuleRow(m))}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        })
      )}
    </div>
  );
}
