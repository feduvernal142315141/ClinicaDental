"use client";

import { useCallback, useMemo } from "react";
import { Button, Checkbox, Tooltip, Tag } from "antd";
import { PERMISSIONS } from "@/lib/constants/roles.constants";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import {
  getModuleActions,
  permissionsToObject,
  objectToPermissions,
  type PermissionsObject,
} from "@/lib/permissions/permissions-encoding";

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

function toggleActionValue(current: number, action: PermissionAction): number {
  const has = (current & action) === action;
  return has ? current & ~action : current | action;
}

function computeCategories(modules: PermissionModule[]): string[] {
  return Array.from(
    new Set(modules.map((m) => m.category).filter(Boolean) as string[]),
  );
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
  const normalizedValue = useMemo(() => {
    if (!Array.isArray(value)) return [] as string[];
    return value.filter((p): p is string => typeof p === "string");
  }, [value]);

  const modules: PermissionModule[] = useMemo(() => {
    return Object.values(PERMISSIONS);
  }, []);

  const knownModuleIds = useMemo(
    () => new Set(modules.map((m) => m.id)),
    [modules],
  );

  const categories = useMemo(() => computeCategories(modules), [modules]);

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
    for (const mod of modules) {
      next[mod.id] = PermissionAction.ALL;
    }
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

  const getAccessLevelTag = useCallback(
    (moduleKey: string) => {
      const valueForModule = permissionsObj[moduleKey] ?? 0;
      if (!hasAnyPermission(valueForModule)) return null;

      if (hasFullAccess(valueForModule)) {
        return (
          <Tooltip title="Crear, Editar, Eliminar y Bloquear">
            <Tag color="success">Acceso total</Tag>
          </Tooltip>
        );
      }

      const actions = getModuleActions(permissionsObj, moduleKey)
        .map(actionLabel)
        .filter(Boolean);

      return (
        <Tooltip
          title={actions.length ? actions.join(", ") : "Permisos limitados"}
        >
          <Tag color="processing">Limitado</Tag>
        </Tooltip>
      );
    },
    [permissionsObj],
  );

  const renderModuleRow = useCallback(
    (mod: PermissionModule) => {
      const current = permissionsObj[mod.id] ?? 0;
      const checked = hasAnyPermission(current);
      const full = hasFullAccess(current);

      return (
        <tr
          key={mod.id}
          className={
            "border-b border-border/50 hover:bg-muted/30 transition-colors"
          }
        >
          <td className="px-4 py-3">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={checked}
                indeterminate={checked && !full}
                onChange={(e) =>
                  setModuleValue(
                    mod.id,
                    e.target.checked ? PermissionAction.ALL : 0,
                  )
                }
                disabled={disabled}
              />
              <div>
                <div
                  className={checked ? "font-medium" : "text-muted-foreground"}
                >
                  {mod.name}
                </div>
                {mod.description ? (
                  <div className="text-xs text-muted-foreground">
                    {mod.description}
                  </div>
                ) : null}
              </div>
            </div>
          </td>

          {ACTIONS.map(({ action }) => (
            <td key={`${mod.id}-${action}`} className="px-3 py-3 text-center">
              <Checkbox
                checked={(current & action) === action}
                onChange={() => handleToggleAction(mod.id, action)}
                disabled={disabled}
              />
            </td>
          ))}

          <td className="px-4 py-3 text-right">{getAccessLevelTag(mod.id)}</td>
        </tr>
      );
    },
    [
      permissionsObj,
      disabled,
      handleToggleAction,
      setModuleValue,
      getAccessLevelTag,
    ],
  );

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {summary.modulesWithPermissions}
            </span>{" "}
            módulos con permisos ·{" "}
            <span className="font-medium text-foreground">
              {summary.modulesWithFullAccess}
            </span>{" "}
            con acceso total
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleClearAll} disabled={disabled}>
              Limpiar
            </Button>
            <Button
              type="primary"
              onClick={handleSelectAll}
              disabled={disabled}
            >
              Seleccionar todo
            </Button>
          </div>
        </div>
      </div>

      {categories.map((category) => {
        const categoryModules = modules.filter((m) => m.category === category);
        const moduleIds = categoryModules.map((m) => m.id);
        const values = moduleIds.map((id) => permissionsObj[id] ?? 0);
        const all = values.length > 0 && values.every((v) => hasFullAccess(v));
        const some = values.some((v) => hasAnyPermission(v));

        return (
          <div
            key={category}
            className="rounded-lg border border-border bg-background overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={all}
                  indeterminate={some && !all}
                  onChange={(e) =>
                    setManyModulesValue(
                      moduleIds,
                      e.target.checked ? PermissionAction.ALL : 0,
                    )
                  }
                  disabled={disabled}
                />
                <div>
                  <div className="font-medium capitalize">{category}</div>
                  <div className="text-xs text-muted-foreground">
                    {categoryModules.length} módulos
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Módulo
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Crear
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Editar
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Eliminar
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Bloquear
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Nivel
                    </th>
                  </tr>
                </thead>
                <tbody>{categoryModules.map((m) => renderModuleRow(m))}</tbody>
              </table>
            </div>
          </div>
        );
      })}

      {modules.some((m) => !m.category) ? (
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="font-medium">Otros</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Módulo
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Crear
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Editar
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Eliminar
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Bloquear
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Nivel
                  </th>
                </tr>
              </thead>
              <tbody>
                {modules
                  .filter((m) => !m.category)
                  .map((m) => renderModuleRow(m))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
