"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCheck, ChevronDown, Eraser, Search } from "lucide-react";

import { Checkbox } from "@/components/ui/atomic/forms/checkbox";
import { Input } from "@/components/ui/atomic/forms/input";
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
  doctors: "Doctores",
  settings: "Configuración",
  reports: "Reportes",
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

function hasFullAccess(value: number): boolean {
  return value === PermissionAction.ALL;
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
function LevelBadge({ value }: { value: number }) {
  if (!hasAnyPermission(value)) {
    return <span className="text-xs text-subtle">—</span>;
  }

  if (hasFullAccess(value)) {
    return (
      <span
        title="Crear, Editar, Eliminar y Bloquear"
        className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-400/25 dark:text-emerald-300"
      >
        Acceso total
      </span>
    );
  }

  const actions = ACTIONS.filter(
    ({ action }) => (value & action) === action,
  ).map(({ label }) => label);

  return (
    <span
      title={actions.length ? actions.join(", ") : "Permisos limitados"}
      className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 ring-1 ring-amber-400/25 dark:text-amber-300"
    >
      Limitado
    </span>
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

  const setManyModulesValue = useCallback(
    (moduleKeys: string[], nextValue: number) => {
      const next: PermissionsObject = { ...permissionsObj };
      for (const key of moduleKeys) {
        if (nextValue > 0) next[key] = nextValue;
        else delete next[key];
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
    for (const mod of modules) next[mod.id] = PermissionAction.ALL;
    emit(next);
  }, [modules, emit]);

  const handleClearAll = useCallback(() => {
    emit({});
  }, [emit]);

  const summary = useMemo(() => {
    const values = Object.values(permissionsObj);
    return {
      modulesWithPermissions: values.filter((v) => v > 0).length,
      modulesWithFullAccess: values.filter((v) => v === PermissionAction.ALL)
        .length,
    };
  }, [permissionsObj]);

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
      const checked = hasAnyPermission(current);
      const full = hasFullAccess(current);

      return (
        <div
          key={mod.id}
          className={cn(GRID, "px-4 py-2.5 transition-colors hover:bg-hover/50")}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Checkbox
              checked={full ? true : checked ? "indeterminate" : false}
              onCheckedChange={(c) =>
                setModuleValue(mod.id, c ? PermissionAction.ALL : 0)
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

          {ACTIONS.map(({ action }) => (
            <div key={`${mod.id}-${action}`} className="flex justify-center">
              <Checkbox
                checked={(current & action) === action}
                onCheckedChange={() => handleToggleAction(mod.id, action)}
                disabled={disabled}
                aria-label={`${actionLabel(action)} en ${mod.name}`}
              />
            </div>
          ))}

          <div className="flex justify-end pr-1">
            <LevelBadge value={current} />
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
          const all = values.length > 0 && values.every((v) => hasFullAccess(v));
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
                      setManyModulesValue(moduleIds, c ? PermissionAction.ALL : 0)
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
